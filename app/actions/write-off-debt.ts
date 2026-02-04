"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, vmax, payments, collectionActions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function writeOffDebt(data: {
  debtId: string
  paymentMethod: string
  paymentChannel: string
  paymentDate: string
  notes?: string
}) {
  try {
    const session = await auth()
    const user = session?.user

    if (!user) {
      return { success: false, message: "Usuário não autenticado" }
    }

    const [profile] = await db
      .select({ companyId: profiles.companyId, fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    if (!profile?.companyId) {
      return { success: false, message: "Empresa não encontrada" }
    }

    // Get debt details from VMAX
    const [debt] = await db
      .select()
      .from(vmax)
      .where(and(eq(vmax.id, data.debtId), eq(vmax.idCompany, profile.companyId)))
      .limit(1)

    if (!debt) {
      console.error("[v0] Debt not found")
      return { success: false, message: "Dívida não encontrada na base de dados" }
    }

    // Create payment record
    await db.insert(payments).values({
      debtId: data.debtId,
      companyId: profile.companyId,
      amount: debt.valorTotal ? Number.parseFloat(debt.valorTotal.toString().replace(",", ".")).toString() : "0",
      method: data.paymentMethod,
      status: "confirmed",
      externalId: `WRITEOFF-${Date.now()}`,
      metadata: { paymentDate: data.paymentDate },
    })

    // Update debt status in VMAX
    await db
      .update(vmax)
      .set({
        approvalStatus: "PAID",
        analysisMetadata: {
          ...(debt.analysisMetadata as any),
          payment_info: {
            method: data.paymentMethod,
            channel: data.paymentChannel,
            date: data.paymentDate,
            notes: data.notes,
            written_off_by: profile.fullName,
            written_off_at: new Date().toISOString(),
          },
        },
      })
      .where(eq(vmax.id, data.debtId))

    // Log the write-off action
    await db.insert(collectionActions).values({
      companyId: profile.companyId,
      customerId: debt.id,
      actionType: "write_off",
      status: "sent",
      message: `Dívida baixada via ${data.paymentChannel} - ${data.paymentMethod}`,
      metadata: {
        payment_method: data.paymentMethod,
        payment_channel: data.paymentChannel,
        payment_date: data.paymentDate,
        notes: data.notes,
        sent_by: user.id,
      },
    })

    return {
      success: true,
      message: "Dívida baixada com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Error in writeOffDebt:", error)
    return {
      success: false,
      message: "Erro inesperado ao baixar dívida",
    }
  }
}
