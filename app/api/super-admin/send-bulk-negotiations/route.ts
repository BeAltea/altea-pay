import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  getAsaasCustomerByCpfCnpj,
  createAsaasCustomer,
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
  createAsaasPayment,
  resendAsaasPaymentNotification,
} from "@/lib/asaas"

// Allow up to 120 seconds for large batches (50+ negotiations)
export const maxDuration = 120

interface SendBulkNegotiationsParams {
  companyId: string
  customerIds: string[]
  discountType: "none" | "percentage" | "fixed"
  discountValue: number
  paymentMethods: string[]
  notificationChannels: string[]
}

interface NegotiationResult {
  vmaxId: string
  customerName: string
  cpfCnpj: string
  status: "success" | "failed"
  error?: string
  asaasCustomerId?: string
  asaasPaymentId?: string
  paymentUrl?: string
}

// Process a single negotiation - extracted for parallel execution
async function processSingleNegotiation(
  vmaxId: string,
  params: SendBulkNegotiationsParams,
  userId: string,
  attendantName: string,
  supabase: any
): Promise<NegotiationResult> {
  // Get VMAX record
  const { data: vmax, error: vmaxError } = await supabase
    .from("VMAX")
    .select("*")
    .eq("id", vmaxId)
    .single()

  if (vmaxError || !vmax) {
    return {
      vmaxId,
      customerName: "Desconhecido",
      cpfCnpj: "",
      status: "failed",
      error: "Registro VMAX não encontrado",
    }
  }

  const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
  const customerName = vmax.Cliente || "Cliente"

  if (!cpfCnpj) {
    return {
      vmaxId,
      customerName,
      cpfCnpj: "",
      status: "failed",
      error: "CPF/CNPJ não cadastrado",
    }
  }

  // Get contact info
  let customerPhone = (vmax["Telefone 1"] || vmax["Telefone 2"] || vmax["Telefone"] || "").replace(/\D/g, "")
  let customerEmail = vmax.Email || ""

  const { data: existingCustomerData } = await supabase
    .from("customers")
    .select("phone, email")
    .eq("document", cpfCnpj)
    .eq("company_id", params.companyId)
    .maybeSingle()

  if (existingCustomerData) {
    if (existingCustomerData.phone) customerPhone = existingCustomerData.phone.replace(/\D/g, "")
    if (existingCustomerData.email) customerEmail = existingCustomerData.email
  }

  // Parse debt value
  const vencidoStr = String(vmax.Vencido || "0")
  const originalAmount =
    Number(
      vencidoStr
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0

  if (originalAmount <= 0) {
    return {
      vmaxId,
      customerName,
      cpfCnpj,
      status: "failed",
      error: "Dívida com valor zero",
    }
  }

  // Calculate discount
  let discountAmount = 0
  if (params.discountType === "percentage" && params.discountValue > 0) {
    discountAmount = (originalAmount * params.discountValue) / 100
  } else if (params.discountType === "fixed" && params.discountValue > 0) {
    discountAmount = Math.min(params.discountValue, originalAmount)
  }

  const agreedAmount = originalAmount - discountAmount
  const discountPercentage = originalAmount > 0 ? (discountAmount / originalAmount) * 100 : 0

  try {
    // Create or get customer in DB
    let customerId: string

    const { data: existingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("document", cpfCnpj)
      .eq("company_id", params.companyId)
      .limit(1)

    const existingCustomer = existingCustomers?.[0] || null

    if (existingCustomer) {
      customerId = existingCustomer.id
      await supabase
        .from("customers")
        .update({ name: customerName, phone: customerPhone, email: customerEmail })
        .eq("id", existingCustomer.id)
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName,
          document: cpfCnpj,
          document_type: cpfCnpj.length === 11 ? "CPF" : "CNPJ",
          phone: customerPhone,
          email: customerEmail,
          company_id: params.companyId,
          source_system: "VMAX",
          external_id: vmaxId,
        })
        .select("id")
        .single()

      if (customerError || !newCustomer) {
        return {
          vmaxId,
          customerName,
          cpfCnpj,
          status: "failed",
          error: `Erro ao criar cliente: ${customerError?.message}`,
        }
      }
      customerId = newCustomer.id
    }

    // Create or get debt
    let debtId: string

    const { data: existingDebts } = await supabase
      .from("debts")
      .select("id")
      .eq("customer_id", customerId)
      .eq("company_id", params.companyId)
      .order("created_at", { ascending: false })
      .limit(1)

    const existingDebt = existingDebts?.[0] || null

    if (existingDebt) {
      debtId = existingDebt.id
      await supabase
        .from("debts")
        .update({ amount: originalAmount, status: "in_negotiation" })
        .eq("id", existingDebt.id)
    } else {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const { data: newDebt, error: debtError } = await supabase
        .from("debts")
        .insert({
          customer_id: customerId,
          company_id: params.companyId,
          amount: originalAmount,
          due_date: dueDate.toISOString().split("T")[0],
          description: `Dívida de ${customerName}`,
          status: "in_negotiation",
          source_system: "VMAX",
          external_id: vmaxId,
        })
        .select("id")
        .single()

      if (debtError || !newDebt) {
        return {
          vmaxId,
          customerName,
          cpfCnpj,
          status: "failed",
          error: `Erro ao criar dívida: ${debtError?.message}`,
        }
      }
      debtId = newDebt.id
    }

    // === ASAAS INTEGRATION ===
    let asaasCustomerId: string | null = null
    try {
      // Try to get existing ASAAS customer first
      const existingAsaas = await getAsaasCustomerByCpfCnpj(cpfCnpj)
      if (existingAsaas) {
        asaasCustomerId = existingAsaas.id
        await updateAsaasCustomer(asaasCustomerId, {
          mobilePhone: customerPhone || undefined,
          notificationDisabled: false,
        })
      } else {
        // Create new ASAAS customer
        const newAsaas = await createAsaasCustomer({
          name: customerName,
          cpfCnpj,
          mobilePhone: customerPhone || undefined,
          notificationDisabled: false,
        })
        asaasCustomerId = newAsaas.id
      }

      // Configure notifications
      try {
        const allNotifs = await getAsaasCustomerNotifications(asaasCustomerId)
        const paymentCreatedNotif = allNotifs.find((n: any) => n.event === "PAYMENT_CREATED")
        if (paymentCreatedNotif) {
          const enableWhatsApp = params.notificationChannels.includes("whatsapp")
          await updateAsaasNotification(paymentCreatedNotif.id, {
            enabled: enableWhatsApp,
            emailEnabledForCustomer: false,
            smsEnabledForCustomer: false,
            whatsappEnabledForCustomer: enableWhatsApp,
          })
        }
      } catch (notifErr: any) {
        console.warn(`[ASAAS] Notification config failed for ${customerName}:`, notifErr.message)
      }
    } catch (asaasErr: any) {
      return {
        vmaxId,
        customerName,
        cpfCnpj,
        status: "failed",
        error: `Erro ASAAS cliente: ${asaasErr.message}`,
      }
    }

    // Create agreement in DB
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .insert({
        debt_id: debtId,
        customer_id: customerId,
        user_id: userId,
        company_id: params.companyId,
        original_amount: originalAmount,
        agreed_amount: agreedAmount,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        installments: 1,
        installment_amount: agreedAmount,
        due_date: dueDateStr,
        status: "draft",
        payment_status: "pending",
        attendant_name: attendantName,
        asaas_customer_id: asaasCustomerId,
        terms: JSON.stringify({
          payment_methods: params.paymentMethods,
          notification_channels: params.notificationChannels,
          discount_type: params.discountType,
          discount_value: params.discountValue,
        }),
      })
      .select()
      .single()

    if (agreementError || !agreement) {
      return {
        vmaxId,
        customerName,
        cpfCnpj,
        status: "failed",
        error: `Erro ao criar acordo: ${agreementError?.message}`,
        asaasCustomerId: asaasCustomerId || undefined,
      }
    }

    // Create ASAAS payment
    let asaasPaymentId: string | null = null
    let paymentUrl: string | null = null
    try {
      let billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED" = "UNDEFINED"
      const methodMapping: Record<string, "BOLETO" | "CREDIT_CARD" | "PIX"> = {
        boleto: "BOLETO",
        pix: "PIX",
        credit_card: "CREDIT_CARD",
      }
      if (params.paymentMethods.length === 1 && methodMapping[params.paymentMethods[0]]) {
        billingType = methodMapping[params.paymentMethods[0]]
      }

      const asaasPayment = await createAsaasPayment({
        customer: asaasCustomerId,
        billingType,
        value: agreedAmount,
        dueDate: dueDateStr,
        description: `Acordo de negociação - ${customerName}`,
        externalReference: `agreement_${agreement.id}`,
        postalService: false,
      })

      asaasPaymentId = asaasPayment.id
      paymentUrl = asaasPayment.invoiceUrl || null

      // Update agreement with ASAAS payment info
      await supabase
        .from("agreements")
        .update({
          asaas_payment_id: asaasPayment.id,
          asaas_payment_url: asaasPayment.invoiceUrl || null,
          asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl || null,
          asaas_boleto_url: asaasPayment.bankSlipUrl || null,
          status: "active",
        })
        .eq("id", agreement.id)
    } catch (asaasPaymentErr: any) {
      // Delete the draft agreement since payment failed
      await supabase.from("agreements").delete().eq("id", agreement.id)
      return {
        vmaxId,
        customerName,
        cpfCnpj,
        status: "failed",
        error: `Erro ASAAS cobrança: ${asaasPaymentErr.message}`,
        asaasCustomerId: asaasCustomerId || undefined,
      }
    }

    // Update VMAX negotiation status - ONLY AFTER ASAAS CONFIRMS
    await supabase
      .from("VMAX")
      .update({ negotiation_status: "sent" })
      .eq("id", vmaxId)

    // Record collection action
    for (const channel of params.notificationChannels) {
      await supabase.from("collection_actions").insert({
        company_id: params.companyId,
        customer_id: customerId,
        debt_id: debtId,
        action_type: channel,
        status: "sent",
        sent_by: userId,
        sent_at: new Date().toISOString(),
        message: `Negociação enviada via ${channel}. Valor: R$ ${agreedAmount.toFixed(2)}`,
        metadata: {
          payment_methods: params.paymentMethods,
          notification_channels: params.notificationChannels,
          discount_type: params.discountType,
          discount_value: params.discountValue,
          original_amount: originalAmount,
          agreed_amount: agreedAmount,
        },
      })
    }

    // Send notifications in background (don't block the result)
    sendNotificationsInBackground(
      params,
      customerName,
      customerEmail,
      customerPhone,
      agreedAmount,
      agreement.id,
      asaasCustomerId,
      supabase
    )

    return {
      vmaxId,
      customerName,
      cpfCnpj,
      status: "success",
      asaasCustomerId: asaasCustomerId || undefined,
      asaasPaymentId: asaasPaymentId || undefined,
      paymentUrl: paymentUrl || undefined,
    }
  } catch (error: any) {
    return {
      vmaxId,
      customerName,
      cpfCnpj,
      status: "failed",
      error: error.message || "Erro desconhecido",
    }
  }
}

