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

    // Buscar agreement para pegar o asaas_payment_id e asaas_customer_id
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

    // 1. Atualizar dados de contato do cliente no Asaas com os dados da VMAX
    const updateData: any = { notificationDisabled: false }
    if (channel === "email" && contactInfo.email) {
      updateData.email = contactInfo.email
    }
    if ((channel === "sms" || channel === "whatsapp") && contactInfo.phone) {
      const cleanPhone = contactInfo.phone.replace(/[^\d]/g, "")
      updateData.mobilePhone = cleanPhone
    }
    await updateAsaasCustomer(asaasCustomerId, updateData)

    // 2. Configurar notificacoes do cliente no Asaas para o canal escolhido
    const notifications = await getAsaasCustomerNotifications(asaasCustomerId)
    
    // Habilitar PAYMENT_CREATED para o canal escolhido
    const paymentCreatedNotif = notifications.find(
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

    // 3. Reenviar notificacao da cobranca pelo Asaas
    await resendAsaasPaymentNotification(asaasPaymentId)

    // 4. Desabilitar notificacoes novamente para evitar envios automaticos futuros
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })

    const channelLabel = channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "SMS"

    return {
      success: true,
      data: {
        channel,
        paymentUrl: agreement.asaas_payment_url,
        message: `Notificacao enviada com sucesso via ${channelLabel} pelo Asaas.`,
      },
    }
  } catch (error: any) {
    console.error("Error in sendPaymentLink:", error)
    return { success: false, error: error.message || "Erro ao enviar proposta" }
  }
}
