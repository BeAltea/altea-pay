// Serviço genérico para integração com ERPs

import { createClient } from "@/lib/supabase/server"
import type { ERPConnectionConfig, SyncResult, IntegrationLog } from "./types"
import { getConnector } from "./connectors"
import { normalizeCustomerData, normalizeDebtData } from "@/lib/utils/normalizeData"
import { analyzeCreditFree, analyzeCreditAssertiva } from "@/services/creditAnalysisService"

export class ERPService {
  private async getSupabase() {
    return await createClient()
  }

  // Testa conexão com o ERP
  async testConnection(integrationId: string): Promise<boolean> {
    const startTime = Date.now()

    try {
      console.log("Testing ERP connection:", integrationId)

      const supabase = await this.getSupabase()

      const { data: integration, error } = await supabase
        .from("erp_integrations")
        .select("*")
        .eq("id", integrationId)
        .single()

      if (error || !integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erp_type)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erp_type}`)
      }

      const config: ERPConnectionConfig = {
        base_url: integration.base_url,
        auth_token: integration.auth_token,
        auth_type: integration.auth_type,
        customers_endpoint: integration.customers_endpoint,
        debts_endpoint: integration.debts_endpoint,
        sync_endpoint: integration.sync_endpoint,
        config: integration.config,
      }

      const isConnected = await connector.testConnection(config)

      await this.createLog({
        integration_id: integrationId,
        company_id: integration.company_id,
        operation_type: "test_connection",
        status: isConnected ? "success" : "error",
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        duration_ms: Date.now() - startTime,
      })

      return isConnected
    } catch (error) {
      console.error("Error testing connection:", error)

      const supabase = await this.getSupabase()

      await this.createLog({
        integration_id: integrationId,
        company_id: "",
        operation_type: "test_connection",
        status: "error",
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        error_message: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      })

      return false
    }
  }

  // Sincroniza clientes do ERP para o Supabase
  async syncCustomers(integrationId: string): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ record: any; error: string }> = []

    try {
      console.log("Syncing customers from ERP:", integrationId)

      const supabase = await this.getSupabase()

      const { data: integration, error } = await supabase
        .from("erp_integrations")
        .select("*")
        .eq("id", integrationId)
        .single()

      if (error || !integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erp_type)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erp_type}`)
      }

      const config: ERPConnectionConfig = {
        base_url: integration.base_url,
        auth_token: integration.auth_token,
        auth_type: integration.auth_type,
        customers_endpoint: integration.customers_endpoint,
        debts_endpoint: integration.debts_endpoint,
        sync_endpoint: integration.sync_endpoint,
        config: integration.config,
      }

      // Busca clientes do ERP
      const rawCustomers = await connector.fetchCustomers(config)
      console.log("Fetched customers from ERP:", rawCustomers.length)

      let successCount = 0
      let failedCount = 0

      // Processa cada cliente
      for (const rawCustomer of rawCustomers) {
        try {
          const normalized = normalizeCustomerData(rawCustomer, integration.erp_type, integration.company_id)

          if (!normalized) {
            failedCount++
            errors.push({ record: rawCustomer, error: "Failed to normalize customer data" })
            continue
          }

          // Verifica se cliente já existe
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("external_id", normalized.external_id)
            .eq("company_id", normalized.company_id)
            .single()

          if (existing) {
            // Atualiza cliente existente
            const { error: updateError } = await supabase
              .from("customers")
              .update({
                name: normalized.name,
                document: normalized.cpfCnpj,
                email: normalized.email,
                phone: normalized.phone,
                address: normalized.address,
                city: normalized.city,
                state: normalized.state,
                zip_code: normalized.zip_code,
                source_system: normalized.source_system,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)

            if (updateError) {
              failedCount++
              errors.push({ record: rawCustomer, error: updateError.message })
            } else {
              successCount++
            }
          } else {
            // Cria novo cliente
            const { error: insertError } = await supabase.from("customers").insert({
              external_id: normalized.external_id,
              name: normalized.name,
              document: normalized.cpfCnpj,
              document_type: normalized.cpfCnpj.length === 11 ? "CPF" : "CNPJ",
              email: normalized.email,
              phone: normalized.phone,
              address: normalized.address,
              city: normalized.city,
              state: normalized.state,
              zip_code: normalized.zip_code,
              source_system: normalized.source_system,
              company_id: normalized.company_id,
            })

            if (insertError) {
              failedCount++
              errors.push({ record: rawCustomer, error: insertError.message })
            } else {
              successCount++
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

      // Atualiza última sincronização
      await supabase.from("erp_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integrationId)

      // Cria log
      await this.createLog({
        integration_id: integrationId,
        company_id: integration.company_id,
        operation_type: "sync_customers",
        status: result.success ? "success" : failedCount < rawCustomers.length ? "warning" : "error",
        records_processed: result.records_processed,
        records_success: result.records_success,
        records_failed: result.records_failed,
        error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        duration_ms: result.duration_ms,
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

  // Sincroniza dívidas do ERP para o Supabase
  async syncDebts(integrationId: string): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: Array<{ record: any; error: string }> = []

    try {
      console.log("Syncing debts from ERP:", integrationId)

      const supabase = await this.getSupabase()

      const { data: integration, error } = await supabase
        .from("erp_integrations")
        .select("*")
        .eq("id", integrationId)
        .single()

      if (error || !integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erp_type)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erp_type}`)
      }

      const config: ERPConnectionConfig = {
        base_url: integration.base_url,
        auth_token: integration.auth_token,
        auth_type: integration.auth_type,
        customers_endpoint: integration.customers_endpoint,
        debts_endpoint: integration.debts_endpoint,
        sync_endpoint: integration.sync_endpoint,
        config: integration.config,
      }

      // Busca dívidas do ERP
      const rawDebts = await connector.fetchDebts(config)
      console.log("Fetched debts from ERP:", rawDebts.length)

      let successCount = 0
      let failedCount = 0

      // Processa cada dívida
      for (const rawDebt of rawDebts) {
        try {
          const normalized = normalizeDebtData(rawDebt, integration.erp_type, integration.company_id)

          if (!normalized) {
            failedCount++
            errors.push({ record: rawDebt, error: "Failed to normalize debt data" })
            continue
          }

          // Busca o customer_id pelo external_id
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("external_id", normalized.customer_external_id)
            .eq("company_id", normalized.company_id)
            .single()

          if (!customer) {
            failedCount++
            errors.push({ record: rawDebt, error: "Customer not found" })
            continue
          }

          // Verifica se dívida já existe
          const { data: existing } = await supabase
            .from("debts")
            .select("id")
            .eq("external_id", normalized.external_id)
            .eq("company_id", normalized.company_id)
            .single()

          if (existing) {
            // Atualiza dívida existente
            const { error: updateError } = await supabase
              .from("debts")
              .update({
                amount: normalized.amount,
                due_date: normalized.due_date,
                description: normalized.description,
                status: normalized.status,
                classification: normalized.classification,
                source_system: normalized.source_system,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)

            if (updateError) {
              failedCount++
              errors.push({ record: rawDebt, error: updateError.message })
            } else {
              successCount++
            }
          } else {
            // Cria nova dívida
            const { error: insertError } = await supabase.from("debts").insert({
              external_id: normalized.external_id,
              customer_id: customer.id,
              amount: normalized.amount,
              due_date: normalized.due_date,
              description: normalized.description,
              status: normalized.status,
              classification: normalized.classification,
              source_system: normalized.source_system,
              company_id: normalized.company_id,
            })

            if (insertError) {
              failedCount++
              errors.push({ record: rawDebt, error: insertError.message })
            } else {
              successCount++
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

      // Atualiza última sincronização
      await supabase.from("erp_integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integrationId)

      // Cria log
      await this.createLog({
        integration_id: integrationId,
        company_id: integration.company_id,
        operation_type: "sync_debts",
        status: result.success ? "success" : failedCount < rawDebts.length ? "warning" : "error",
        records_processed: result.records_processed,
        records_success: result.records_success,
        records_failed: result.records_failed,
        error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        duration_ms: result.duration_ms,
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

      const supabase = await this.getSupabase()

      const { data: integration, error } = await supabase
        .from("erp_integrations")
        .select("*")
        .eq("id", integrationId)
        .single()

      if (error || !integration) {
        throw new Error("Integration not found")
      }

      const connector = getConnector(integration.erp_type)
      if (!connector) {
        throw new Error(`Connector not found for type: ${integration.erp_type}`)
      }

      const config: ERPConnectionConfig = {
        base_url: integration.base_url,
        auth_token: integration.auth_token,
        auth_type: integration.auth_type,
        customers_endpoint: integration.customers_endpoint,
        debts_endpoint: integration.debts_endpoint,
        sync_endpoint: integration.sync_endpoint,
        config: integration.config,
      }

      // Busca pagamentos das últimas 24h
      const { data: payments } = await supabase
        .from("payments")
        .select("*, debt:debts(external_id)")
        .eq("company_id", integration.company_id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (!payments || payments.length === 0) {
        const result: SyncResult = {
          success: true,
          records_processed: 0,
          records_success: 0,
          records_failed: 0,
          errors: [],
          duration_ms: Date.now() - startTime,
        }

        await this.createLog({
          integration_id: integrationId,
          company_id: integration.company_id,
          operation_type: "sync_results",
          status: "success",
          records_processed: 0,
          records_success: 0,
          records_failed: 0,
          duration_ms: result.duration_ms,
        })

        return result
      }

      // Formata dados para envio
      const dataToSync = payments.map((payment) => ({
        external_id: payment.debt?.external_id,
        payment_id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        status: payment.status,
        payment_method: payment.payment_method,
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
        integration_id: integrationId,
        company_id: integration.company_id,
        operation_type: "sync_results",
        status: result.success ? "success" : "error",
        records_processed: result.records_processed,
        records_success: result.records_success,
        records_failed: result.records_failed,
        error_message: result.success ? undefined : "Failed to sync results to ERP",
        duration_ms: result.duration_ms,
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

      const supabase = await this.getSupabase()

      // Busca a integração para pegar o company_id
      const { data: integration } = await supabase
        .from("erp_integrations")
        .select("company_id")
        .eq("id", integrationId)
        .single()

      if (!integration) {
        throw new Error("Integration not found")
      }

      // Busca clientes recém-sincronizados (últimos 5 minutos)
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, document, email, phone")
        .eq("company_id", integration.company_id)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())

      if (!customers || customers.length === 0) {
        return syncResult
      }

      console.log("Running credit analysis for", customers.length, "new customers")

      let analysisSuccess = 0
      let analysisFailed = 0

      // Executa análise de crédito para cada cliente novo
      for (const customer of customers) {
        try {
          const analysisResult =
            analysisType === "free"
              ? await analyzeCreditFree(customer.document, customer.name)
              : await analyzeCreditAssertiva(customer.document, customer.name)

          if (analysisResult.success) {
            // Salva resultado da análise
            await supabase.from("credit_profiles").insert({
              customer_id: customer.id,
              company_id: integration.company_id,
              document: customer.document,
              score: analysisResult.score,
              risk_level: analysisResult.risk_level,
              analysis_type: analysisType,
              analysis_data: analysisResult.data,
              analyzed_at: new Date().toISOString(),
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

      // Cria log da operação de análise
      await this.createLog({
        integration_id: integrationId,
        company_id: integration.company_id,
        operation_type: "credit_analysis",
        status: analysisFailed === 0 ? "success" : analysisFailed < customers.length ? "warning" : "error",
        records_processed: customers.length,
        records_success: analysisSuccess,
        records_failed: analysisFailed,
        error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : undefined,
        duration_ms: Date.now() - startTime,
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

  // Cria log de integração
  private async createLog(log: Omit<IntegrationLog, "id" | "created_at">): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase.from("erp_integration_logs").insert(log)
    } catch (error) {
      console.error("Error creating log:", error)
    }
  }
}

// Exporta instância singleton
export const erpService = new ERPService()
