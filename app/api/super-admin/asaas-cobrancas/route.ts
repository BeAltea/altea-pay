import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { agreements, customers, companies, profiles } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role and companyId
    const [userProfile] = await db
      .select({ role: profiles.role, companyId: profiles.companyId })
      .from(profiles)
      .where(eq(profiles.id, session.user.id!))
      .limit(1)

    const isSuperAdmin = userProfile?.role === "super_admin"
    const userCompanyId = userProfile?.companyId

    // Get companyId filter from query params (only used for super_admin)
    const { searchParams } = new URL(request.url)
    const filterCompanyId = searchParams.get("companyId")

    // Determine which companyId to filter by
    let effectiveCompanyId: string | null = null
    if (isSuperAdmin) {
      // Super admin can filter by any company or see all
      effectiveCompanyId = filterCompanyId || null
    } else {
      // Non-super admin users can only see their own company's data
      effectiveCompanyId = userCompanyId || null
      if (!effectiveCompanyId) {
        return NextResponse.json({ error: "No company assigned to user" }, { status: 403 })
      }
    }

    // Fetch agreements with customer and company info
    let agreementsQuery
    if (effectiveCompanyId) {
      agreementsQuery = await db
        .select({
          id: agreements.id,
          companyId: agreements.companyId,
          customerId: agreements.customerId,
          originalAmount: agreements.originalAmount,
          negotiatedAmount: agreements.negotiatedAmount,
          discountPercentage: agreements.discountPercentage,
          installments: agreements.installments,
          installmentAmount: agreements.installmentAmount,
          paymentMethod: agreements.paymentMethod,
          status: agreements.status,
          paymentProvider: agreements.paymentProvider,
          paymentLink: agreements.paymentLink,
          dueDate: agreements.dueDate,
          startDate: agreements.startDate,
          notes: agreements.notes,
          metadata: agreements.metadata,
          createdAt: agreements.createdAt,
          updatedAt: agreements.updatedAt,
          customerName: customers.name,
          customerDocument: customers.document,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          companyName: companies.name,
        })
        .from(agreements)
        .leftJoin(customers, eq(agreements.customerId, customers.id))
        .leftJoin(companies, eq(agreements.companyId, companies.id))
        .where(eq(agreements.companyId, effectiveCompanyId))
        .orderBy(desc(agreements.createdAt))
    } else {
      agreementsQuery = await db
        .select({
          id: agreements.id,
          companyId: agreements.companyId,
          customerId: agreements.customerId,
          originalAmount: agreements.originalAmount,
          negotiatedAmount: agreements.negotiatedAmount,
          discountPercentage: agreements.discountPercentage,
          installments: agreements.installments,
          installmentAmount: agreements.installmentAmount,
          paymentMethod: agreements.paymentMethod,
          status: agreements.status,
          paymentProvider: agreements.paymentProvider,
          paymentLink: agreements.paymentLink,
          dueDate: agreements.dueDate,
          startDate: agreements.startDate,
          notes: agreements.notes,
          metadata: agreements.metadata,
          createdAt: agreements.createdAt,
          updatedAt: agreements.updatedAt,
          customerName: customers.name,
          customerDocument: customers.document,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          companyName: companies.name,
        })
        .from(agreements)
        .leftJoin(customers, eq(agreements.customerId, customers.id))
        .leftJoin(companies, eq(agreements.companyId, companies.id))
        .orderBy(desc(agreements.createdAt))
    }

    // Map agreements to response format
    const asaasCobrancas = agreementsQuery.map((agreement) => ({
      id: agreement.id,
      customerName: agreement.customerName || "Cliente não informado",
      customerDocument: agreement.customerDocument,
      customerEmail: agreement.customerEmail,
      customerPhone: agreement.customerPhone,
      companyId: agreement.companyId,
      companyName: agreement.companyName,
      originalAmount: agreement.originalAmount,
      negotiatedAmount: agreement.negotiatedAmount,
      discountPercentage: agreement.discountPercentage,
      installments: agreement.installments,
      installmentAmount: agreement.installmentAmount,
      paymentMethod: agreement.paymentMethod,
      status: agreement.status,
      paymentProvider: agreement.paymentProvider,
      paymentLink: agreement.paymentLink,
      dueDate: agreement.dueDate,
      startDate: agreement.startDate,
      proposalSent: !!agreement.paymentLink,
      dateSent: agreement.createdAt?.toISOString() || null,
      notes: agreement.notes,
      metadata: agreement.metadata,
      createdAt: agreement.createdAt?.toISOString() || null,
      updatedAt: agreement.updatedAt?.toISOString() || null,
    }))

    // Return data with user role info for frontend
    return NextResponse.json({
      cobrancas: asaasCobrancas,
      userRole: userProfile?.role || "user",
      userCompanyId: userCompanyId,
    })
  } catch (error) {
    console.error("[API] Error fetching ASAAS cobrancas:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
