import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles, companies } from "@/lib/db/schema"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Fetch profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch company if exists
    let companyName: string | undefined
    if (profile.companyId) {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, profile.companyId))
        .limit(1)
      companyName = company?.name
    }

    const userData = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName || "Sem nome",
      role: profile.role || "user",
      companyName,
      companyId: profile.companyId,
      status: profile.status || "active",
      phone: profile.phone,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("[API] Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
