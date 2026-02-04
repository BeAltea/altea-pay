import { db } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { customers, debts } from "@/lib/db/schema"

export interface ERPCustomer {
  external_id: string
  name: string
  document: string
  email?: string
  phone?: string
  address?: string
  credit_limit?: number
  payment_terms?: string
}

export interface ERPInvoice {
  external_id: string
  customer_external_id: string
  amount: number
  due_date: string
  status: "pending" | "paid" | "overdue"
  description?: string
}

export interface ERPSyncResult {
  success: boolean
  customers_synced: number
  invoices_synced: number
  errors: string[]
}

export class ERPIntegrationService {
  // Sincroniza clientes do ERP para o sistema
  static async syncCustomers(companyId: string, erpCustomers: ERPCustomer[]): Promise<ERPSyncResult> {
    console.log("[v0] ERPIntegrationService.syncCustomers - Starting", {
      companyId,
      customersCount: erpCustomers.length,
    })

    const errors: string[] = []
    let customersSynced = 0

    for (const erpCustomer of erpCustomers) {
      try {
        // Verifica se o cliente ja existe
        const existingRecords = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.companyId, companyId), eq(customers.document, erpCustomer.document)))
          .limit(1)

        const existing = existingRecords[0]

        if (existing) {
          // Atualiza cliente existente
          try {
            await db
              .update(customers)
              .set({
                name: erpCustomer.name,
                email: erpCustomer.email,
                phone: erpCustomer.phone,
                updatedAt: new Date(),
              })
              .where(eq(customers.id, existing.id))

            customersSynced++
          } catch (error: any) {
            errors.push(`Erro ao atualizar cliente ${erpCustomer.name}: ${error.message}`)
          }
        } else {
          // Cria novo cliente
          try {
            await db.insert(customers).values({
              companyId: companyId,
              name: erpCustomer.name,
              document: erpCustomer.document,
              documentType: erpCustomer.document.length === 11 ? "cpf" : "cnpj",
              email: erpCustomer.email,
              phone: erpCustomer.phone,
              status: "active",
            })

            customersSynced++
          } catch (error: any) {
            errors.push(`Erro ao criar cliente ${erpCustomer.name}: ${error.message}`)
          }
        }
      } catch (error) {
        errors.push(
          `Erro ao processar cliente ${erpCustomer.name}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        )
      }
    }

    console.log("[v0] ERPIntegrationService.syncCustomers - Completed", {
      customersSynced,
      errorsCount: errors.length,
    })

    return {
      success: errors.length === 0,
      customers_synced: customersSynced,
      invoices_synced: 0,
      errors,
    }
  }

  // Sincroniza faturas do ERP para o sistema
  static async syncInvoices(companyId: string, invoices: ERPInvoice[]): Promise<ERPSyncResult> {
    console.log("[v0] ERPIntegrationService.syncInvoices - Starting", {
      companyId,
      invoicesCount: invoices.length,
    })

    const errors: string[] = []
    let invoicesSynced = 0

    for (const erpInvoice of invoices) {
      try {
        // Busca o cliente pelo external_id
        const customerRecords = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.companyId, companyId), eq(customers.document, erpInvoice.customer_external_id)))
          .limit(1)

        const customer = customerRecords[0]

        if (!customer) {
          errors.push(`Cliente nao encontrado para fatura ${erpInvoice.external_id}`)
          continue
        }

        // Verifica se a fatura ja existe
        const existingRecords = await db
          .select({ id: debts.id })
          .from(debts)
          .where(
            and(
              eq(debts.companyId, companyId),
              eq(debts.customerId, customer.id),
              eq(debts.amount, String(erpInvoice.amount)),
              eq(debts.dueDate, erpInvoice.due_date)
            )
          )
          .limit(1)

        const existing = existingRecords[0]

        if (!existing) {
          // Cria nova divida
          try {
            await db.insert(debts).values({
              companyId: companyId,
              customerId: customer.id,
              originalAmount: String(erpInvoice.amount),
              amount: String(erpInvoice.amount),
              dueDate: erpInvoice.due_date,
              status: erpInvoice.status === "paid" ? "paid" : "pending",
              description: erpInvoice.description || `Fatura ${erpInvoice.external_id}`,
            })

            invoicesSynced++
          } catch (error: any) {
            errors.push(`Erro ao criar fatura ${erpInvoice.external_id}: ${error.message}`)
          }
        }
      } catch (error) {
        errors.push(
          `Erro ao processar fatura ${erpInvoice.external_id}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        )
      }
    }

    console.log("[v0] ERPIntegrationService.syncInvoices - Completed", {
      invoicesSynced,
      errorsCount: errors.length,
    })

    return {
      success: errors.length === 0,
      customers_synced: 0,
      invoices_synced: invoicesSynced,
      errors,
    }
  }

  // Exporta base de clientes para formato CSV
  static async exportCustomersToCSV(companyId: string): Promise<string> {
    console.log("[v0] ERPIntegrationService.exportCustomersToCSV - Starting", { companyId })

    const customerRecords = await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(customers.name)

    if (!customerRecords || customerRecords.length === 0) {
      throw new Error("Nenhum cliente encontrado para exportacao")
    }

    // Gera CSV
    const headers = ["Nome", "Documento", "Email", "Telefone", "Status"]
    const rows = customerRecords.map((c) => [c.name, c.document || "", c.email || "", c.phone || "", c.status || ""])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")

    console.log("[v0] ERPIntegrationService.exportCustomersToCSV - Completed", {
      customersCount: customerRecords.length,
    })

    return csv
  }
}
