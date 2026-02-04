// Servico generico para integracao com ERPs

import { db } from "@/lib/db"
import { eq, and, gte } from "drizzle-orm"
import { erpIntegrations, erpIntegrationLogs, customers, debts, payments, creditProfiles } from "@/lib/db/schema"
import type { ERPConnectionConfig, SyncResult, IntegrationLog } from "./types"
import { getConnector } from "./connectors"
import { normalizeCustomerData, normalizeDebtData } from "@/lib/utils/normalizeData"
import { analyzeCreditFree, analyzeCreditAssertiva } from "@/services/creditAnalysisService"

export class ERPService {
  // Testa conexao com o ERP
  async testConnection(integrationId: string): Promise<boolean> {
    const startTime = Date.now()

    try {
      console.log("Testing ERP connection:", integrationId)

      const integrationRecords = await db
        .select()
        .from(erpIntegrations)
        .where(eq(erpIntegrations.id, integrationId))
        .limit(1)

      const integration = integrationRecords[0]

      if (!integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erpType)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erpType}`)
      }

      // Build config from integration data - using config and credentials jsonb fields
      const integrationConfig = integration.config as any || {}
      const integrationCredentials = integration.credentials as any || {}

      const config: ERPConnectionConfig = {
        base_url: integrationConfig.base_url || "",
        auth_token: integrationCredentials.auth_token || "",
        auth_type: integrationConfig.auth_type || "bearer",
        customers_endpoint: integrationConfig.customers_endpoint || "",
        debts_endpoint: integrationConfig.debts_endpoint || "",
        sync_endpoint: integrationConfig.sync_endpoint || "",
        config: integrationConfig,
      }

      const isConnected = await connector.testConnection(config)

      await this.createLog({
        integrationId: integrationId,
        companyId: integration.companyId,
        action: "test_connection",
        status: isConnected ? "success" : "error",
        details: {
          records_processed: 0,
          records_success: 0,
          records_failed: 0,
          duration_ms: Date.now() - startTime,
        },
      })

      return isConnected
    } catch (error) {
      console.error("Error testing connection:", error)

      await this.createLog({
        integrationId: integrationId,
        companyId: "",
        action: "test_connection",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          records_processed: 0,
          records_success: 0,
          records_failed: 0,
          duration_ms: Date.now() - startTime,
        },
      })

      return false
    }
  }

  // Sincroniza clientes do ERP para o banco
  async syncCustomers(integrationId: string): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ record: any; error: string }> = []

    try {
      console.log("Syncing customers from ERP:", integrationId)

      const integrationRecords = await db
        .select()
        .from(erpIntegrations)
        .where(eq(erpIntegrations.id, integrationId))
        .limit(1)

      const integration = integrationRecords[0]

      if (!integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erpType)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erpType}`)
      }

      // Build config from integration data
      const integrationConfig = integration.config as any || {}
      const integrationCredentials = integration.credentials as any || {}

      const config: ERPConnectionConfig = {
        base_url: integrationConfig.base_url || "",
        auth_token: integrationCredentials.auth_token || "",
        auth_type: integrationConfig.auth_type || "bearer",
        customers_endpoint: integrationConfig.customers_endpoint || "",
        debts_endpoint: integrationConfig.debts_endpoint || "",
        sync_endpoint: integrationConfig.sync_endpoint || "",
        config: integrationConfig,
      }

      // Busca clientes do ERP
      const rawCustomers = await connector.fetchCustomers(config)
      console.log("Fetched customers from ERP:", rawCustomers.length)

      let successCount = 0
      let failedCount = 0

      // Processa cada cliente
      for (const rawCustomer of rawCustomers) {
        try {
          const normalized = normalizeCustomerData(rawCustomer, integration.erpType, integration.companyId)

          if (!normalized) {
            failedCount++
            errors.push({ record: rawCustomer, error: "Failed to normalize customer data" })
            continue
          }

          // Verifica se cliente ja existe
          const existingRecords = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.externalId, normalized.external_id),
                eq(customers.companyId, normalized.company_id)
              )
            )
            .limit(1)

          const existing = existingRecords[0]

          if (existing) {
            // Atualiza cliente existente
            try {
              await db
                .update(customers)
                .set({
                  name: normalized.name,
                  document: normalized.cpfCnpj,
                  email: normalized.email,
                  phone: normalized.phone,
                  address: normalized.address,
                  city: normalized.city,
                  state: normalized.state,
                  zipCode: normalized.zip_code,
                  sourceSystem: normalized.source_system,
                  updatedAt: new Date(),
                })
                .where(eq(customers.id, existing.id))

              successCount++
            } catch (updateError: any) {
              failedCount++
              errors.push({ record: rawCustomer, error: updateError.message })
            }
          } else {
            // Cria novo cliente
            try {
              await db.insert(customers).values({
                externalId: normalized.external_id,
                name: normalized.name,
                document: normalized.cpfCnpj,
                documentType: normalized.cpfCnpj.length === 11 ? "CPF" : "CNPJ",
                email: normalized.email,
                phone: normalized.phone,
                address: normalized.address,
                city: normalized.city,
                state: normalized.state,
                zipCode: normalized.zip_code,
                sourceSystem: normalized.source_system,
                companyId: normalized.company_id,
              })

              successCount++
            } catch (insertError: any) {
              failedCount++
              errors.push({ record: rawCustomer, error: insertError.message })
            }
          }
        } catch (error) {
          failedCount++
          errors.push({
            record: rawCustomer,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      const result: SyncResult = {
        success: failedCount === 0,
        records_processed: rawCustomers.length,
        records_success: successCount,
        records_failed: failedCount,
        errors,
        duration_ms: Date.now() - startTime,
      }

      // Atualiza ultima sincronizacao
      await db
        .update(erpIntegrations)
        .set({ lastSyncAt: new Date() })
        .where(eq(erpIntegrations.id, integrationId))

      // Cria log
      await this.createLog({
        integrationId: integrationId,
        companyId: integration.companyId,
        action: "sync_customers",
        status: result.success ? "success" : failedCount < rawCustomers.length ? "warning" : "error",
        error: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        details: {
          records_processed: result.records_processed,
          records_success: result.records_success,
          records_failed: result.records_failed,
          duration_ms: result.duration_ms,
        },
      })

      return result
    } catch (error) {
      console.error("Error syncing customers:", error)

      const result: SyncResult = {
        success: false,
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        errors: [{ record: {}, error: error instanceof Error ? error.message : "Unknown error" }],
        duration_ms: Date.now() - startTime,
      }

      return result
    }
  }

  // Sincroniza dividas do ERP para o banco
  async syncDebts(integrationId: string): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ record: any; error: string }> = []

    try {
      console.log("Syncing debts from ERP:", integrationId)

      const integrationRecords = await db
        .select()
        .from(erpIntegrations)
        .where(eq(erpIntegrations.id, integrationId))
        .limit(1)

      const integration = integrationRecords[0]

      if (!integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erpType)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erpType}`)
      }

      // Build config from integration data
      const integrationConfig = integration.config as any || {}
      const integrationCredentials = integration.credentials as any || {}

      const config: ERPConnectionConfig = {
        base_url: integrationConfig.base_url || "",
        auth_token: integrationCredentials.auth_token || "",
        auth_type: integrationConfig.auth_type || "bearer",
        customers_endpoint: integrationConfig.customers_endpoint || "",
        debts_endpoint: integrationConfig.debts_endpoint || "",
        sync_endpoint: integrationConfig.sync_endpoint || "",
        config: integrationConfig,
      }

      // Busca dividas do ERP
      const rawDebts = await connector.fetchDebts(config)
      console.log("Fetched debts from ERP:", rawDebts.length)

      let successCount = 0
      let failedCount = 0

      // Processa cada divida
      for (const rawDebt of rawDebts) {
        try {
          const normalized = normalizeDebtData(rawDebt, integration.erpType, integration.companyId)

          if (!normalized) {
            failedCount++
            errors.push({ record: rawDebt, error: "Failed to normalize debt data" })
            continue
          }

          // Busca o customer_id pelo external_id
          const customerRecords = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.externalId, normalized.customer_external_id),
                eq(customers.companyId, normalized.company_id)
              )
            )
            .limit(1)

          const customer = customerRecords[0]

          if (!customer) {
            failedCount++
            errors.push({ record: rawDebt, error: "Customer not found" })
            continue
          }

          // Verifica se divida ja existe
          const existingRecords = await db
            .select({ id: debts.id })
            .from(debts)
            .where(
              and(
                eq(debts.externalId, normalized.external_id),
                eq(debts.companyId, normalized.company_id)
              )
            )
            .limit(1)

          const existing = existingRecords[0]

          if (existing) {
            // Atualiza divida existente
            try {
              await db
                .update(debts)
                .set({
                  amount: String(normalized.amount),
                  dueDate: normalized.due_date,
                  description: normalized.description,
                  status: normalized.status,
                  classification: normalized.classification,
                  source: normalized.source_system,
                  updatedAt: new Date(),
                })
                .where(eq(debts.id, existing.id))

              successCount++
            } catch (updateError: any) {
              failedCount++
              errors.push({ record: rawDebt, error: updateError.message })
            }
          } else {
            // Cria nova divida
            try {
              await db.insert(debts).values({
                externalId: normalized.external_id,
                customerId: customer.id,
                amount: String(normalized.amount),
                dueDate: normalized.due_date,
                description: normalized.description,
                status: normalized.status,
                classification: normalized.classification,
                source: normalized.source_system,
                companyId: normalized.company_id,
              })

              successCount++
            } catch (insertError: any) {
              failedCount++
              errors.push({ record: rawDebt, error: insertError.message })
            }
          }
        } catch (error) {
          failedCount++
          errors.push({
            record: rawDebt,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      const result: SyncResult = {
        success: failedCount === 0,
        records_processed: rawDebts.length,
        records_success: successCount,
        records_failed: failedCount,
        errors,
        duration_ms: Date.now() - startTime,
      }

      // Atualiza ultima sincronizacao
      await db
        .update(erpIntegrations)
        .set({ lastSyncAt: new Date() })
        .where(eq(erpIntegrations.id, integrationId))

      // Cria log
      await this.createLog({
        integrationId: integrationId,
        companyId: integration.companyId,
        action: "sync_debts",
        status: result.success ? "success" : failedCount < rawDebts.length ? "warning" : "error",
        error: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        details: {
          records_processed: result.records_processed,
          records_success: result.records_success,
          records_failed: result.records_failed,
          duration_ms: result.duration_ms,
        },
      })

      return result
    } catch (error) {
      console.error("Error syncing debts:", error)

      const result: SyncResult = {
        success: false,
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        errors: [{ record: {}, error: error instanceof Error ? error.message : "Unknown error" }],
        duration_ms: Date.now() - startTime,
      }

      return result
    }
  }

  // Envia resultados de volta ao ERP
  async syncResultsToERP(integrationId: string): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      console.log("Syncing results to ERP:", integrationId)

      const integrationRecords = await db
        .select()
        .from(erpIntegrations)
        .where(eq(erpIntegrations.id, integrationId))
        .limit(1)

      const integration = integrationRecords[0]

      if (!integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erpType)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erpType}`)
      }

      // Build config from integration data
      const integrationConfig = integration.config as any || {}
      const integrationCredentials = integration.credentials as any || {}

      const config: ERPConnectionConfig = {
        base_url: integrationConfig.base_url || "",
        auth_token: integrationCredentials.auth_token || "",
        auth_type: integrationConfig.auth_type || "bearer",
        customers_endpoint: integrationConfig.customers_endpoint || "",
        debts_endpoint: integrationConfig.debts_endpoint || "",
        sync_endpoint: integrationConfig.sync_endpoint || "",
        config: integrationConfig,
      }

      // Busca pagamentos das ultimas 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const paymentsData = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paidAt: payments.paidAt,
          status: payments.status,
          method: payments.method,
          debtId: payments.debtId,
        })
        .from(payments)
        .where(
          and(
            eq(payments.companyId, integration.companyId),
            gte(payments.createdAt, twentyFourHoursAgo)
          )
        )

      if (!paymentsData || paymentsData.length === 0) {
        const result: SyncResult = {
          success: true,
          records_processed: 0,
          records_success: 0,
          records_failed: 0,
          errors: [],
          duration_ms: Date.now() - startTime,
        }

        await this.createLog({
          integrationId: integrationId,
          companyId: integration.companyId,
          action: "sync_results",
          status: "success",
          details: {
            records_processed: 0,
            records_success: 0,
            records_failed: 0,
            duration_ms: result.duration_ms,
          },
        })

        return result
      }

      // Get debt external_ids for the payments
      const debtIds = paymentsData.map(p => p.debtId).filter((id): id is string => id !== null)

      const debtsData = debtIds.length > 0
        ? await db
            .select({ id: debts.id, externalId: debts.externalId })
            .from(debts)
            .where(eq(debts.companyId, integration.companyId))
        : []

      const debtExternalIdMap = new Map(debtsData.map(d => [d.id, d.externalId]))

      // Formata dados para envio
      const dataToSync = paymentsData.map((payment) => ({
        external_id: payment.debtId ? debtExternalIdMap.get(payment.debtId) : undefined,
        payment_id: payment.id,
        amount: payment.amount,
        payment_date: payment.paidAt?.toISOString(),
        status: payment.status,
        payment_method: payment.method,
      }))

      // Envia para o ERP
      const success = await connector.syncResults(config, dataToSync)

      const result: SyncResult = {
        success,
        records_processed: dataToSync.length,
        records_success: success ? dataToSync.length : 0,
        records_failed: success ? 0 : dataToSync.length,
        errors: success ? [] : [{ record: {}, error: "Failed to sync results to ERP" }],
        duration_ms: Date.now() - startTime,
      }

      await this.createLog({
        integrationId: integrationId,
        companyId: integration.companyId,
        action: "sync_results",
        status: result.success ? "success" : "error",
        error: result.success ? undefined : "Failed to sync results to ERP",
        details: {
          records_processed: result.records_processed,
          records_success: result.records_success,
          records_failed: result.records_failed,
          duration_ms: result.duration_ms,
        },
      })

      return result
    } catch (error) {
      console.error("Error syncing results:", error)

      const result: SyncResult = {
        success: false,
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        errors: [{ record: {}, error: error instanceof Error ? error.message : "Unknown error" }],
        duration_ms: Date.now() - startTime,
      }

      return result
    }
  }

  async syncCustomersWithCreditAnalysis(
    integrationId: string,
    analysisType: "free" | "assertiva" = "free",
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ record: any; error: string }> = []

    try {
      console.log("Syncing customers with credit analysis from ERP:", integrationId)

      // Primeiro sincroniza os clientes normalmente
      const syncResult = await this.syncCustomers(integrationId)

      if (!syncResult.success) {
        return syncResult
      }

      // Busca a integracao para pegar o company_id
      const integrationRecords = await db
        .select({ companyId: erpIntegrations.companyId })
        .from(erpIntegrations)
        .where(eq(erpIntegrations.id, integrationId))
        .limit(1)

      const integration = integrationRecords[0]

      if (!integration) {
        throw new Error("Integration not found")
      }

      // Busca clientes recem-sincronizados (ultimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

      const customersData = await db
        .select({
          id: customers.id,
          name: customers.name,
          document: customers.document,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(
          and(
            eq(customers.companyId, integration.companyId),
            gte(customers.createdAt, fiveMinutesAgo)
          )
        )

      if (!customersData || customersData.length === 0) {
        return syncResult
      }

      console.log("Running credit analysis for", customersData.length, "new customers")

      let analysisSuccess = 0
      let analysisFailed = 0

      // Executa analise de credito para cada cliente novo
      for (const customer of customersData) {
        try {
          const analysisResult =
            analysisType === "free"
              ? await analyzeCreditFree(customer.document || "", customer.name || "")
              : await analyzeCreditAssertiva(customer.document || "", customer.name || "")

          if (analysisResult.success) {
            // Salva resultado da analise
            await db.insert(creditProfiles).values({
              customerId: customer.id,
              companyId: integration.companyId,
              cpf: customer.document,
              score: analysisResult.score ? String(analysisResult.score) : null,
              riskLevel: analysisResult.risk_level,
              analysisType: analysisType,
              data: analysisResult.details,
              createdAt: new Date(),
              updatedAt: new Date(),
            })

            analysisSuccess++
          } else {
            analysisFailed++
            errors.push({ record: customer, error: analysisResult.error || "Analysis failed" })
          }
        } catch (error) {
          analysisFailed++
          errors.push({
            record: customer,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      console.log("Credit analysis completed:", analysisSuccess, "success,", analysisFailed, "failed")

      // Cria log da operacao de analise
      await this.createLog({
        integrationId: integrationId,
        companyId: integration.companyId,
        action: "credit_analysis",
        status: analysisFailed === 0 ? "success" : analysisFailed < customersData.length ? "warning" : "error",
        error: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        details: {
          records_processed: customersData.length,
          records_success: analysisSuccess,
          records_failed: analysisFailed,
          duration_ms: Date.now() - startTime,
        },
      })

      return {
        ...syncResult,
        duration_ms: Date.now() - startTime,
      }
    } catch (error) {
      console.error("Error syncing customers with credit analysis:", error)

      const result: SyncResult = {
        success: false,
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        errors: [{ record: {}, error: error instanceof Error ? error.message : "Unknown error" }],
        duration_ms: Date.now() - startTime,
      }

      return result
    }
  }

  // Cria log de integracao
  private async createLog(log: {
    integrationId: string
    companyId: string
    action: string
    status: string
    error?: string
    details?: any
  }): Promise<void> {
    try {
      await db.insert(erpIntegrationLogs).values({
        integrationId: log.integrationId,
        companyId: log.companyId,
        action: log.action,
        status: log.status,
        error: log.error,
        details: log.details,
      })
    } catch (error) {
      console.error("Error creating log:", error)
    }
  }
}

// Exporta instancia singleton
export const erpService = new ERPService()
