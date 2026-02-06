"use server"

// v4 - imports from refactored asaas module
import { createAdminClient } from "@/lib/supabase/server"
import {
  createAsaasPayment,
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
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

    // Buscar acordo
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

    // 1. Atualizar dados de contato do cliente no Asaas com dados da VMAX
    const updateData: any = { notificationDisabled: false }
    if (contactInfo.email) updateData.email = contactInfo.email
    if (contactInfo.phone) {
      const cleanPhone = contactInfo.phone.replace(/[^\d]/g, "")
      updateData.mobilePhone = cleanPhone
    }
    await updateAsaasCustomer(asaasCustomerId, updateData)

    // 2. Configurar notificacoes: habilitar SOMENTE PAYMENT_CREATED no canal escolhido
    const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)

    for (const notif of allNotifications) {
      if (notif.event === "PAYMENT_CREATED") {
        // Habilitar SOMENTE no canal escolhido
        await updateAsaasNotification(notif.id, {
          enabled: true,
          emailEnabledForCustomer: channel === "email",
          smsEnabledForCustomer: channel === "sms",
          whatsappEnabledForCustomer: channel === "whatsapp",
        })
      } else {
        // Desabilitar todos os outros eventos
        await updateAsaasNotification(notif.id, {
          enabled: false,
          emailEnabledForCustomer: false,
          smsEnabledForCustomer: false,
          whatsappEnabledForCustomer: false,
        })
      }
    }

    // 3. AGORA criar a cobranca no Asaas - isso vai disparar a notificacao automaticamente
    const customerName = contactInfo.customerName || "Cliente"
    const installmentAmount = agreement.installment_amount || agreement.agreed_amount
    const installments = agreement.installments || 1

    const asaasPayment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: "UNDEFINED",
      value: installments > 1 ? installmentAmount : agreement.agreed_amount,
      dueDate: agreement.due_date,
      description: `Acordo de negociacao - ${customerName}${
        installments > 1 ? ` (Parcela 1/${installments})` : ""
      }`,
      externalReference: `agreement_${agreementId}`,
      postalService: false,
      ...(installments > 1 && {
        installmentCount: installments,
        installmentValue: installmentAmount,
      }),
    })

    // 4. Atualizar o acordo com os dados da cobranca
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

    // 5. Desabilitar notificacoes do cliente novamente para nao enviar automaticamente no futuro
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })

    // 6. Desabilitar PAYMENT_CREATED que habilitamos
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
