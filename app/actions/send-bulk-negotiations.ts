"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  getAsaasCustomerByCpfCnpj,
  createAsaasCustomer,
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
  createAsaasPayment,
} from "@/lib/asaas"

interface SendBulkNegotiationsParams {
  companyId: string
  customerIds: string[]
  discountType: "none" | "percentage" | "fixed"
  discountValue: number
  paymentMethods: string[]
  notificationChannels: string[]
}

export async function sendBulkNegotiations(params: SendBulkNegotiationsParams) {
  try {
    // Verify user is super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nao autenticado", sent: 0 }
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Sem permissao", sent: 0 }
    }

    const supabase = createAdminClient()
    let sentCount = 0
    const errors: string[] = []

    // Determine notification channel (use first selected channel)
    const primaryChannel = params.notificationChannels[0] as "email" | "sms" | "whatsapp" || "email"

    for (const vmaxId of params.customerIds) {
      try {
        // Get VMAX record
        const { data: vmax, error: vmaxError } = await supabase
          .from("VMAX")
          .select("*")
          .eq("id", vmaxId)
          .single()

        if (vmaxError || !vmax) {
          errors.push(`Cliente ${vmaxId}: registro nao encontrado`)
          continue
        }

        const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
        const customerName = vmax.Cliente || "Cliente"
        const customerPhone = (vmax["Telefone 1"] || vmax["Telefone 2"] || "").replace(/\D/g, "")
        const customerEmail = vmax.Email || ""

        if (!cpfCnpj) {
          errors.push(`${customerName}: sem CPF/CNPJ cadastrado`)
          continue
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
          errors.push(`${customerName}: divida com valor zero`)
          continue
        }

        // Calculate discount
        let discountAmount = 0
        if (params.discountType === "percentage" && params.discountValue > 0) {
          discountAmount = (originalAmount * params.discountValue) / 100
        } else if (params.discountType === "fixed" && params.discountValue > 0) {
          discountAmount = Math.min(params.discountValue, originalAmount)
        }

        const agreedAmount = originalAmount - discountAmount
        const discountPercentage =
          originalAmount > 0 ? (discountAmount / originalAmount) * 100 : 0

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
            .update({
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
            })
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
            errors.push(`${customerName}: erro ao criar cliente - ${customerError?.message}`)
            continue
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
              description: `Divida de ${customerName}`,
              status: "in_negotiation",
              source_system: "VMAX",
              external_id: vmaxId,
            })
            .select("id")
            .single()

          if (debtError || !newDebt) {
            errors.push(`${customerName}: erro ao criar divida - ${debtError?.message}`)
            continue
          }
          debtId = newDebt.id
        }

        // ====== ASAAS INTEGRATION (same as sendPaymentLink) ======

        // 1. Create or find Asaas customer
        let asaasCustomerId: string | null = null
        try {
          const existingAsaas = await getAsaasCustomerByCpfCnpj(cpfCnpj)
          if (existingAsaas) {
            asaasCustomerId = existingAsaas.id
            await updateAsaasCustomer(asaasCustomerId, {
              email: customerEmail || undefined,
              mobilePhone: customerPhone || undefined,
              notificationDisabled: true,
            })
          } else {
            const newAsaas = await createAsaasCustomer({
              name: customerName,
              cpfCnpj,
              email: customerEmail || undefined,
              mobilePhone: customerPhone || undefined,
              notificationDisabled: true,
            })
            asaasCustomerId = newAsaas.id
          }
        } catch (asaasErr: any) {
          errors.push(`${customerName}: erro Asaas cliente - ${asaasErr.message}`)
          continue
        }

        // 2. Create agreement in DB
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        const dueDateStr = dueDate.toISOString().split("T")[0]

        const { data: agreement, error: agreementError } = await supabase
          .from("agreements")
          .insert({
            debt_id: debtId,
            customer_id: customerId,
            user_id: user.id,
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
            attendant_name: profile.full_name || "Super Admin",
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
          errors.push(`${customerName}: erro ao criar acordo - ${agreementError?.message}`)
          continue
        }

        // 3. Enable notification for the selected channel, then create payment
        try {
          // Update Asaas customer contact info and enable notifications
          const updateData: { notificationDisabled: boolean; email?: string; mobilePhone?: string } = { notificationDisabled: false }
          if (customerEmail) updateData.email = customerEmail
          if (customerPhone) updateData.mobilePhone = customerPhone.replace(/[^\d]/g, "")
          await updateAsaasCustomer(asaasCustomerId, updateData)

          // Configure notifications - enable only PAYMENT_CREATED for the right channel
          const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)

          for (const notif of allNotifications) {
            if (notif.event === "PAYMENT_CREATED") {
              await updateAsaasNotification(notif.id, {
                enabled: true,
                emailEnabledForCustomer: params.notificationChannels.includes("email"),
                smsEnabledForCustomer: params.notificationChannels.includes("sms"),
                whatsappEnabledForCustomer: params.notificationChannels.includes("whatsapp"),
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

          // 4. Create Asaas payment
          const paymentParams: any = {
            customer: asaasCustomerId,
            billingType: "UNDEFINED" as const,
            value: agreedAmount,
            dueDate: dueDateStr,
            description: `Acordo de negociacao - ${customerName}`,
            externalReference: `agreement_${agreement.id}`,
            postalService: false,
          }

          const asaasPayment = await createAsaasPayment(paymentParams)

          // 5. Update agreement with Asaas payment info
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

          // 6. Disable notifications again
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
        } catch (asaasPaymentErr: any) {
          errors.push(`${customerName}: erro ao criar cobranca Asaas - ${asaasPaymentErr.message}`)
          // Delete the draft agreement since payment failed
          await supabase.from("agreements").delete().eq("id", agreement.id)
          continue
        }

        // Update VMAX negotiation status
        await supabase
          .from("VMAX")
          .update({ negotiation_status: "sent" })
          .eq("id", vmaxId)

        // Record collection action for each notification channel
        for (const channel of params.notificationChannels) {
          await supabase.from("collection_actions").insert({
            company_id: params.companyId,
            customer_id: customerId,
            debt_id: debtId,
            action_type: channel,
            status: "sent",
            sent_by: user.id,
            sent_at: new Date().toISOString(),
            message: `Negociacao enviada via ${channel}. Valor original: R$ ${originalAmount.toFixed(2)}, Valor acordado: R$ ${agreedAmount.toFixed(2)}. Metodos de pagamento: ${params.paymentMethods.join(", ")}`,
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

        sentCount++
      } catch (innerError: any) {
        console.error(`[sendBulkNegotiations] Erro inesperado para vmaxId ${vmaxId}:`, innerError)
        errors.push(`Erro inesperado: ${innerError.message}`)
      }
    }

    console.log(`[sendBulkNegotiations] Resultado: ${sentCount} enviados de ${params.customerIds.length} selecionados. Erros: ${errors.length}`)
    if (errors.length > 0) {
      console.log(`[sendBulkNegotiations] Erros detalhados:`, errors)
    }

    revalidatePath("/super-admin/negotiations")
    revalidatePath("/super-admin/companies")

    if (sentCount === 0 && errors.length > 0) {
      return {
        success: false,
        error: `Nenhuma negociacao enviada. Erros: ${errors.slice(0, 5).join("; ")}`,
        sent: 0,
        total: params.customerIds.length,
        errors: errors,
      }
    }

    return {
      success: true,
      sent: sentCount,
      total: params.customerIds.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: any) {
    console.error("Error in sendBulkNegotiations:", error)
    return {
      success: false,
      error: error.message || "Erro desconhecido",
      sent: 0,
    }
  }
}
