// Tipos e interfaces para integração ERP

export type ERPType = "totvs" | "sankhya" | "omie" | "custom"

export type SyncFrequency = "manual" | "hourly" | "daily" | "weekly"

export type AuthType = "bearer" | "basic" | "api_key"

export type OperationType = "sync_customers" | "sync_debts" | "post_results" | "test_connection"

export type LogStatus = "success" | "error" | "warning" | "in_progress"

export type CustomerStatus = "inadimplente" | "em_acordo" | "pago" | "ativo"

// Configuração de integração ERP
export interface ERPIntegration {
  id: string
  company_id: string
  erp_type: ERPType
  erp_name: string
  base_url: string
  auth_token?: string
  auth_type: AuthType
  customers_endpoint?: string
  debts_endpoint?: string
  sync_endpoint?: string
  is_active: boolean
  last_sync_at?: string
  sync_frequency: SyncFrequency
  config?: Record<string, any>
  created_at: string
  updated_at: string
}

// Log de integração
export interface IntegrationLog {
  id: string
  integration_id: string
  company_id: string
  operation_type: OperationType
  status: LogStatus
  records_processed: number
  records_success: number
  records_failed: number
  error_message?: string
  request_data?: Record<string, any>
  response_data?: Record<string, any>
  duration_ms?: number
  created_at: string
}

// Cliente padronizado (formato interno Altea Pay)
export interface StandardizedCustomer {
  id?: string
  external_id: string
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  balance?: number
  status?: CustomerStatus
  source_system: string
  company_id: string
}

// Dívida padronizada (formato interno Altea Pay)
export interface StandardizedDebt {
  id?: string
  external_id: string
  customer_external_id: string
  amount: number
  due_date: string
  description?: string
  status: "pending" | "paid" | "overdue" | "in_agreement"
  classification?: "low" | "medium" | "high" | "critical"
  source_system: string
  company_id: string
}

// Configuração de conexão ERP
export interface ERPConnectionConfig {
  base_url: string
  auth_token?: string
  auth_type: AuthType
  customers_endpoint?: string
  debts_endpoint?: string
  sync_endpoint?: string
  config?: Record<string, any>
}

// Resultado de sincronização
export interface SyncResult {
  success: boolean
  records_processed: number
  records_success: number
  records_failed: number
  errors: Array<{
    record: any
    error: string
  }>
  duration_ms: number
}

// Interface base para conectores ERP
export interface ERPConnector {
  name: string
  type: ERPType

  // Testa conexão com o ERP
  testConnection(config: ERPConnectionConfig): Promise<boolean>

  // Busca clientes do ERP
  fetchCustomers(config: ERPConnectionConfig): Promise<any[]>

  // Busca dívidas do ERP
  fetchDebts(config: ERPConnectionConfig): Promise<any[]>

  // Envia dados processados de volta para o ERP
  syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean>

  // Normaliza dados do ERP para formato padrão
  normalizeCustomer(rawData: any): StandardizedCustomer
  normalizeDebt(rawData: any): StandardizedDebt
}
