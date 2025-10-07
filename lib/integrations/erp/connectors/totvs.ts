// Conector específico para TOTVS Protheus
// Baseado na documentação da API TOTVS

import type { ERPConnector, ERPConnectionConfig, StandardizedCustomer, StandardizedDebt } from "../types"

export class TotvsConnector implements ERPConnector {
  name = "TOTVS Protheus"
  type = "totvs" as const

  async testConnection(config: ERPConnectionConfig): Promise<boolean> {
    try {
      console.log("[v0] Testing connection to TOTVS:", config.base_url)

      // TOTVS geralmente usa /api/framework/v1/health ou similar
      const response = await fetch(`${config.base_url}/api/framework/v1/health`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error testing TOTVS connection:", error)
      return false
    }
  }

  async fetchCustomers(config: ERPConnectionConfig): Promise<any[]> {
    try {
      console.log("[v0] Fetching customers from TOTVS")

      // TOTVS usa estrutura específica de endpoints
      const endpoint = config.customers_endpoint || "/api/crm/v1/customers"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // TOTVS retorna dados em { items: [...] }
      return data.items || data.data || []
    } catch (error) {
      console.error("[v0] Error fetching TOTVS customers:", error)
      throw error
    }
  }

  async fetchDebts(config: ERPConnectionConfig): Promise<any[]> {
    try {
      console.log("[v0] Fetching debts from TOTVS")

      const endpoint = config.debts_endpoint || "/api/fin/v1/receivables"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.items || data.data || []
    } catch (error) {
      console.error("[v0] Error fetching TOTVS debts:", error)
      throw error
    }
  }

  async syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean> {
    try {
      console.log("[v0] Syncing results to TOTVS:", data.length, "records")

      const endpoint = config.sync_endpoint || "/api/fin/v1/receivables/batch"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "POST",
        headers: {
          ...this.getHeaders(config),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: data }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error syncing TOTVS results:", error)
      return false
    }
  }

  normalizeCustomer(rawData: any): StandardizedCustomer {
    // Estrutura específica do TOTVS
    return {
      external_id: rawData.customerCode || rawData.codigo,
      name: rawData.name || rawData.shortName || rawData.razaoSocial,
      cpfCnpj: rawData.federalId || rawData.cgc || rawData.cpf,
      email: rawData.email || rawData.emailAddress,
      phone: rawData.phone || rawData.phoneNumber,
      address: rawData.address?.street || rawData.endereco,
      city: rawData.address?.city || rawData.cidade,
      state: rawData.address?.state || rawData.estado,
      zip_code: rawData.address?.zipCode || rawData.cep,
      balance: rawData.balance || 0,
      status: rawData.status || "ativo",
      source_system: this.type,
      company_id: "",
    }
  }

  normalizeDebt(rawData: any): StandardizedDebt {
    return {
      external_id: rawData.invoiceNumber || rawData.numero,
      customer_external_id: rawData.customerCode || rawData.codigoCliente,
      amount: Number.parseFloat(rawData.grossValue || rawData.valorBruto || "0"),
      due_date: rawData.dueDate || rawData.vencimento,
      description: rawData.description || rawData.historico,
      status: rawData.status === "2" || rawData.status === "paid" ? "paid" : "pending",
      classification: "medium",
      source_system: this.type,
      company_id: "",
    }
  }

  private getHeaders(config: ERPConnectionConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (config.auth_token) {
      headers.Authorization = `Bearer ${config.auth_token}`
    }

    return headers
  }
}

// Registra o conector
import { registerConnector } from "./index"
registerConnector(new TotvsConnector())
