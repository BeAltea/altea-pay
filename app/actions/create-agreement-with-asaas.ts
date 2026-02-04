"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, vmax, customers, debts, agreements, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { createAsaasCustomer, createAsaasPayment, getAsaasCustomerByCpfCnpj } from "@/lib/asaas"

export async function createAgreementWithAsaas(params: {
  vmaxId: string
  agreedAmount: number
  installments: number
  dueDate: string
  attendantName?: string
  terms?: string
}) {
  try {
    // Get authenticated user
    const session = await auth()
    const user = session?.user
    if (!user) throw new Error("Nao autenticado")

    // Get user profile to get company
    const [profile] = await db
      .select({ companyId: profiles.companyId })
      .from(profiles)
      .where(eq(profiles.id, user.id!))
      .limit(1)

    if (!profile?.companyId) throw new Error("Empresa nao encontrada")

    // Get VMAX record
    const [vmaxRecord] = await db
      .select()
      .from(vmax)
      .where(eq(vmax.id, params.vmaxId))
      .limit(1)

    if (!vmaxRecord) {
      throw new Error("Registro nao encontrado")
    }

    // Step 1: Create or get customer in our database
    const cpfCnpj = vmaxRecord.cpfCnpj?.replace(/[^\d]/g, "") || ""
    const customerName = vmaxRecord.cliente || "Cliente"
    const customerPhone = ""
    const customerEmail = ""

    let customerId: string

    const [existingCustomer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.document, cpfCnpj),
          eq(customers.companyId, profile.companyId),
        ),
      )
      .limit(1)

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Search for user_id in profiles by cpf_cnpj
      const [profileData] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.cpfCnpj, cpfCnpj))
        .limit(1)

      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: customerName,
          document: cpfCnpj,
          documentType: cpfCnpj.length === 11 ? "CPF" : "CNPJ",
          phone: customerPhone,
          email: customerEmail,
          companyId: profile.companyId,
          sourceSystem: "VMAX",
          externalId: params.vmaxId,
        })
        .returning({ id: customers.id })

      customerId = newCustomer.id
    }

    // Step 2: Create or get debt
    const originalAmount = Number.parseFloat(
      (vmaxRecord as any).Vencido?.replace(/[^\d,]/g, "").replace(",", ".") || "0",
    )

    let debtId: string

    const [existingDebt] = await db
      .select({ id: debts.id })
      .from(debts)
      .where(
        and(
          eq(debts.customerId, customerId),
          eq(debts.companyId, profile.companyId),
          eq(debts.externalId, params.vmaxId),
        ),
      )
      .limit(1)

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const [newDebt] = await db
        .insert(debts)
        .values({
          customerId: customerId,
          companyId: profile.companyId,
          amount: String(originalAmount),
          description: `Divida de ${customerName}`,
          status: "in_negotiation",
          source: "VMAX",
          externalId: params.vmaxId,
        })
        .returning({ id: debts.id })

      debtId = newDebt.id
    }

    // Step 3: Create or get customer in Asaas
    let asaasCustomerId: string

    const existingAsaasCustomer = await getAsaasCustomerByCpfCnpj(cpfCnpj)

    if (existingAsaasCustomer) {
      asaasCustomerId = existingAsaasCustomer.id
    } else {
      const asaasCustomer = await createAsaasCustomer({
        name: customerName,
        cpfCnpj: cpfCnpj,
        email: customerEmail || undefined,
        mobilePhone: customerPhone || undefined,
      })
      asaasCustomerId = asaasCustomer.id
    }

    // Step 4: Create payment in Asaas
    const discountPercentage = ((originalAmount - params.agreedAmount) / originalAmount) * 100
    const installmentAmount = params.agreedAmount / params.installments

    const asaasPayment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: "UNDEFINED", // Let customer choose payment method
      value: params.installments > 1 ? installmentAmount : params.agreedAmount,
      dueDate: params.dueDate,
      description: `Acordo de negociacao - ${customerName}${
        params.installments > 1 ? ` (Parcela 1/${params.installments})` : ""
      }`,
      externalReference: `agreement_${params.vmaxId}`,
      ...(params.installments > 1 && {
        installmentCount: params.installments,
        installmentValue: installmentAmount,
      }),
    })

    // Step 5: Create agreement in our database
    const [agreement] = await db
      .insert(agreements)
      .values({
        debtId: debtId,
        customerId: customerId,
        companyId: profile.companyId,
        originalAmount: String(originalAmount),
        negotiatedAmount: String(params.agreedAmount),
        discountPercentage: String(discountPercentage),
        installments: params.installments,
        installmentAmount: String(installmentAmount),
        dueDate: params.dueDate,
        status: "active",
        notes: params.terms,
        paymentLink: asaasPayment.invoiceUrl || null,
        invoiceUrl: asaasPayment.invoiceUrl || null,
        metadata: {
          attendant_name: params.attendantName,
          asaas_customer_id: asaasCustomerId,
          asaas_payment_id: asaasPayment.id,
          asaas_payment_url: asaasPayment.invoiceUrl || null,
          asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl || null,
          asaas_boleto_url: asaasPayment.bankSlipUrl || null,
          payment_status: "pending",
          discount_amount: originalAmount - params.agreedAmount,
        },
      })
      .returning()

    // Step 6: Create notification for customer
    await db.insert(notifications).values({
      companyId: profile.companyId,
      type: "agreement",
      title: "Nova Proposta de Acordo",
      message: `Voce recebeu uma proposta de acordo no valor de R$ ${params.agreedAmount.toFixed(2)} em ${params.installments}x de R$ ${installmentAmount.toFixed(2)}`,
    })

    return {
      success: true,
      agreement: {
        ...agreement,
        asaas_payment_url: asaasPayment.invoiceUrl,
        asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl,
        asaas_boleto_url: asaasPayment.bankSlipUrl,
      },
      paymentUrl: asaasPayment.invoiceUrl,
      pixQrCodeUrl: asaasPayment.pixQrCodeUrl,
      boletoUrl: asaasPayment.bankSlipUrl,
    }
  } catch (error) {
    console.error("Error creating agreement with Asaas:", error)
    throw error
  }
}
