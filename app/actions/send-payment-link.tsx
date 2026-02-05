"use server"

import { createAdminClient } from "@/lib/supabase/server"
import {
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
  resendAsaasPaymentNotification,
} from "@/lib/asaas"

export async function sendPaymentLink(
  agreementId: string,
  channel: "email" | "sms" | "whatsapp",
  contactInfo: {
    email?: string
    phone?: string
    customerName?: string
  }
) {
  try {
    const supabase = createAdminClient()

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .single()

    if (agreementError || !agreement) {
      return { success: false, error: "Acordo nao encontrado" }
    }

    const asaasPaymentId = agreement.asaas_payment_id
    const asaasCustomerId = agreement.asaas_customer_id

    if (!asaasPaymentId || !asaasCustomerId) {
      return {
        success: false,
        error: "Cobranca Asaas nao encontrada neste acordo.",
      }
    }

    // 1. Atualizar dados de contato do cliente no Asaas com dados da VMAX
    if (channel === "email" && contactInfo.email) {
      await updateAsaasCustomer(asaasCustomerId, {
        email: contactInfo.email,
      })
    }
    if ((channel === "sms" || channel === "whatsapp") && contactInfo.phone) {
      const cleanPhone = contactInfo.phone.replace(/[^\d]/g, "")
      await updateAsaasCustomer(asaasCustomerId, {
        mobilePhone: cleanPhone,
      })
    }

    // 2. Buscar TODAS as notificacoes do cliente
    const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)

    // 3. DESABILITAR TODAS as notificacoes de TODOS os eventos primeiro
    for (const notif of allNotifications) {
      await updateAsaasNotification(notif.id, {
        enabled: false,
        emailEnabledForCustomer: false,
        smsEnabledForCustomer: false,
        whatsappEnabledForCustomer: false,
      })
    }

    // 4. Habilitar SOMENTE o evento PAYMENT_CREATED no canal escolhido
    const paymentCreatedNotif = allNotifications.find(
      (n: any) => n.event === "PAYMENT_CREATED"
    )

    if (paymentCreatedNotif) {
      await updateAsaasNotification(paymentCreatedNotif.id, {
        enabled: true,
        emailEnabledForCustomer: channel === "email",
        smsEnabledForCustomer: channel === "sms",
        whatsappEnabledForCustomer: channel === "whatsapp",
      })
    }

    // 5. Habilitar notificacoes no cliente temporariamente
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: false })

    // 6. Disparar o reenvio da notificacao da cobranca
    await resendAsaasPaymentNotification(asaasPaymentId)

    // 7. Desabilitar notificacoes no cliente novamente
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })

    // 8. Desabilitar a notificacao PAYMENT_CREATED que habilitamos
    if (paymentCreatedNotif) {
      await updateAsaasNotification(paymentCreatedNotif.id, {
        enabled: false,
        emailEnabledForCustomer: false,
        smsEnabledForCustomer: false,
        whatsappEnabledForCustomer: false,
      })
    }

    const channelLabel =
      channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "SMS"

    return {
      success: true,
      data: {
        channel,
        paymentUrl: agreement.asaas_payment_url,
        message: `Notificacao enviada com sucesso via ${channelLabel}.`,
      },
    }
  } catch (error: any) {
    console.error("Error in sendPaymentLink:", error)
    return { success: false, error: error.message || "Erro ao enviar proposta" }
  }
}
