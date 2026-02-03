export interface TransactionLog {
  id: string
  provider: string
  operation: string
  request_data: Record<string, unknown>
  response_data: Record<string, unknown> | null
  error_message: string | null
  company_id: string | null
  duration_ms: number
  created_at: Date
}

export interface TransactionRepository {
  log(entry: Omit<TransactionLog, "id" | "created_at">): Promise<void>
  getByProvider(provider: string, limit?: number): Promise<TransactionLog[]>
  getByCompanyId(companyId: string, limit?: number): Promise<TransactionLog[]>
}
