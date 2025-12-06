"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface CollectionRuleStep {
  step_order: number
  days_after_due: number
  action_type: string
  template_subject?: string
  template_content: string
  execution_time?: string
  is_enabled?: boolean
}

interface CreateCollectionRuleData {
  name: string
  description?: string
  is_active: boolean
  company_id: string
  rule_version?: number
  execution_mode?: string
  start_date_field?: string
  is_default_for_company?: boolean
  requires_approval_status?: string[]
  steps: CollectionRuleStep[]
}

export async function createCollectionRule(data: CreateCollectionRuleData) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Criar a régua
    const { data: rule, error: ruleError } = await supabase
      .from("collection_rules")
      .insert({
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        company_id: data.company_id,
        user_id: user.id,
        rule_version: data.rule_version || 2,
        execution_mode: data.execution_mode || "automatic",
        start_date_field: data.start_date_field || "due_date",
        is_default_for_company: data.is_default_for_company || false,
        requires_approval_status: data.requires_approval_status || ["ACEITA", "ACEITA_ESPECIAL"],
      })
      .select()
      .single()

    if (ruleError) throw ruleError

    // 2. Criar os steps
    if (data.steps && data.steps.length > 0) {
      const stepsToInsert = data.steps.map((step) => ({
        rule_id: rule.id,
        ...step,
        execution_time: step.execution_time || "09:00:00",
        is_enabled: step.is_enabled !== false,
      }))

      const { error: stepsError } = await supabase.from("collection_rule_steps").insert(stepsToInsert)

      if (stepsError) throw stepsError
    }

    revalidatePath("/dashboard/collection-rulers")

    return { success: true, data: rule }
  } catch (error: any) {
    console.error("[v0] Error creating collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function updateCollectionRule(ruleId: string, data: Partial<CreateCollectionRuleData>) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Atualizar a régua
    const { error: ruleError } = await supabase
      .from("collection_rules")
      .update({
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        execution_mode: data.execution_mode,
        start_date_field: data.start_date_field,
        is_default_for_company: data.is_default_for_company,
        requires_approval_status: data.requires_approval_status,
      })
      .eq("id", ruleId)

    if (ruleError) throw ruleError

    // 2. Atualizar steps se fornecidos
    if (data.steps) {
      // Deletar steps antigos
      await supabase.from("collection_rule_steps").delete().eq("rule_id", ruleId)

      // Inserir novos steps
      const stepsToInsert = data.steps.map((step) => ({
        rule_id: ruleId,
        ...step,
        execution_time: step.execution_time || "09:00:00",
        is_enabled: step.is_enabled !== false,
      }))

      const { error: stepsError } = await supabase.from("collection_rule_steps").insert(stepsToInsert)

      if (stepsError) throw stepsError
    }

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error updating collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteCollectionRule(ruleId: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const { error } = await supabase.from("collection_rules").delete().eq("id", ruleId)

    if (error) throw error

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error deleting collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function toggleCollectionRule(ruleId: string, isActive: boolean) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from("collection_rules").update({ is_active: isActive }).eq("id", ruleId)

    if (error) throw error

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error toggling collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function getCollectionRules(companyId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("collection_rules")
      .select(`
        *,
        steps:collection_rule_steps(*)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("[v0] Error fetching collection rules:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCollectionRuleStats(ruleId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.from("collection_rule_executions").select("status").eq("rule_id", ruleId)

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      sent: data?.filter((e) => e.status === "sent").length || 0,
      failed: data?.filter((e) => e.status === "failed").length || 0,
      pending: data?.filter((e) => e.status === "pending").length || 0,
    }

    return { success: true, data: stats }
  } catch (error: any) {
    console.error("[v0] Error fetching collection rule stats:", error)
    return { success: false, error: error.message, data: null }
  }
}
