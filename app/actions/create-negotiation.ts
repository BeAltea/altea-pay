"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, vmax, customers, debts, agreements, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function createNegotiation(formData: FormData) {
  try {
    // Get authenticated user from server
    const session = await auth()
    const user = session?.user

    if (!user) {
      return { success: false, error: "Usuário não autenticado" }
    }

    // Get user profile
    const [profile] = await db
      .select({ fullName: profiles.fullName, companyId: profiles.companyId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

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

    const discountPercentage = originalAmount > 0 ? (discountAmount / originalAmount) * 100 : 0
    const installmentAmount = installments > 0 ? agreedAmount / installments : agreedAmount

    const [vmaxCustomer] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.id, customerId))
      .limit(1)

    if (!vmaxCustomer) {
      return { success: false, error: "Cliente não encontrado na tabela VMAX" }
    }

    const customerCpf = vmaxCustomer.cpfCnpj
    if (!customerCpf) {
      return { success: false, error: "Cliente não possui CPF/CNPJ cadastrado" }
    }

    const cpfSemFormatacao = customerCpf.replace(/\D/g, "")

    let [customerProfile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.cpfCnpj, cpfSemFormatacao))
      .limit(1)

    if (!customerProfile) {
      [customerProfile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.cpfCnpj, customerCpf))
        .limit(1)
    }

    if (!customerProfile) {
      const allProfiles = await db
        .select({ id: profiles.id, cpfCnpj: profiles.cpfCnpj })
        .from(profiles)

      const matchingProfile = allProfiles?.find((p) => {
        if (!p.cpfCnpj) return false
        const profileCpfClean = p.cpfCnpj.replace(/\D/g, "")
        return profileCpfClean === cpfSemFormatacao
      })

      if (matchingProfile) {
        customerProfile = { id: matchingProfile.id }
      }
    }

    if (!customerProfile) {
      return {
        success: false,
        error: `Cliente não possui cadastro no sistema. CPF: ${cpfSemFormatacao}`,
      }
    }

    const customerUserId = customerProfile.id

    let customerRecordId: string
    const [existingCustomer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.document, cpfSemFormatacao), eq(customers.companyId, profile.companyId!)))
      .limit(1)

    if (existingCustomer) {
      customerRecordId = existingCustomer.id
    } else {
      // Create customer record
      const [newCustomer] = await db
        .insert(customers)
        .values({
          companyId: profile.companyId!,
          name: vmaxCustomer.cliente || "Cliente",
          document: cpfSemFormatacao,
          documentType: cpfSemFormatacao.length === 11 ? "CPF" : "CNPJ",
          email: null,
          phone: null,
          sourceSystem: "VMAX",
          externalId: customerId,
        })
        .returning()

      if (!newCustomer) {
        return { success: false, error: "Erro ao criar registro de cliente" }
      }

      customerRecordId = newCustomer.id
    }

    const [existingDebt] = await db
      .select({ id: debts.id })
      .from(debts)
      .where(and(eq(debts.customerId, customerRecordId), eq(debts.companyId, profile.companyId!)))
      .limit(1)

    let debtId: string

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const [newDebt] = await db
        .insert(debts)
        .values({
          customerId: customerRecordId,
          companyId: profile.companyId!,
          amount: originalAmount.toString(),
          dueDate: dueDate,
          status: "in_negotiation",
          description: `Dívida de ${vmaxCustomer.cliente || "cliente"}`,
          source: "VMAX",
          externalId: customerId,
        })
        .returning()

      if (!newDebt) {
        return { success: false, error: "Erro ao criar registro de dívida" }
      }

      debtId = newDebt.id
    }

    const [agreement] = await db
      .insert(agreements)
      .values({
        customerId: customerRecordId,
        debtId: debtId,
        companyId: profile.companyId!,
        originalAmount: originalAmount.toString(),
        negotiatedAmount: agreedAmount.toString(),
        discountPercentage: discountPercentage.toString(),
        installmentAmount: installmentAmount.toString(),
        installments: installments,
        dueDate: dueDate,
        notes: terms,
        status: "active",
        metadata: {
          attendantName: attendantName,
          agreedAmount: agreedAmount,
          discountAmount: discountAmount,
        },
      })
      .returning()

    try {
      await db.insert(notifications).values({
        userId: customerUserId,
        companyId: profile.companyId!,
        type: "negotiation",
        title: "Nova Proposta de Acordo",
        message: `Você recebeu uma proposta de acordo no valor de R$ ${agreedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${installments}x de R$ ${installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        isRead: false,
      })
    } catch (notificationError) {
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
