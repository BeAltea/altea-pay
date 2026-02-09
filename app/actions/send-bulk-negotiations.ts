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

        // Get contact info from VMAX first
        let customerPhone = (vmax["Telefone 1"] || vmax["Telefone 2"] || vmax["Telefone"] || "").replace(/\D/g, "")
        let customerEmail = vmax.Email || ""

        console.log("[ASAAS] VMAX raw data:", {
          Email: vmax.Email,
          "Telefone 1": vmax["Telefone 1"],
          "Telefone 2": vmax["Telefone 2"],
          cpfCnpj,
          companyId: params.companyId
        })

        // ALWAYS try to get from customers table to ensure we have contact info
        const { data: existingCustomerData, error: customerQueryError } = await supabase
          .from("customers")
          .select("phone, email")
          .eq("document", cpfCnpj)
          .eq("company_id", params.companyId)
          .maybeSingle()

        console.log("[ASAAS] Customer query result:", {
          existingCustomerData,
          customerQueryError: customerQueryError?.message,
          cpfCnpj,
          companyId: params.companyId
        })

        if (existingCustomerData) {
          // Use customer table data if available (prefer it over VMAX)
          if (existingCustomerData.phone) {
            customerPhone = existingCustomerData.phone.replace(/\D/g, "")
          }
          if (existingCustomerData.email) {
            customerEmail = existingCustomerData.email
          }
        }

        console.log("[ASAAS] Final contact info:", { name: customerName, email: customerEmail, phone: customerPhone })

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
        // IMPORTANT: Do NOT send email to ASAAS - AlteaPay handles email via SendGrid/Resend
        // Only send mobilePhone so ASAAS can send WhatsApp notifications
        let asaasCustomerId: string | null = null
        try {
          const existingAsaas = await getAsaasCustomerByCpfCnpj(cpfCnpj)
          if (existingAsaas) {
            asaasCustomerId = existingAsaas.id
            // Update with phone only (NO email) - clear email if it exists
            await updateAsaasCustomer(asaasCustomerId, {
              mobilePhone: customerPhone || undefined,
              notificationDisabled: false,
            })
          } else {
            // Create customer with phone only (NO email)
            const newAsaas = await createAsaasCustomer({
              name: customerName,
              cpfCnpj,
              // email: DO NOT SEND - ASAAS won't be able to send emails
              mobilePhone: customerPhone || undefined,
              notificationDisabled: false,
            })
            asaasCustomerId = newAsaas.id
          }
          console.log("[ASAAS] Customer created/updated:", asaasCustomerId, "with phone only (no email)")

          // Configure PAYMENT_CREATED notification:
          // - WhatsApp only if selected (ASAAS has the phone)
          // - Email DISABLED (AlteaPay sends via Resend)
          // - SMS DISABLED (AlteaPay sends via Twilio if needed)
          try {
            const allNotifs = await getAsaasCustomerNotifications(asaasCustomerId)
            const paymentCreatedNotif = allNotifs.find((n: any) => n.event === "PAYMENT_CREATED")

            if (paymentCreatedNotif) {
              const enableWhatsApp = params.notificationChannels.includes("whatsapp")
              await updateAsaasNotification(paymentCreatedNotif.id, {
                enabled: enableWhatsApp, // Only enable if WhatsApp selected
                emailEnabledForCustomer: false, // NEVER - AlteaPay sends email
                smsEnabledForCustomer: false, // NEVER - AlteaPay sends SMS via Twilio
                whatsappEnabledForCustomer: enableWhatsApp,
              })
              console.log("[ASAAS] PAYMENT_CREATED notification configured:", {
                email: false,
                sms: false,
                whatsapp: enableWhatsApp,
              })
            }
          } catch (notifErr: any) {
            console.warn("[ASAAS] Failed to configure notifications:", notifErr.message)
            // Continue anyway - customer creation succeeded
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

        // 3. Create Asaas payment (notifications are already enabled on the customer)
        try {
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

        // Send SMS directly via Twilio if SMS channel is selected (Asaas SMS may not be enabled)
        if (params.notificationChannels.includes("sms") && customerPhone) {
          try {
            const { sendSMS, generateDebtCollectionSMS } = await import("@/lib/notifications/sms")
            
            // Format phone number to international format
            let formattedPhone = customerPhone.replace(/\D/g, "")
            if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
              formattedPhone = "55" + formattedPhone
            }
            formattedPhone = "+" + formattedPhone

            // Get payment URL from the agreement we just updated
            const { data: updatedAgreement } = await supabase
              .from("agreements")
              .select("asaas_payment_url")
              .eq("id", agreement.id)
              .single()

            const paymentUrl = updatedAgreement?.asaas_payment_url || ""

            // Get company name
            const { data: companyData } = await supabase
              .from("companies")
              .select("name")
              .eq("id", params.companyId)
              .single()

            const smsBody = await generateDebtCollectionSMS({
              customerName,
              debtAmount: agreedAmount,
              companyName: companyData?.name || "Empresa",
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

        // Send WhatsApp notification via Asaas (WhatsApp only - email/SMS disabled)
        if (params.notificationChannels.includes("whatsapp") && customerPhone) {
          try {
            // Ensure WhatsApp is enabled for PAYMENT_CREATED (email/SMS always disabled)
            const allNotifs = await getAsaasCustomerNotifications(asaasCustomerId)
            const paymentCreatedNotif = allNotifs.find((n: any) => n.event === "PAYMENT_CREATED")
            if (paymentCreatedNotif) {
              await updateAsaasNotification(paymentCreatedNotif.id, {
                enabled: true,
                emailEnabledForCustomer: false, // NEVER - AlteaPay sends email
                smsEnabledForCustomer: false, // NEVER - AlteaPay sends SMS via Twilio
                whatsappEnabledForCustomer: true,
              })
            }
            // Resend the notification to trigger WhatsApp
            const { resendAsaasPaymentNotification } = await import("@/lib/asaas")
            const { data: agr } = await supabase
              .from("agreements")
              .select("asaas_payment_id")
              .eq("id", agreement.id)
              .single()
            if (agr?.asaas_payment_id) {
              await resendAsaasPaymentNotification(agr.asaas_payment_id)
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
