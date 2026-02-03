import type { Pool } from "pg"
import type { TransactionLog, TransactionRepository } from "../interfaces/transaction-repository.js"

export class PgTransactionRepository implements TransactionRepository {
  constructor(private pool: Pool) {}

  async log(entry: Omit<TransactionLog, "id" | "created_at">): Promise<void> {
    await this.pool.query(
      `INSERT INTO transaction_logs (provider, operation, request_data, response_data, error_message, company_id, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.provider,
        entry.operation,
        JSON.stringify(entry.request_data),
        entry.response_data ? JSON.stringify(entry.response_data) : null,
        entry.error_message,
        entry.company_id,
        entry.duration_ms,
      ]
    )
  }

  async getByProvider(provider: string, limit = 100): Promise<TransactionLog[]> {
    const result = await this.pool.query(
      `SELECT * FROM transaction_logs WHERE provider = $1 ORDER BY created_at DESC LIMIT $2`,
      [provider, limit]
    )
    return result.rows
  }

  async getByCompanyId(companyId: string, limit = 100): Promise<TransactionLog[]> {
    const result = await this.pool.query(
      `SELECT * FROM transaction_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    )
    return result.rows
  }
}
