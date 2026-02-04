"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { vmax, collectionActions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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
 * Called from Admin Dashboard "Enviar Cobranca Manual" button
 */
export async function sendCollectionNotification({
  debtId,
  type,
}: SendNotificationParams): Promise<SendNotificationResult> {
  try {
    const session = await auth()
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: "Usuario nao autenticado",
      }
    }

    const [vmaxRecord] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.id, debtId))
      .limit(1)

    if (!vmaxRecord) {
      console.error("[v0] VMAX record not found")
      return {
        success: false,
        message: "Registro de divida nao encontrado",
      }
    }

    const metadata = vmaxRecord.analysisMetadata as any

    console.log("[v0] VMAX record found:", {
      id: vmaxRecord.id,
      cliente: vmaxRecord.cliente,
      idCompany: vmaxRecord.idCompany,
    })

    const customerName = vmaxRecord.cliente || "Cliente"
    const companyName = metadata?.Empresa || "Empresa"
    const debtAmount = metadata?.Vencido || "0"
    const customerEmail = metadata?.Email
    const customerPhone = metadata?.["Telefone 1"] || metadata?.["Telefone 2"]

    if (type === "email") {
      if (!customerEmail) {
        return {
          success: false,
          message: `Cliente ${customerName} nao possui e-mail cadastrado na VMAX. Adicione o e-mail primeiro.`,
        }
      }
    }

    if (type === "sms" || type === "whatsapp") {
      if (!customerPhone) {
        return {
          success: false,
          message: `Cliente ${customerName} nao possui telefone cadastrado na VMAX. Adicione o telefone primeiro.`,
        }
      }
    }

    const parsedAmount =
      typeof debtAmount === "string"
        ? Number.parseFloat(debtAmount.replace(/[R$\s.]/g, "").replace(",", "."))
        : debtAmount

    let result: { success: boolean; messageId?: string; error?: string }
    let messageContent = ""

    if (type === "email") {
      const html = await generateDebtCollectionEmail({
        customerName,
        debtAmount: parsedAmount,
        dueDate: metadata?.Vecto
          ? new Date(metadata.Vecto).toLocaleDateString("pt-BR")
          : "Vencida",
        companyName,
        paymentLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://alteapay.com"}/user-dashboard/debts/${debtId}`,
      })

      messageContent = `Email de cobranca enviado para ${customerEmail}`

      result = await sendEmail({
        to: customerEmail,
        subject: `Cobranca Pendente - ${companyName}`,
        html,
      })
    } else if (type === "sms" || type === "whatsapp") {
      const body = await generateDebtCollectionSMS({
        customerName,
        debtAmount: parsedAmount,
        companyName,
        paymentLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://alteapay.com"}/user-dashboard`,
      })

      messageContent = body

      result = await sendSMS({
        to: customerPhone,
        body,
      })
    } else {
      return {
        success: false,
        message: "Tipo de notificacao invalido",
      }
    }

    if (result.success) {
      try {
        await db.insert(collectionActions).values({
          companyId: vmaxRecord.idCompany,
          customerId: null,
          actionType: type,
          status: "sent",
          message: messageContent,
          metadata: {
            customer_name: customerName,
            contact: type === "email" ? customerEmail : customerPhone,
            amount: parsedAmount,
            message_id: result.messageId,
            sent_by: user.id,
            debt_id: debtId,
          },
        })

        console.log("[v0] Collection action logged successfully")
      } catch (insertError) {
        console.warn("[v0] Failed to log collection action:", insertError)
      }

      console.log("[v0] Notification sent successfully:", {
        type,
        customer: customerName,
        contact: type === "email" ? customerEmail : customerPhone,
        messageId: result.messageId,
      })
    }

    return {
      success: result.success,
      message: result.success
        ? `Cobranca enviada com sucesso via ${type.toUpperCase()} para ${customerName}`
        : `Erro ao enviar: ${result.error}`,
      error: result.error,
    }
  } catch (error) {
    console.error("[v0] Send notification error:", error)
    return {
      success: false,
      message: "Erro ao enviar notificacao",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
