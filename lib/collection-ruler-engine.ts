"use server"

import { db } from "@/lib/db"
import { collectionRules, collectionRuleSteps, collectionRuleExecutions, collectionActions, collectionTasks, vmax } from "@/lib/db/schema"
import { eq, and, desc, inArray, isNotNull } from "drizzle-orm"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS, sendWhatsApp } from "@/lib/notifications/sms"

interface CollectionRuleStep {
  id: string
  ruleId: string
  stepOrder: number
  days_after_due?: number
  actionType: "email" | "sms" | "whatsapp" | "call_automatic" | "call_human" | "task"
  template_subject?: string
  template_content?: string
  execution_time?: string
  is_enabled?: boolean
  retry_on_failure?: boolean
  max_retries?: number
  delayDays: number | null
  messageTemplate: string | null
  conditions: any
  metadata: any
}

interface CollectionRule {
  id: string
  name: string
  companyId: string
  isActive: boolean | null
  execution_mode?: string
  start_date_field?: "due_date" | "first_overdue" | "analysis_date" | "custom"
  requires_approval_status?: string[]
  steps: CollectionRuleStep[]
  priority: number | null
  metadata: any
}

interface EligibleDebt {
  id: string
  customer_id: string
  company_id: string
  amount: number
  due_date: string
  customer_name: string
  customer_email: string
  customer_phone: string
  approval_status: string
  start_date: string
  recovery_score?: number
  recovery_class?: string
}

/**
 * Motor de Execucao da Regua 2 (Regua de Cobranca Customizavel)
 * Processa reguas de cobranca configuraveis por empresa
 */
export async function processCollectionRulers() {
  console.log("[v0] Collection Ruler Engine - Starting...")

  try {
    // 1. Buscar reguas ativas
    const rules = await db
      .select()
      .from(collectionRules)
      .where(
        and(
          eq(collectionRules.isActive, true),
        )
      )
      .orderBy(desc(collectionRules.priority))

    // Filter for automatic execution_mode from metadata
    const automaticRules = rules.filter((rule: any) => {
      const meta = rule.metadata as any
      return meta?.execution_mode === "automatic"
    })

    if (!automaticRules || automaticRules.length === 0) {
      console.log("[v0] No active collection rules found")
      return { success: true, processed: 0 }
    }

    console.log(`[v0] Found ${automaticRules.length} active collection rules`)

    let totalProcessed = 0

    // 2. Processar cada regua
    for (const rule of automaticRules) {
      console.log(`[v0] Processing rule: ${rule.name} (${rule.id})`)

      // Fetch steps for this rule
      const steps = await db
        .select()
        .from(collectionRuleSteps)
        .where(eq(collectionRuleSteps.ruleId, rule.id))

      const ruleWithSteps: CollectionRule = {
        ...rule,
        execution_mode: (rule.metadata as any)?.execution_mode,
        start_date_field: (rule.metadata as any)?.start_date_field,
        requires_approval_status: (rule.metadata as any)?.requires_approval_status,
        steps: steps.map((s) => ({
          ...s,
          days_after_due: s.delayDays ?? 0,
          template_content: s.messageTemplate || "",
          template_subject: (s.metadata as any)?.template_subject,
          execution_time: (s.metadata as any)?.execution_time,
          is_enabled: (s.metadata as any)?.is_enabled !== false,
          retry_on_failure: (s.metadata as any)?.retry_on_failure ?? false,
          max_retries: (s.metadata as any)?.max_retries ?? 0,
        })),
      }

      const processed = await processRuleForCompany(ruleWithSteps)
      totalProcessed += processed
    }

    console.log(`[v0] Collection Ruler Engine - Finished. Processed ${totalProcessed} actions`)

    return {
      success: true,
      processed: totalProcessed,
      rules: automaticRules.length,
    }
  } catch (error: any) {
    console.error("[v0] Collection Ruler Engine - Error:", error)
    return {
      success: false,
      error: error.message,
      processed: 0,
    }
  }
}

/**
 * Processa uma regua especifica para uma empresa
 */
