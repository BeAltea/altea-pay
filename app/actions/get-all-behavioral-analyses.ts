"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getAllBehavioralAnalyses() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("source", "assertiva")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[getAllBehavioralAnalyses] Error:", error)
      return { success: false, error: error.message, data: [] }
    }

    console.log(`[v0] getAllBehavioralAnalyses found ${data?.length || 0} analyses`)

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("[getAllBehavioralAnalyses] Exception:", error)
    return { success: false, error: error.message, data: [] }
  }
}
