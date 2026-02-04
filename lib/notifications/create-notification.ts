"use server"

import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

export interface CreateNotificationParams {
  userId: string
  companyId: string
  type: string
  title: string
  description: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const [data] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        companyId: params.companyId,
        type: params.type,
        title: params.title,
        message: params.description,
        isRead: false,
      })
      .returning()

    return { success: true, data }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
  }
}

// Helper functions for common notification types
export async function notifyImportComplete(
  userId: string,
  companyId: string,
  totalRecords: number,
  successfulRecords: number,
) {
  return createNotification({
    userId,
    companyId,
    type: "import_complete",
    title: "Nova importacao concluida",
    description: `${successfulRecords} de ${totalRecords} registros processados com sucesso`,
  })
}

export async function notifyCollectionRuleExecuted(
  userId: string,
  companyId: string,
  emailsSent: number,
  ruleName: string,
) {
  return createNotification({
    userId,
    companyId,
    type: "collection_rule_executed",
    title: "Regua de cobranca executada",
    description: `${emailsSent} ${emailsSent === 1 ? "email enviado" : "emails enviados"} automaticamente - ${ruleName}`,
  })
}

export async function notifyPaymentReceived(userId: string, companyId: string, amount: number, customerName: string) {
  return createNotification({
    userId,
    companyId,
    type: "payment_received",
    title: "Pagamento recebido",
    description: `R$ ${amount.toFixed(2).replace(".", ",")} - Cliente ${customerName}`,
  })
}

export async function notifyAgreementCreated(userId: string, companyId: string, customerName: string, amount: number) {
  return createNotification({
    userId,
    companyId,
    type: "agreement_created",
    title: "Novo acordo realizado",
    description: `Acordo de R$ ${amount.toFixed(2).replace(".", ",")} com ${customerName}`,
  })
}

export async function notifyCreditAnalysisComplete(userId: string, companyId: string, customersAnalyzed: number) {
  return createNotification({
    userId,
    companyId,
    type: "credit_analysis_complete",
    title: "Analise restritiva concluida",
    description: `${customersAnalyzed} ${customersAnalyzed === 1 ? "cliente analisado" : "clientes analisados"} com sucesso`,
  })
}