async function processRuleForCompany(rule: CollectionRule): Promise<number> {
  const today = new Date().toISOString().split("T")[0]

  try {
    // 1. Buscar dividas elegiveis para esta regua
    const eligibleDebts = await getEligibleDebts(rule)

    if (eligibleDebts.length === 0) {
      console.log(`[v0] Rule ${rule.name}: No eligible debts found`)
      return 0
    }

    console.log(`[v0] Rule ${rule.name}: Found ${eligibleDebts.length} eligible debts`)

    let actionsProcessed = 0

    // 2. Para cada divida, processar steps aplicaveis hoje
    for (const debt of eligibleDebts) {
      const startDate = new Date(debt.start_date)
      const todayDate = new Date(today)
      const daysOffset = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      console.log(`[v0] Debt ${debt.id}: Days offset = D${daysOffset}`)

      // 3. Encontrar steps que devem ser executados hoje (matching days_offset)
      const stepsToExecute = rule.steps
        .filter((step) => step.is_enabled && step.days_after_due === daysOffset)
        .sort((a, b) => a.stepOrder - b.stepOrder)

      if (stepsToExecute.length === 0) {
        console.log(`[v0] Debt ${debt.id}: No steps to execute today (D${daysOffset})`)
        continue
      }

      console.log(`[v0] Debt ${debt.id}: ${stepsToExecute.length} steps to execute`)

      // 4. Verificar se ja foi executado hoje
      const existingExecutions = await db
        .select({ id: collectionRuleExecutions.id })
        .from(collectionRuleExecutions)
        .where(
          and(
            eq(collectionRuleExecutions.ruleId, rule.id),
          )
        )
        .limit(1)

      // Filter by debt_id and execution_date from metadata since those columns may not exist
      const alreadyExecuted = existingExecutions.some((exec: any) => {
        const meta = exec.metadata as any
        return meta?.debt_id === debt.id && meta?.execution_date === today && meta?.days_offset === daysOffset
      })

      if (alreadyExecuted) {
        console.log(`[v0] Debt ${debt.id}: Already executed today, skipping`)
        continue
      }

      // 5. Executar cada step
      for (const step of stepsToExecute) {
        const executed = await executeStep(rule, step, debt, daysOffset, today)
        if (executed) actionsProcessed++
      }
    }

    // 6. Atualizar last_execution_at da regua
    await db
      .update(collectionRules)
      .set({
        metadata: {
          ...(rule.metadata as any),
          last_execution_at: new Date().toISOString(),
          next_execution_at: getNextExecutionDate().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(collectionRules.id, rule.id))

    return actionsProcessed
  } catch (error: any) {
    console.error(`[v0] Error processing rule ${rule.name}:`, error)
    return 0
  }
}

/**
 * Busca dividas elegiveis para a regua
 */
async function getEligibleDebts(rule: CollectionRule): Promise<EligibleDebt[]> {
  // Query base: dividas da empresa com status pendente/overdue
  const vmaxDebts = await db
    .select()
    .from(vmax)
    .where(
      eq(vmax.idCompany, rule.companyId)
    )

  if (!vmaxDebts || vmaxDebts.length === 0) {
    return []
  }

  // Filter by approval_status and contact info in application layer
  const requiredStatuses = rule.requires_approval_status || ["ACEITA", "ACEITA_ESPECIAL"]
  const filteredDebts = vmaxDebts.filter((debt) => {
    return requiredStatuses.includes(debt.approvalStatus || "") &&
      debt.cpfCnpj // has some contact info (Email/Phone stored in metadata or separate fields)
  })

  // Mapear para estrutura EligibleDebt
  const eligibleDebts: EligibleDebt[] = filteredDebts
    .map((debt: any) => {
      let startDate = debt.primeiraVencida || new Date().toISOString().split("T")[0]

      // Determinar data de referencia baseado em start_date_field
      if (rule.start_date_field === "due_date") {
        startDate = debt.primeiraVencida || startDate
      } else if (rule.start_date_field === "first_overdue") {
        startDate = debt.primeiraVencida || startDate
      }

      const meta = debt.analysisMetadata as any

      return {
        id: debt.id,
        customer_id: debt.id,
        company_id: debt.idCompany || "",
        amount: Number.parseFloat(debt.valorTotal || "0"),
        due_date: debt.primeiraVencida || startDate,
        customer_name: debt.cliente || "Cliente",
        customer_email: meta?.email || "",
        customer_phone: meta?.phone || meta?.telefone1 || "",
        approval_status: debt.approvalStatus || "",
        start_date: startDate,
        recovery_score: meta?.recovery_score,
        recovery_class: meta?.recovery_class,
      }
    })
    .filter((debt: EligibleDebt) => {
      // Abaixo disso, apenas cobranca manual e permitida
      const hasContact = debt.customer_email || debt.customer_phone
      const recoveryScore = debt.recovery_score || 0
      const isEligibleForAutoCollection = recoveryScore >= 294

      if (!isEligibleForAutoCollection) {
        console.log(
          `[v0] Debt ${debt.id}: Recovery Score ${recoveryScore} (${debt.recovery_class || "N/A"}) - AUTO COLLECTION BLOCKED`,
        )
      }

      return hasContact && isEligibleForAutoCollection
    })

  return eligibleDebts
}

/**
 * Executa um step especifico da regua
 */
async function executeStep(
  rule: CollectionRule,
  step: CollectionRuleStep,
  debt: EligibleDebt,
  daysOffset: number,
  executionDate: string,
): Promise<boolean> {
  console.log(`[v0] Executing step ${step.stepOrder} (${step.actionType}) for debt ${debt.id}`)

  try {
    // 1. Criar registro de execucao (pending)
    const [execution] = await db
      .insert(collectionRuleExecutions)
      .values({
        ruleId: rule.id,
        companyId: debt.company_id,
        customerId: debt.customer_id,
        status: "processing",
        metadata: {
          debt_id: debt.id,
          execution_date: executionDate,
          days_offset: daysOffset,
          start_date: debt.start_date,
          step_id: step.id,
          step_order: step.stepOrder,
          action_type: step.actionType,
        },
      })
      .returning()

    if (!execution) throw new Error("Failed to create execution record")

    // 2. Preparar mensagem substituindo variaveis
    const message = prepareMessage(step.template_content || "", debt)
    const subject = step.template_subject ? prepareMessage(step.template_subject, debt) : undefined

    // 3. Executar acao baseado no tipo
    let success = false
    let errorMessage = ""

    switch (step.actionType) {
      case "email":
        if (debt.customer_email) {
          const emailResult = await sendEmail(debt.customer_email, subject || "Lembrete de Pagamento", message)
          success = emailResult.success
          errorMessage = emailResult.error || ""
        } else {
          errorMessage = "Email nao disponivel"
        }
        break

      case "sms":
        if (debt.customer_phone) {
          const smsResult = await sendSMS(debt.customer_phone, message)
          success = smsResult.success
          errorMessage = smsResult.error || ""
        } else {
          errorMessage = "Telefone nao disponivel"
        }
        break

      case "whatsapp":
        if (debt.customer_phone) {
          const whatsappResult = await sendWhatsApp(debt.customer_phone, message)
          success = whatsappResult.success
          errorMessage = whatsappResult.error || ""
        } else {
          errorMessage = "Telefone nao disponivel"
        }
        break

      case "call_automatic":
      case "call_human":
        // Criar tarefa para operador
        await db.insert(collectionTasks).values({
          customerId: debt.customer_id,
          taskType: step.actionType === "call_automatic" ? "automatic_call" : "manual_call",
          status: "pending",
          metadata: {
            debt_id: debt.id,
            priority: "medium",
            description: message,
            rule_id: rule.id,
            step_id: step.id,
            days_offset: daysOffset,
          },
        })
        success = true
        break

      case "task":
        // Criar tarefa generica
        await db.insert(collectionTasks).values({
          customerId: debt.customer_id,
          taskType: "follow_up",
          status: "pending",
          metadata: {
            debt_id: debt.id,
            priority: "medium",
            description: message,
            rule_id: rule.id,
            step_id: step.id,
            days_offset: daysOffset,
          },
        })
        success = true
        break
    }

    // 4. Atualizar status da execucao
    await db
      .update(collectionRuleExecutions)
      .set({
        status: success ? "sent" : "failed",
        executedAt: success ? new Date() : null,
        error: errorMessage || null,
      })
      .where(eq(collectionRuleExecutions.id, execution.id))

    // 5. Criar log em collection_actions
    await db.insert(collectionActions).values({
      customerId: debt.customer_id,
      companyId: debt.company_id,
      actionType: step.actionType,
      status: success ? "sent" : "failed",
      message: message,
      metadata: {
        rule_id: rule.id,
        step_id: step.id,
        days_offset: daysOffset,
        execution_id: execution.id,
        sent_at: success ? new Date().toISOString() : null,
      },
    })

    console.log(`[v0] Step ${step.stepOrder} execution: ${success ? "SUCCESS" : "FAILED"}`)

    return success
  } catch (error: any) {
    console.error(`[v0] Error executing step:`, error)
    return false
  }
}

/**
 * Substitui variaveis no template da mensagem
 */
function prepareMessage(template: string, debt: EligibleDebt): string {
  return template
    .replace(/\{customer_name\}/g, debt.customer_name)
    .replace(/\{amount\}/g, debt.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
    .replace(/\{due_date\}/g, new Date(debt.due_date).toLocaleDateString("pt-BR"))
    .replace(
      /\{days_overdue\}/g,
      Math.floor((new Date().getTime() - new Date(debt.due_date).getTime()) / (1000 * 60 * 60 * 24)).toString(),
    )
}

/**
 * Calcula proxima data de execucao (amanha)
 */
function getNextExecutionDate(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return tomorrow
}