// Send notifications without blocking the main flow
async function sendNotificationsInBackground(
  params: SendBulkNegotiationsParams,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  agreedAmount: number,
  agreementId: string,
  asaasCustomerId: string | null,
  supabase: any
) {
  try {
    // Get agreement data
    const { data: agreementData } = await supabase
      .from("agreements")
      .select("asaas_payment_url, asaas_payment_id, due_date")
      .eq("id", agreementId)
      .single()

    const paymentUrl = agreementData?.asaas_payment_url || ""
    const dueDate = agreementData?.due_date
      ? new Date(agreementData.due_date).toLocaleDateString("pt-BR")
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")

    // Get company name
    const { data: companyData } = await supabase
      .from("companies")
      .select("name")
      .eq("id", params.companyId)
      .single()
    const companyName = companyData?.name || "Empresa"

    // Send SMS if selected
    if (params.notificationChannels.includes("sms") && customerPhone) {
      try {
        const { sendSMS, generateDebtCollectionSMS } = await import("@/lib/notifications/sms")
        let formattedPhone = customerPhone.replace(/\D/g, "")
        if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
          formattedPhone = "55" + formattedPhone
        }
        formattedPhone = "+" + formattedPhone
        const smsBody = await generateDebtCollectionSMS({
          customerName,
          debtAmount: agreedAmount,
          companyName,
          paymentLink: paymentUrl,
        })
        await sendSMS({ to: formattedPhone, body: smsBody })
      } catch (smsErr: any) {
        console.error(`[Notifications] SMS failed for ${customerName}:`, smsErr.message)
      }
    }

    // Send WhatsApp if selected
    if (params.notificationChannels.includes("whatsapp") && customerPhone && asaasCustomerId) {
      try {
        const allNotifs = await getAsaasCustomerNotifications(asaasCustomerId)
        const paymentCreatedNotif = allNotifs.find((n: any) => n.event === "PAYMENT_CREATED")
        if (paymentCreatedNotif) {
          await updateAsaasNotification(paymentCreatedNotif.id, {
            enabled: true,
            emailEnabledForCustomer: false,
            smsEnabledForCustomer: false,
            whatsappEnabledForCustomer: true,
          })
        }
        if (agreementData?.asaas_payment_id) {
          await resendAsaasPaymentNotification(agreementData.asaas_payment_id)
        }
      } catch (whatsappErr: any) {
        console.error(`[Notifications] WhatsApp failed for ${customerName}:`, whatsappErr.message)
      }
    }

    // Send email if customer has email
    if (customerEmail) {
      try {
        const { sendEmail, generateDebtCollectionEmail } = await import("@/lib/notifications/email")
        const emailHtml = await generateDebtCollectionEmail({
          customerName,
          debtAmount: agreedAmount,
          dueDate,
          companyName,
          paymentLink: paymentUrl,
        })
        await sendEmail({
          to: customerEmail,
          subject: `Proposta de Negociação - ${companyName}`,
          html: emailHtml,
        })
      } catch (emailErr: any) {
        console.error(`[Notifications] Email failed for ${customerName}:`, emailErr.message)
      }
    }
  } catch (err: any) {
    console.error(`[Notifications] Background notifications failed:`, err.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const params: SendBulkNegotiationsParams = await request.json()

    // Verify user is super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Não autenticado", sent: 0, results: [] }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Sem permissão", sent: 0, results: [] }, { status: 403 })
    }

    const supabase = createAdminClient()
    const allResults: NegotiationResult[] = []

    // Process in PARALLEL CHUNKS to avoid timeout
    // ASAAS has stricter rate limits, so use smaller chunks (5 at a time)
    const CHUNK_SIZE = 5
    const totalChunks = Math.ceil(params.customerIds.length / CHUNK_SIZE)

    console.log(`[sendBulkNegotiations] Processing ${params.customerIds.length} negotiations in ${totalChunks} chunks of ${CHUNK_SIZE}`)

    for (let i = 0; i < params.customerIds.length; i += CHUNK_SIZE) {
      const chunk = params.customerIds.slice(i, i + CHUNK_SIZE)
      const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1

      console.log(`[sendBulkNegotiations] Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} negotiations)`)

      // Process chunk in PARALLEL
      const chunkResults = await Promise.allSettled(
        chunk.map((vmaxId) =>
          processSingleNegotiation(
            vmaxId,
            params,
            user.id,
            profile.full_name || "Super Admin",
            supabase
          )
        )
      )

      // Collect results
      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j]
        if (result.status === "fulfilled") {
          allResults.push(result.value)
        } else {
          // Promise rejected (shouldn't happen with our try/catch, but handle it)
          allResults.push({
            vmaxId: chunk[j],
            customerName: "Erro",
            cpfCnpj: "",
            status: "failed",
            error: result.reason?.message || "Erro inesperado",
          })
        }
      }

      const successCount = allResults.filter((r) => r.status === "success").length
      const failedCount = allResults.filter((r) => r.status === "failed").length
      console.log(`[sendBulkNegotiations] Chunk ${chunkNumber} done. Total so far: ${successCount} success, ${failedCount} failed`)
    }

    const sentCount = allResults.filter((r) => r.status === "success").length
    const failedCount = allResults.filter((r) => r.status === "failed").length
    const errors = allResults.filter((r) => r.status === "failed").map((r) => `${r.customerName}: ${r.error}`)

    console.log(`[sendBulkNegotiations] FINAL: ${sentCount} sent, ${failedCount} failed out of ${params.customerIds.length}`)

    revalidatePath("/super-admin/negotiations")
    revalidatePath("/super-admin/companies")

    // Group errors by type for summary
    const errorSummary: Record<string, number> = {}
    for (const result of allResults) {
      if (result.status === "failed" && result.error) {
        const errorType = result.error.split(":")[0] || result.error
        errorSummary[errorType] = (errorSummary[errorType] || 0) + 1
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      sent: sentCount,
      failed: failedCount,
      total: params.customerIds.length,
      results: allResults,
      errors: errors.length > 0 ? errors : undefined,
      errorSummary: Object.keys(errorSummary).length > 0 ? errorSummary : undefined,
    })
  } catch (error: any) {
    console.error("Error in sendBulkNegotiations API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro desconhecido",
        sent: 0,
        results: [],
      },
      { status: 500 }
    )
  }
}
