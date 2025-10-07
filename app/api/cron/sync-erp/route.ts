import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { erpService } from "@/lib/integrations/erp/erpService"

// Esta rota será chamada pelo Vercel Cron ou Supabase Edge Functions
// Configurar no vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/sync-erp",
//     "schedule": "0 */6 * * *"
//   }]
// }

export async function GET(request: Request) {
  try {
    // Verificar autorização (Vercel Cron envia um header especial)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Cron: Iniciando sincronização automática de ERPs")

    const supabase = await createClient()

    // Buscar todas as integrações ativas
    const { data: integrations, error } = await supabase.from("erp_integrations").select("*").eq("is_active", true)

    if (error) {
      console.error("[v0] Cron: Erro ao buscar integrações:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!integrations || integrations.length === 0) {
      console.log("[v0] Cron: Nenhuma integração ativa encontrada")
      return NextResponse.json({ message: "No active integrations" }, { status: 200 })
    }

    console.log(`[v0] Cron: ${integrations.length} integrações ativas encontradas`)

    const results = []

    // Processar cada integração
    for (const integration of integrations) {
      try {
        // Verificar se é hora de sincronizar baseado na frequência
        const lastSync = integration.last_sync_at ? new Date(integration.last_sync_at) : null
        const now = new Date()

        let shouldSync = false

        if (!lastSync) {
          shouldSync = true
        } else {
          const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

          switch (integration.sync_frequency) {
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
          console.log(`[v0] Cron: Pulando ${integration.erp_name} - ainda não é hora de sincronizar`)
          continue
        }

        console.log(`[v0] Cron: Sincronizando ${integration.erp_name}...`)

        // Sincronizar clientes
        const customersResult = await erpService.syncCustomers(integration.id)
        console.log(
          `[v0] Cron: Clientes sincronizados - ${customersResult.records_success} sucesso, ${customersResult.records_failed} falhas`,
        )

        // Sincronizar dívidas
        const debtsResult = await erpService.syncDebts(integration.id)
        console.log(
          `[v0] Cron: Dívidas sincronizadas - ${debtsResult.records_success} sucesso, ${debtsResult.records_failed} falhas`,
        )

        // Enviar resultados de volta ao ERP
        const resultsSync = await erpService.syncResultsToERP(integration.id)
        console.log(
          `[v0] Cron: Resultados enviados - ${resultsSync.records_success} sucesso, ${resultsSync.records_failed} falhas`,
        )

        results.push({
          integration_id: integration.id,
          erp_name: integration.erp_name,
          customers: customersResult,
          debts: debtsResult,
          results: resultsSync,
        })
      } catch (error) {
        console.error(`[v0] Cron: Erro ao processar ${integration.erp_name}:`, error)
        results.push({
          integration_id: integration.id,
          erp_name: integration.erp_name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log("[v0] Cron: Sincronização automática concluída")

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
