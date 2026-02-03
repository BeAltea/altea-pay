"use server"

import { createAgreementWithAsaas } from "@/app/actions/create-agreement-with-asaas"
import { createAgreementWithPayment } from "@/app/actions/create-agreement-with-payment"

export async function createAgreement(params: {
  vmaxId: string
  agreedAmount: number
  installments: number
  dueDate: string
  attendantName?: string
  terms?: string
}) {
  const provider = process.env.PAYMENT_PROVIDER || "asaas"

  if (provider === "asaas") {
    return createAgreementWithAsaas(params)
  }

  return createAgreementWithPayment(params)
}
