"use server"

import { createAdminClient } from "@/lib/supabase/server"
import {
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
  createAsaasPayment,
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

    const asaasCustomerId = agreement.asaas_customer_id
    if (!asaasCustomerId) {
      return { success: false, error: "Cliente Asaas nao encontrado neste acordo." }
    }

    // 1. Update contact info
    const updateData: { notificationDisabled: boolean; email?: string; mobilePhone?: string } = { notificationDisabled: false }
    if (contactInfo.email) updateData.email = contactInfo.email
    if (contactInfo.phone) {
      updateData.mobilePhone = contactInfo.phone.replace(/[^\d]/g, "")
    }
    await updateAsaasCustomer(asaasCustomerId, updateData)

    // 2. Configure notifications
    const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)

    for (const notif of allNotifications) {
      if (notif.event === "PAYMENT_CREATED") {
        await updateAsaasNotification(notif.id, {
          enabled: true,
          emailEnabledForCustomer: channel === "email",
          smsEnabledForCustomer: channel === "sms",
          whatsappEnabledForCustomer: channel === "whatsapp",
        })
      } else {
        await updateAsaasNotification(notif.id, {
          enabled: false,
          emailEnabledForCustomer: false,
          smsEnabledForCustomer: false,
          whatsappEnabledForCustomer: false,
        })
      }
    }

    // 3. Create payment
    const customerName = contactInfo.customerName || "Cliente"
    const installmentAmount = agreement.installment_amount || agreement.agreed_amount
    const installments = agreement.installments || 1

    const paymentParams: any = {
      customer: asaasCustomerId,
      billingType: "UNDEFINED" as const,
      value: installments > 1 ? installmentAmount : agreement.agreed_amount,
      dueDate: agreement.due_date,
      description: `Acordo de negociacao - ${customerName}${installments > 1 ? ` (Parcela 1/${installments})` : ""}`,
      externalReference: `agreement_${agreementId}`,
      postalService: false,
    }

    if (installments > 1) {
      paymentParams.installmentCount = installments
      paymentParams.installmentValue = installmentAmount
    }

    const asaasPayment = await createAsaasPayment(paymentParams)

    // 4. Update agreement
    await supabase
      .from("agreements")
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_payment_url: asaasPayment.invoiceUrl || null,
        asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl || null,
        asaas_boleto_url: asaasPayment.bankSlipUrl || null,
        status: "active",
      })
      .eq("id", agreementId)

    // 5. Disable notifications again
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })

    const paymentCreatedNotif = allNotifications.find((n: any) => n.event === "PAYMENT_CREATED")
    if (paymentCreatedNotif) {
      await updateAsaasNotification(paymentCreatedNotif.id, {
        enabled: false,
        emailEnabledForCustomer: false,
        smsEnabledForCustomer: false,
        whatsappEnabledForCustomer: false,
      })
    }

    const channelLabel = channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "SMS"

    return {
      success: true,
      data: {
        channel,
        paymentUrl: asaasPayment.invoiceUrl,
        message: `Cobranca criada e notificacao enviada via ${channelLabel}.`,
      },
    }
  } catch (error: any) {
    console.error("Error in sendPaymentLink:", error)
    return { success: false, error: error.message || "Erro ao enviar proposta" }
  }
}
