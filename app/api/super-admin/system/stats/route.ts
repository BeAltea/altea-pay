import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import {
  companies,
  profiles,
  debts,
  customers,
  vmax,
  creditProfiles,
  messages,
  collectionActions
} from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Count records in each table
    const [companiesResult] = await db.select({ count: sql<number>`count(*)` }).from(companies)
    const [profilesResult] = await db.select({ count: sql<number>`count(*)` }).from(profiles)
    const [debtsResult] = await db.select({ count: sql<number>`count(*)` }).from(debts)
    const [customersResult] = await db.select({ count: sql<number>`count(*)` }).from(customers)
    const [vmaxResult] = await db.select({ count: sql<number>`count(*)` }).from(vmax)
    const [creditProfilesResult] = await db.select({ count: sql<number>`count(*)` }).from(creditProfiles)
    const [messagesResult] = await db.select({ count: sql<number>`count(*)` }).from(messages)
    const [actionsResult] = await db.select({ count: sql<number>`count(*)` }).from(collectionActions)

    const companiesCount = Number(companiesResult?.count || 0)
    const profilesCount = Number(profilesResult?.count || 0)
    const debtsCount = Number(debtsResult?.count || 0)
    const customersCount = Number(customersResult?.count || 0)
    const vmaxCount = Number(vmaxResult?.count || 0)
    const creditProfilesCount = Number(creditProfilesResult?.count || 0)
    const messagesCount = Number(messagesResult?.count || 0)
    const actionsCount = Number(actionsResult?.count || 0)

    const stats = {
      companies: companiesCount,
      profiles: profilesCount,
      debts: debtsCount,
      customers: customersCount + vmaxCount,
      creditProfiles: creditProfilesCount,
      messages: messagesCount,
      actions: actionsCount,
      totalRecords:
        companiesCount +
        profilesCount +
        debtsCount +
        customersCount +
        vmaxCount +
        creditProfilesCount +
        messagesCount +
        actionsCount,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[API] Error fetching system stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
