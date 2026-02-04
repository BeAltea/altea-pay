"use server"

import { db } from "@/lib/db"
import { erpIntegrations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { erpService } from "@/lib/integrations/erp/erpService"
import { revalidatePath } from "next/cache"

// Cria nova integração ERP
export async function createERPIntegration(formData: FormData) {
  try {
    const data = {
      companyId: formData.get("company_id") as string,
      erpType: formData.get("erp_type") as string,
      name: formData.get("erp_name") as string,
      config: {
        base_url: formData.get("base_url") as string,
        auth_token: formData.get("auth_token") as string,
        auth_type: formData.get("auth_type") as string,
        customers_endpoint: formData.get("customers_endpoint") as string,
        debts_endpoint: formData.get("debts_endpoint") as string,
        sync_endpoint: formData.get("sync_endpoint") as string,
        sync_frequency: formData.get("sync_frequency") as string,
        ...(formData.get("config") ? JSON.parse(formData.get("config") as string) : {}),
      },
      isActive: formData.get("is_active") === "true",
    }

    const [integration] = await db.insert(erpIntegrations).values(data).returning()

    revalidatePath(`/super-admin/companies/${data.companyId}/erp-integration`)
    return { success: true, data: integration }
  } catch (error) {
    console.error("[v0] Error creating integration:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Atualiza integração ERP
export async function updateERPIntegration(integrationId: string, formData: FormData) {
  try {
    const data = {
      erpType: formData.get("erp_type") as string,
      name: formData.get("erp_name") as string,
      config: {
        base_url: formData.get("base_url") as string,
        auth_token: formData.get("auth_token") as string,
        auth_type: formData.get("auth_type") as string,
        customers_endpoint: formData.get("customers_endpoint") as string,
        debts_endpoint: formData.get("debts_endpoint") as string,
        sync_endpoint: formData.get("sync_endpoint") as string,
        sync_frequency: formData.get("sync_frequency") as string,
        ...(formData.get("config") ? JSON.parse(formData.get("config") as string) : {}),
      },
      isActive: formData.get("is_active") === "true",
      updatedAt: new Date(),
    }

    await db.update(erpIntegrations).set(data).where(eq(erpIntegrations.id, integrationId))

    const [integration] = await db
      .select({ companyId: erpIntegrations.companyId })
      .from(erpIntegrations)
      .where(eq(erpIntegrations.id, integrationId))
      .limit(1)

    if (integration) {
      revalidatePath(`/super-admin/companies/${integration.companyId}/erp-integration`)
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating integration:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Deleta integração ERP
export async function deleteERPIntegration(integrationId: string, companyId: string) {
  try {
    await db.delete(erpIntegrations).where(eq(erpIntegrations.id, integrationId))

    revalidatePath(`/super-admin/companies/${companyId}/erp-integration`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting integration:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Testa conexão com ERP
export async function testERPConnection(integrationId: string) {
  try {
    console.log("[v0] Testing ERP connection:", integrationId)

    const isConnected = await erpService.testConnection(integrationId)

    return {
      success: isConnected,
      message: isConnected ? "Conexão estabelecida com sucesso!" : "Falha ao conectar com o ERP",
    }
  } catch (error) {
    console.error("[v0] Error testing connection:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao testar conexão",
    }
  }
}

// Sincroniza clientes do ERP (GET)
export async function syncCustomersFromERP(integrationId: string, companyId: string) {
  try {
    console.log("[v0] Syncing customers from ERP:", integrationId)

    const result = await erpService.syncCustomers(integrationId)

    revalidatePath(`/super-admin/companies/${companyId}/erp-integration`)
    revalidatePath(`/super-admin/companies/${companyId}/customers`)

    return {
      success: result.success,
      message: result.success
        ? `${result.records_success} clientes sincronizados com sucesso!`
        : `Erro ao sincronizar clientes. ${result.records_failed} falhas.`,
      data: result,
    }
  } catch (error) {
    console.error("[v0] Error syncing customers:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao sincronizar clientes",
    }
  }
}

// Sincroniza dívidas do ERP (GET)
export async function syncDebtsFromERP(integrationId: string, companyId: string) {
  try {
    console.log("[v0] Syncing debts from ERP:", integrationId)

    const result = await erpService.syncDebts(integrationId)

    revalidatePath(`/super-admin/companies/${companyId}/erp-integration`)
    revalidatePath(`/dashboard/debts`)

    return {
      success: result.success,
      message: result.success
        ? `${result.records_success} dívidas sincronizadas com sucesso!`
        : `Erro ao sincronizar dívidas. ${result.records_failed} falhas.`,
      data: result,
    }
  } catch (error) {
    console.error("[v0] Error syncing debts:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao sincronizar dívidas",
    }
  }
}

// Envia resultados processados de volta para o ERP (POST)
export async function syncResultsToERP(integrationId: string, companyId: string) {
  try {
    console.log("[v0] Syncing results to ERP:", integrationId)

    const result = await erpService.syncResultsToERP(integrationId)

    revalidatePath(`/super-admin/companies/${companyId}/erp-integration`)

    return {
      success: result.success,
      message: result.success
        ? `${result.records_success} registros enviados com sucesso!`
        : `Erro ao enviar resultados. ${result.records_failed} falhas.`,
      data: result,
    }
  } catch (error) {
    console.error("[v0] Error syncing results:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao sincronizar resultados",
    }
  }
}

// Ativa/desativa integração
export async function toggleERPIntegration(integrationId: string, companyId: string, isActive: boolean) {
  try {
    await db
      .update(erpIntegrations)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(erpIntegrations.id, integrationId))

    revalidatePath(`/super-admin/companies/${companyId}/erp-integration`)
    return { success: true, message: `Integração ${isActive ? "ativada" : "desativada"} com sucesso` }
  } catch (error) {
    console.error("[v0] Error toggling integration:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
