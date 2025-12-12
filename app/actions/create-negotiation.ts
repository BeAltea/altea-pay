"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createNegotiation(formData: FormData) {
  try {
    // Get authenticated user from server
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Usuário não autenticado" }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile) {
      return { success: false, error: "Perfil não encontrado" }
    }

    // Extract form data
    const customerId = formData.get("customerId") as string
    const originalAmount = Number.parseFloat(formData.get("originalAmount") as string)
    const agreedAmount = Number.parseFloat(formData.get("agreedAmount") as string)
    const discountAmount = Number.parseFloat(formData.get("discountAmount") as string)
    const installments = Number.parseInt(formData.get("installments") as string)
    const paymentMethod = formData.get("paymentMethod") as string
    const dueDate = formData.get("dueDate") as string
    const terms = formData.get("terms") as string
    const attendantName = formData.get("attendantName") as string

    // Use service client to bypass RLS
    const serviceClient = createServiceClient()

    const { data: vmaxCustomer } = await serviceClient.from("VMAX").select("*").eq("id", customerId).maybeSingle()

    if (!vmaxCustomer) {
      return { success: false, error: "Cliente não encontrado na tabela VMAX" }
    }

    const customerCpf = vmaxCustomer["CPF/CNPJ"]
    if (!customerCpf) {
      return { success: false, error: "Cliente não possui CPF/CNPJ cadastrado" }
    }

    const cpfSemFormatacao = customerCpf.replace(/\D/g, "")

    let customerProfile = await serviceClient
      .from("profiles")
      .select("id")
      .eq("cpf_cnpj", cpfSemFormatacao)
      .maybeSingle()

    if (!customerProfile.data) {
      customerProfile = await serviceClient.from("profiles").select("id").eq("cpf_cnpj", customerCpf).maybeSingle()
    }

    if (!customerProfile.data) {
      const { data: allProfiles } = await serviceClient.from("profiles").select("id, cpf_cnpj")

      const matchingProfile = allProfiles?.find((p) => {
        if (!p.cpf_cnpj) return false
        const profileCpfClean = p.cpf_cnpj.replace(/\D/g, "")
        return profileCpfClean === cpfSemFormatacao
      })

      if (matchingProfile) {
        customerProfile = { data: { id: matchingProfile.id }, error: null }
      }
    }

    if (!customerProfile.data) {
      return {
        success: false,
        error: `Cliente não possui cadastro no sistema. CPF: ${cpfSemFormatacao}`,
      }
    }

    const customerUserId = customerProfile.data.id

    let customerRecordId: string
    const { data: existingCustomer } = await serviceClient
      .from("customers")
      .select("id")
      .eq("document", cpfSemFormatacao)
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (existingCustomer) {
      customerRecordId = existingCustomer.id
    } else {
      // Create customer record
      const { data: newCustomer, error: customerError } = await serviceClient
        .from("customers")
        .insert({
          company_id: profile.company_id,
          user_id: customerUserId,
          name: vmaxCustomer.Cliente || "Cliente",
          document: cpfSemFormatacao,
          document_type: cpfSemFormatacao.length === 11 ? "CPF" : "CNPJ",
          email: vmaxCustomer.Email || null,
          phone: vmaxCustomer.Telefone || null,
          city: vmaxCustomer.Cidade || null,
          source_system: "VMAX",
          external_id: customerId,
        })
        .select("id")
        .single()

      if (customerError || !newCustomer) {
        console.error("Error creating customer:", customerError)
        return { success: false, error: `Erro ao criar registro de cliente: ${customerError?.message}` }
      }

      customerRecordId = newCustomer.id
    }

    const { data: existingDebt } = await serviceClient
      .from("debts")
      .select("id")
      .eq("customer_id", customerRecordId)
      .eq("company_id", profile.company_id)
      .maybeSingle()

    let debtId: string

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const { data: newDebt, error: debtError } = await serviceClient
        .from("debts")
        .insert({
          customer_id: customerRecordId, // Use customers table ID
          user_id: customerUserId,
          company_id: profile.company_id,
          amount: originalAmount,
          due_date: dueDate,
          status: "in_negotiation",
          description: `Dívida de ${vmaxCustomer.Cliente || "cliente"}`,
          source_system: "VMAX",
          external_id: customerId,
        })
        .select("id")
        .single()

      if (debtError || !newDebt) {
        console.error("Error creating debt:", debtError)
        return { success: false, error: `Erro ao criar registro de dívida: ${debtError?.message}` }
      }

      debtId = newDebt.id
    }

    const { data: agreement, error: agreementError } = await serviceClient
      .from("agreements")
      .insert({
        customer_id: customerRecordId, // Use customers table ID
        user_id: customerUserId,
        debt_id: debtId,
        company_id: profile.company_id,
        original_amount: originalAmount,
        agreed_amount: agreedAmount,
        discount_amount: discountAmount,
        installments: installments,
        due_date: dueDate,
        terms: terms,
        attendant_name: attendantName,
        status: "active",
      })
      .select()
      .maybeSingle()

    if (agreementError) {
      console.error("Error creating agreement:", agreementError)
      return { success: false, error: `Erro ao criar negociação: ${agreementError.message}` }
    }

    const installmentValue = agreedAmount / installments
    const { error: notificationError } = await serviceClient.from("notifications").insert({
      user_id: customerUserId,
      company_id: profile.company_id,
      type: "negotiation",
      title: "Nova Proposta de Acordo",
      description: `Você recebeu uma proposta de acordo no valor de R$ ${agreedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${installments}x de R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      read: false,
    })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
    }

    revalidatePath("/dashboard/agreements")
    revalidatePath("/user-dashboard/negotiation")
    return { success: true, data: agreement }
  } catch (error) {
    console.error("Error in createNegotiation:", error)
    return { success: false, error: "Erro ao processar negociação" }
  }
}
