"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getCollectionRulerStats() {
  try {
    const supabase = createAdminClient()

    console.log("[v0] getCollectionRulerStats - Starting...")

    const { data: rulers, error: rulersError } = await supabase
      .from("collection_rules")
      .select("*")
      .eq("is_active", true)

    if (rulersError) {
      console.error("[v0] Error fetching rulers:", rulersError)
      throw rulersError
    }

    console.log("[v0] Active rulers found:", rulers?.length || 0)

    // Get total VMAX records that are eligible for custom rulers
    const { data: vmaxRecords, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("approval_status", "ACEITA")

    if (vmaxError) {
      console.error("[v0] Error fetching VMAX:", vmaxError)
      throw vmaxError
    }

    console.log("[v0] VMAX records with ACEITA status:", vmaxRecords?.length || 0)

    const { data: executions, error: executionsError } = await supabase
      .from("collection_rule_executions")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(10)

    if (executionsError) {
      console.error("[v0] Error fetching executions:", executionsError)
    }

    // Calculate stats
    const activeRulers = rulers?.length || 0
    const eligibleClients = vmaxRecords?.length || 0
    const lastExecution = executions?.[0]?.sent_at || null
    const successfulToday =
      executions?.filter((e) => {
        const today = new Date().toDateString()
        const execDate = new Date(e.sent_at).toDateString()
        return today === execDate && e.status === "success"
      }).length || 0

    return {
      success: true,
      activeRulers,
      eligibleClients,
      lastExecution,
      successfulToday,
      recentExecutions: executions || [],
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
