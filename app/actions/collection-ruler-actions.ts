"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { collectionRules, collectionRuleSteps, collectionRuleExecutions } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
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
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Criar a régua
    const [rule] = await db
      .insert(collectionRules)
      .values({
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        companyId: data.company_id,
        metadata: {
          userId: user.id,
          ruleVersion: data.rule_version || 2,
          executionMode: data.execution_mode || "automatic",
          startDateField: data.start_date_field || "due_date",
          isDefaultForCompany: data.is_default_for_company || false,
          requiresApprovalStatus: data.requires_approval_status || ["ACEITA", "ACEITA_ESPECIAL"],
        },
      })
      .returning()

    // 2. Criar os steps
    if (data.steps && data.steps.length > 0) {
      const stepsToInsert = data.steps.map((step) => ({
        ruleId: rule.id,
        stepOrder: step.step_order,
        actionType: step.action_type,
        messageTemplate: step.template_content,
        delayDays: step.days_after_due,
        metadata: {
          templateSubject: step.template_subject,
          executionTime: step.execution_time || "09:00:00",
          isEnabled: step.is_enabled !== false,
        },
      }))

      await db.insert(collectionRuleSteps).values(stepsToInsert)
    }

    revalidatePath("/dashboard/collection-rulers")

    return { success: true, data: rule }
  } catch (error: any) {
    console.error("[v0] Error creating collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function updateCollectionRule(ruleId: string, data: Partial<CreateCollectionRuleData>) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Atualizar a régua
    await db
      .update(collectionRules)
      .set({
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        metadata: {
          executionMode: data.execution_mode,
          startDateField: data.start_date_field,
          isDefaultForCompany: data.is_default_for_company,
          requiresApprovalStatus: data.requires_approval_status,
        },
      })
      .where(eq(collectionRules.id, ruleId))

    // 2. Atualizar steps se fornecidos
    if (data.steps) {
      // Deletar steps antigos
      await db.delete(collectionRuleSteps).where(eq(collectionRuleSteps.ruleId, ruleId))

      // Inserir novos steps
      const stepsToInsert = data.steps.map((step) => ({
        ruleId: ruleId,
        stepOrder: step.step_order,
        actionType: step.action_type,
        messageTemplate: step.template_content,
        delayDays: step.days_after_due,
        metadata: {
          templateSubject: step.template_subject,
          executionTime: step.execution_time || "09:00:00",
          isEnabled: step.is_enabled !== false,
        },
      }))

      await db.insert(collectionRuleSteps).values(stepsToInsert)
    }

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error updating collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteCollectionRule(ruleId: string) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(collectionRules).where(eq(collectionRules.id, ruleId))

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error deleting collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function toggleCollectionRule(ruleId: string, isActive: boolean) {
  try {
    await db.update(collectionRules).set({ isActive }).where(eq(collectionRules.id, ruleId))

    revalidatePath("/dashboard/collection-rulers")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error toggling collection rule:", error)
    return { success: false, error: error.message }
  }
}

export async function getCollectionRules(companyId: string) {
  try {
    const rules = await db
      .select()
      .from(collectionRules)
      .where(eq(collectionRules.companyId, companyId))
      .orderBy(desc(collectionRules.createdAt))

    // Fetch steps for each rule
    const rulesWithSteps = await Promise.all(
      rules.map(async (rule) => {
        const steps = await db
          .select()
          .from(collectionRuleSteps)
          .where(eq(collectionRuleSteps.ruleId, rule.id))

        return { ...rule, steps }
      })
    )

    return { success: true, data: rulesWithSteps || [] }
  } catch (error: any) {
    console.error("[v0] Error fetching collection rules:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getCollectionRuleStats(ruleId: string) {
  try {
    const data = await db
      .select({ status: collectionRuleExecutions.status })
      .from(collectionRuleExecutions)
      .where(eq(collectionRuleExecutions.ruleId, ruleId))

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
