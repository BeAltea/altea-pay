"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getPendingAnalyses() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("source", "assertiva")
      .eq("analysis_type", "detailed")
      .not("external_id", "is", null) // Apenas análises assíncronas
      .in("status", ["pending", "completed", "failed"])
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching pending analyses:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [], error: null }
  } catch (error: any) {
    console.error("Exception in getPendingAnalyses:", error)
    return { success: false, error: error.message, data: [] }
  }
}
