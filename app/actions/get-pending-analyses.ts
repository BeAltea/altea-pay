"use server"

import { db } from "@/lib/db"
import { creditProfiles } from "@/lib/db/schema"
import { eq, and, desc, inArray, isNotNull } from "drizzle-orm"

export async function getPendingAnalyses() {
  try {
    const data = await db
      .select()
      .from(creditProfiles)
      .where(
        and(
          eq(creditProfiles.provider, "assertiva"),
          eq(creditProfiles.analysisType, "detailed"),
          isNotNull(creditProfiles.metadata), // Apenas analises assincronas (with external_id in metadata)
          inArray(creditProfiles.status, ["pending", "completed", "failed"]),
        ),
      )
      .orderBy(desc(creditProfiles.createdAt))
      .limit(50)

    return { success: true, data: data, error: null }
  } catch (error: any) {
    console.error("Exception in getPendingAnalyses:", error)
    return { success: false, error: error.message, data: [] }
  }
}
