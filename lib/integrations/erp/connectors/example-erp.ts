// Conector de exemplo para ERP genérico
// Baseado na documentação: https://documenter.getpostman.com/view/16282829/TzzBqFw1

import type { ERPConnector, ERPConnectionConfig, StandardizedCustomer, StandardizedDebt } from "../types"

export class ExampleERPConnector implements ERPConnector {
  name = "Example ERP"
  type = "custom" as const

  // Testa conexão com o ERP
  async testConnection(config: ERPConnectionConfig): Promise<boolean> {
    try {
      console.log("[v0] Testing connection to Example ERP:", config.base_url)

      const response = await fetch(`${config.base_url}/health`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error testing connection:", error)
      return false
    }
  }

  // Busca clientes do ERP
  async fetchCustomers(config: ERPConnectionConfig): Promise<any[]> {
    try {
      console.log("[v0] Fetching customers from Example ERP")

      const endpoint = config.customers_endpoint || "/api/customers"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // A API pode retornar os dados em diferentes formatos
      // Tenta detectar o formato e extrair o array de clientes
      if (Array.isArray(data)) {
        return data
      } else if (data.data && Array.isArray(data.data)) {
        return data.data
      } else if (data.customers && Array.isArray(data.customers)) {
        return data.customers
      } else if (data.results && Array.isArray(data.results)) {
        return data.results
      }

      return []
    } catch (error) {
      console.error("[v0] Error fetching customers:", error)
      throw error
    }
  }

  // Busca dívidas do ERP
  async fetchDebts(config: ERPConnectionConfig): Promise<any[]> {
    try {
      console.log("[v0] Fetching debts from Example ERP")

      const endpoint = config.debts_endpoint || "/api/debts"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Detecta formato da resposta
      if (Array.isArray(data)) {
        return data
      } else if (data.data && Array.isArray(data.data)) {
        return data.data
      } else if (data.debts && Array.isArray(data.debts)) {
        return data.debts
      } else if (data.invoices && Array.isArray(data.invoices)) {
        return data.invoices
      } else if (data.results && Array.isArray(data.results)) {
        return data.results
      }

      return []
    } catch (error) {
      console.error("[v0] Error fetching debts:", error)
      throw error
    }
  }

  // Envia dados processados de volta para o ERP
  async syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean> {
    try {
      console.log("[v0] Syncing results to Example ERP:", data.length, "records")

      const endpoint = config.sync_endpoint || "/api/sync"
      const response = await fetch(`${config.base_url}${endpoint}`, {
        method: "POST",
        headers: {
          ...this.getHeaders(config),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error syncing results:", error)
      return false
    }
  }

  // Normaliza cliente do ERP para formato padrão
  normalizeCustomer(rawData: any): StandardizedCustomer {
    // Este é um exemplo genérico - cada ERP terá sua própria estrutura
    return {
      external_id: rawData.id || rawData.customer_id || rawData.codigo,
      name: rawData.name || rawData.nome || rawData.razao_social,
      cpfCnpj: rawData.cpf || rawData.cnpj || rawData.document || rawData.documento,
      email: rawData.email || rawData.e_mail,
      phone: rawData.phone || rawData.telefone || rawData.celular,
      address: rawData.address || rawData.endereco,
      city: rawData.city || rawData.cidade,
      state: rawData.state || rawData.estado || rawData.uf,
      zip_code: rawData.zip_code || rawData.cep,
      balance: rawData.balance || rawData.saldo || 0,
      status: rawData.status || "ativo",
      source_system: this.type,
      company_id: "", // Será preenchido pelo serviço
    }
  }

  // Normaliza dívida do ERP para formato padrão
  normalizeDebt(rawData: any): StandardizedDebt {
    return {
      external_id: rawData.id || rawData.debt_id || rawData.invoice_id,
      customer_external_id: rawData.customer_id || rawData.client_id || rawData.cliente_id,
      amount: Number.parseFloat(rawData.amount || rawData.valor || rawData.value || "0"),
      due_date: rawData.due_date || rawData.vencimento || rawData.data_vencimento,
      description: rawData.description || rawData.descricao || rawData.obs,
      status: rawData.status === "paid" || rawData.status === "pago" ? "paid" : "pending",
      classification: rawData.classification || rawData.classificacao || "medium",
      source_system: this.type,
      company_id: "", // Será preenchido pelo serviço
    }
  }

  // Monta headers para requisições
  private getHeaders(config: ERPConnectionConfig): Record<string, string> {
    const headers: Record<string, string> = {}

    if (config.auth_token) {
      switch (config.auth_type) {
        case "bearer":
          headers.Authorization = `Bearer ${config.auth_token}`
          break
        case "basic":
          headers.Authorization = `Basic ${config.auth_token}`
          break
        case "api_key":
          headers["X-API-Key"] = config.auth_token
          break
      }
    }

    return headers
  }
}

// Registra o conector
import { registerConnector } from "./index"
registerConnector(new ExampleERPConnector())
