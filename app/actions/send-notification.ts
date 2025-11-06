"use server"

import { createClient } from "@/lib/supabase/server"
import { sendEmail, generateDebtCollectionEmail } from "@/lib/notifications/email"
import { sendSMS, generateDebtCollectionSMS } from "@/lib/notifications/sms"

export interface SendNotificationParams {
  debtId: string
  type: "email" | "sms" | "whatsapp"
}

export interface SendNotificationResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Send collection notification to customer
 * Called from Admin Dashboard "Enviar Cobrança Manual" button
 */
export async function sendCollectionNotification({
  debtId,
  type,
}: SendNotificationParams): Promise<SendNotificationResult> {
  try {
    const supabase = await createClient()

    // Get debt details with customer and company info
    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select(`
        *,
        customer:customers(id, name, email, phone),
        company:companies(id, name)
      `)
      .eq("id", debtId)
      .single()

    if (debtError || !debt) {
      return {
        success: false,
        message: "Dívida não encontrada",
        error: debtError?.message,
      }
    }

    // Validate customer contact info
    if (type === "email" && !debt.customer?.email) {
      return {
        success: false,
        message: "Cliente não possui e-mail cadastrado",
      }
    }

    if (type === "sms" && !debt.customer?.phone) {
      return {
        success: false,
        message: "Cliente não possui telefone cadastrado",
      }
    }

    // Send notification based on type
    let result: { success: boolean; messageId?: string; error?: string }

    if (type === "email") {
      const html = await generateDebtCollectionEmail({
        customerName: debt.customer.name,
        debtAmount: debt.amount,
        dueDate: new Date(debt.due_date).toLocaleDateString("pt-BR"),
        companyName: debt.company.name,
        paymentLink: `https://alteapay.com/user-dashboard/debts/${debtId}`,
      })

      result = await sendEmail({
        to: debt.customer.email,
        subject: `Cobrança Pendente - ${debt.company.name}`,
        html,
      })
    } else if (type === "sms") {
      const body = await generateDebtCollectionSMS({
        customerName: debt.customer.name,
        debtAmount: debt.amount,
        companyName: debt.company.name,
        paymentLink: `https://alteapay.com/user-dashboard`,
      })

      result = await sendSMS({
        to: debt.customer.phone,
        body,
      })
    } else {
      // WhatsApp not implemented yet
      return {
        success: false,
        message: "WhatsApp ainda não implementado",
      }
    }

    // Log the notification action
    if (result.success) {
      await supabase.from("collection_actions").insert({
        debt_id: debtId,
        action_type: type,
        status: "sent",
        message_id: result.messageId,
        company_id: debt.company_id,
      })
    }

    return {
      success: result.success,
      message: result.success
        ? `Notificação enviada com sucesso via ${type.toUpperCase()}`
        : `Erro ao enviar notificação: ${result.error}`,
      error: result.error,
    }
  } catch (error) {
    console.error("[v0] Send notification error:", error)
    return {
      success: false,
      message: "Erro ao enviar notificação",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
