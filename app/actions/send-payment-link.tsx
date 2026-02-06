"use server"

import { createAdminClient } from "@/lib/supabase/server"

// Inline Asaas API calls - no external module dependency
const ASAAS_URL = "https://api.asaas.com/v3"

async function asaasRequest(endpoint: string, method = "GET", body?: any) {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error("ASAAS_API_KEY nao configurada")

  const res = await fetch(`${ASAAS_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": key,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.description || `Asaas error ${res.status}`)
  }
  return data
}

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
    const updateData: any = { notificationDisabled: false }
    if (contactInfo.email) updateData.email = contactInfo.email
    if (contactInfo.phone) {
      updateData.mobilePhone = contactInfo.phone.replace(/[^\d]/g, "")
    }
    await asaasRequest(`/customers/${asaasCustomerId}`, "PUT", updateData)

    // 2. Configure notifications
    const notifData = await asaasRequest(`/customers/${asaasCustomerId}/notifications`)
    const allNotifications = notifData.data || []

    for (const notif of allNotifications) {
      if (notif.event === "PAYMENT_CREATED") {
        await asaasRequest(`/notifications/${notif.id}`, "PUT", {
          enabled: true,
          emailEnabledForCustomer: channel === "email",
          smsEnabledForCustomer: channel === "sms",
          whatsappEnabledForCustomer: channel === "whatsapp",
        })
      } else {
        await asaasRequest(`/notifications/${notif.id}`, "PUT", {
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
      billingType: "UNDEFINED",
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

    const asaasPayment = await asaasRequest("/payments", "POST", paymentParams)

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
    await asaasRequest(`/customers/${asaasCustomerId}`, "PUT", { notificationDisabled: true })

    const paymentCreatedNotif = allNotifications.find((n: any) => n.event === "PAYMENT_CREATED")
    if (paymentCreatedNotif) {
      await asaasRequest(`/notifications/${paymentCreatedNotif.id}`, "PUT", {
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
