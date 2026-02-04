import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { erpIntegrations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { erpService } from "@/lib/integrations/erp/erpService"

export const dynamic = "force-dynamic"

// Esta rota sera chamada pelo Vercel Cron ou cron job externo
// Configurar no vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/sync-erp",
//     "schedule": "0 */6 * * *"
//   }]
// }

export async function GET(request: Request) {
  try {
    // Verificar autorizacao (Vercel Cron envia um header especial)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Cron: Iniciando sincronizacao automatica de ERPs")

    // Buscar todas as integracoes ativas
    const integrations = await db
      .select()
      .from(erpIntegrations)
      .where(eq(erpIntegrations.isActive, true))

    if (!integrations || integrations.length === 0) {
      console.log("[v0] Cron: Nenhuma integracao ativa encontrada")
      return NextResponse.json({ message: "No active integrations" }, { status: 200 })
    }

    console.log(`[v0] Cron: ${integrations.length} integracoes ativas encontradas`)

    const results = []

    // Processar cada integracao
    for (const integration of integrations) {
      try {
        // Verificar se e hora de sincronizar baseado na frequencia
        const lastSync = integration.lastSyncAt ? new Date(integration.lastSyncAt) : null
        const now = new Date()

        let shouldSync = false

        if (!lastSync) {
          shouldSync = true
        } else {
          const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
          const config = integration.config as any

          switch (config?.sync_frequency) {
            case "hourly":
              shouldSync = hoursSinceLastSync >= 1
              break
            case "every_6_hours":
              shouldSync = hoursSinceLastSync >= 6
              break
            case "daily":
              shouldSync = hoursSinceLastSync >= 24
              break
            case "weekly":
              shouldSync = hoursSinceLastSync >= 168
              break
            default:
              shouldSync = false
          }
        }

        if (!shouldSync) {
          console.log(`[v0] Cron: Pulando ${integration.name} - ainda nao e hora de sincronizar`)
          continue
        }

        console.log(`[v0] Cron: Sincronizando ${integration.name}...`)

        // Sincronizar clientes
        const customersResult = await erpService.syncCustomers(integration.id)
        console.log(
          `[v0] Cron: Clientes sincronizados - ${customersResult.records_success} sucesso, ${customersResult.records_failed} falhas`,
        )

        // Sincronizar dividas
        const debtsResult = await erpService.syncDebts(integration.id)
        console.log(
          `[v0] Cron: Dividas sincronizadas - ${debtsResult.records_success} sucesso, ${debtsResult.records_failed} falhas`,
        )

        // Enviar resultados de volta ao ERP
        const resultsSync = await erpService.syncResultsToERP(integration.id)
        console.log(
          `[v0] Cron: Resultados enviados - ${resultsSync.records_success} sucesso, ${resultsSync.records_failed} falhas`,
        )

        results.push({
          integration_id: integration.id,
          erp_name: integration.name,
          customers: customersResult,
          debts: debtsResult,
          results: resultsSync,
        })
      } catch (error) {
        console.error(`[v0] Cron: Erro ao processar ${integration.name}:`, error)
        results.push({
          integration_id: integration.id,
          erp_name: integration.name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log("[v0] Cron: Sincronizacao automatica concluida")

    return NextResponse.json({
      message: "Sync completed",
      processed: integrations.length,
      results,
    })
  } catch (error) {
    console.error("[v0] Cron: Erro geral:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
