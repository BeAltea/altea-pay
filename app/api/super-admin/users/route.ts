import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { desc } from "drizzle-orm"
import { profiles, companies } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all profiles with their companies
    const profilesData = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        role: profiles.role,
        companyId: profiles.companyId,
        status: profiles.status,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt))

    // Fetch companies for each profile
    const companiesData = await db.select().from(companies)
    const companiesMap = new Map(companiesData.map(c => [c.id, c]))

    // Transform to User format
    const users = profilesData.map((profile) => ({
      id: profile.id,
      email: profile.email || "",
      fullName: profile.fullName || "Sem nome",
      role: profile.role || "user",
      companyName: profile.companyId ? companiesMap.get(profile.companyId)?.name : undefined,
      companyId: profile.companyId,
      status: profile.status || "active",
      lastLogin: new Date().toISOString(),
      createdAt: profile.createdAt.toISOString(),
      totalLogins: 0,
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error("[API] Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
