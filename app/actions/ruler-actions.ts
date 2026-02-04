"use server"

import { db } from "@/lib/db"
import { collectionRules, collectionRuleExecutions, vmax } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getCollectionRulerStats() {
  try {
    console.log("[v0] getCollectionRulerStats - Starting...")

    const rulers = await db
      .select()
      .from(collectionRules)
      .where(eq(collectionRules.isActive, true))

    console.log("[v0] Active rulers found:", rulers.length)

    // Buscar TODOS os registros VMAX elegiveis
    const vmaxRecords = await db
      .select()
      .from(vmax)
      .where(eq(vmax.approvalStatus, "ACEITA"))

    console.log("[v0] VMAX records with ACEITA status:", vmaxRecords.length)

    const executions = await db
      .select()
      .from(collectionRuleExecutions)
      .orderBy(desc(collectionRuleExecutions.executedAt))
      .limit(10)

    // Calculate stats
    const activeRulers = rulers.length
    const eligibleClients = vmaxRecords.length
    const lastExecution = executions[0]?.executedAt || null
    const successfulToday =
      executions.filter((e) => {
        const today = new Date().toDateString()
        const execDate = e.executedAt ? new Date(e.executedAt).toDateString() : null
        return today === execDate && e.status === "success"
      }).length || 0

    return {
      success: true,
      activeRulers,
      eligibleClients,
      lastExecution,
      successfulToday,
      recentExecutions: executions,
    }
  } catch (error: any) {
    console.error("[v0] getCollectionRulerStats error:", error)
    return {
      success: false,
      error: error.message,
      activeRulers: 0,
      eligibleClients: 0,
      lastExecution: null,
      successfulToday: 0,
      recentExecutions: [],
    }
  }
}
