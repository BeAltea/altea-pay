"use server"

import { db } from "@/lib/db"
import { creditProfiles } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getAllBehavioralAnalyses() {
  try {
    const data = await db
      .select()
      .from(creditProfiles)
      .where(eq(creditProfiles.provider, "assertiva"))
      .orderBy(desc(creditProfiles.createdAt))

    console.log(`[v0] getAllBehavioralAnalyses found ${data.length} analyses`)

    return { success: true, data: data }
  } catch (error: any) {
    console.error("[getAllBehavioralAnalyses] Exception:", error)
    return { success: false, error: error.message, data: [] }
  }
}
