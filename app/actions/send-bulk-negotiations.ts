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

        // 3. Disable ALL Asaas notifications - we send our own via Resend/Twilio
        try {
          // Keep Asaas notifications disabled - we handle email/SMS ourselves
          await updateAsaasCustomer(asaasCustomerId, {
            notificationDisabled: true,
            email: customerEmail || undefined,
            mobilePhone: customerPhone || undefined,
          })

          // Disable all Asaas notifications to prevent Asaas from sending its own emails
          const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)
          for (const notif of allNotifications) {
            await updateAsaasNotification(notif.id, {
              enabled: false,
              emailEnabledForCustomer: false,
              smsEnabledForCustomer: false,
              whatsappEnabledForCustomer: false,
            })
          }

          // 4. Create Asaas payment - map selected payment methods to billingType
          // If only one method selected, use that specific type. Otherwise use UNDEFINED.
          let billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED" = "UNDEFINED"
          const methodMapping: Record<string, "BOLETO" | "CREDIT_CARD" | "PIX"> = {
            boleto: "BOLETO",
            pix: "PIX",
            credit_card: "CREDIT_CARD",
          }
          if (params.paymentMethods.length === 1 && methodMapping[params.paymentMethods[0]]) {
            billingType = methodMapping[params.paymentMethods[0]]
          }

          const paymentParams: any = {
            customer: asaasCustomerId,
            billingType,
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

        } catch (asaasPaymentErr: any) {
          errors.push(`${customerName}: erro ao criar cobranca Asaas - ${asaasPaymentErr.message}`)
          // Delete the draft agreement since payment failed
          await supabase.from("agreements").delete().eq("id", agreement.id)
          continue
        }

        // === Send notifications ourselves (not via Asaas) ===
        // Get the correct payment URL based on billingType
        const { data: updatedAgreement } = await supabase
          .from("agreements")
          .select("asaas_payment_url, asaas_pix_qrcode_url, asaas_boleto_url")
          .eq("id", agreement.id)
          .single()

        // Choose the best payment URL based on selected methods
        let paymentUrl = updatedAgreement?.asaas_payment_url || ""
        if (params.paymentMethods.length === 1) {
          if (params.paymentMethods[0] === "boleto" && updatedAgreement?.asaas_boleto_url) {
            paymentUrl = updatedAgreement.asaas_boleto_url
          }
          // For PIX and credit_card, invoiceUrl is the best option since it shows only the selected method
        }

        // Get company name
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", params.companyId)
          .single()

        const companyName = companyData?.name || "Empresa"

        // Send email via Resend (our own template)
        if (params.notificationChannels.includes("email") && customerEmail) {
          try {
            const { sendEmail, generateDebtCollectionEmail } = await import("@/lib/notifications/email")
            
            const emailHtml = await generateDebtCollectionEmail({
              customerName,
              debtAmount: agreedAmount,
              dueDate: dueDate.toISOString().split("T")[0],
              companyName,
              paymentLink: paymentUrl,
            })

            const emailResult = await sendEmail({
              to: customerEmail,
              subject: `${companyName} - Proposta de Acordo`,
              html: emailHtml,
            })

            if (!emailResult.success) {
              console.log(`[sendBulkNegotiations] Email Resend falhou para ${customerName}: ${emailResult.error}`)
            } else {
              console.log(`[sendBulkNegotiations] Email Resend enviado para ${customerName}`)
            }
          } catch (emailErr: any) {
            console.error(`[sendBulkNegotiations] Erro ao enviar Email Resend para ${customerName}:`, emailErr.message)
          }
        }

        // Send SMS via Twilio
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

            const smsResult = await sendSMS({ to: formattedPhone, body: smsBody })
            if (!smsResult.success) {
              console.log(`[sendBulkNegotiations] SMS Twilio falhou para ${customerName}: ${smsResult.error}`)
            } else {
              console.log(`[sendBulkNegotiations] SMS Twilio enviado para ${customerName}`)
            }
          } catch (smsErr: any) {
            console.error(`[sendBulkNegotiations] Erro ao enviar SMS Twilio para ${customerName}:`, smsErr.message)
          }
        }

        // Send WhatsApp notification (via Asaas - only for WhatsApp since we can't send WhatsApp ourselves)
        if (params.notificationChannels.includes("whatsapp") && customerPhone) {
          try {
            // For WhatsApp, we still need to use Asaas since we don't have a WhatsApp API
            // Temporarily enable WhatsApp notification for this customer, then disable
            await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: false })
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
            // Resend the notification
            const { resendAsaasPaymentNotification } = await import("@/lib/asaas")
            const { data: agr } = await supabase
              .from("agreements")
              .select("asaas_payment_id")
              .eq("id", agreement.id)
              .single()
            if (agr?.asaas_payment_id) {
              await resendAsaasPaymentNotification(agr.asaas_payment_id)
            }
            // Disable again
            await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })
            if (paymentCreatedNotif) {
              await updateAsaasNotification(paymentCreatedNotif.id, {
                enabled: false,
                emailEnabledForCustomer: false,
                smsEnabledForCustomer: false,
                whatsappEnabledForCustomer: false,
              })
            }
            console.log(`[sendBulkNegotiations] WhatsApp enviado via Asaas para ${customerName}`)
          } catch (whatsappErr: any) {
            console.error(`[sendBulkNegotiations] Erro ao enviar WhatsApp para ${customerName}:`, whatsappErr.message)
          }
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
