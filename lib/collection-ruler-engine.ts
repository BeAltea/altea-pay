"use server"

import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS, sendWhatsApp } from "@/lib/notifications/sms"

interface CollectionRuleStep {
  id: string
  rule_id: string
  step_order: number
  days_after_due: number
  action_type: "email" | "sms" | "whatsapp" | "call_automatic" | "call_human" | "task"
  template_subject?: string
  template_content: string
  execution_time: string
  is_enabled: boolean
  retry_on_failure: boolean
  max_retries: number
}

interface CollectionRule {
  id: string
  name: string
  company_id: string
  is_active: boolean
  rule_version: number
  execution_mode: string
  start_date_field: "due_date" | "first_overdue" | "analysis_date" | "custom"
  requires_approval_status: string[]
  steps: CollectionRuleStep[]
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
 * Motor de Execução da Régua 2 (Régua de Cobrança Customizável)
 * Processa réguas de cobrança configuráveis por empresa
 */
export async function processCollectionRulers() {
  const supabase = await createClient()

  console.log("[v0] Collection Ruler Engine - Starting...")

  try {
    // 1. Buscar réguas ativas
    const { data: rules, error: rulesError } = await supabase
      .from("collection_rules")
      .select(`
        *,
        steps:collection_rule_steps(*)
      `)
      .eq("is_active", true)
      .eq("execution_mode", "automatic")
      .order("priority", { ascending: false })

    if (rulesError) throw rulesError
    if (!rules || rules.length === 0) {
      console.log("[v0] No active collection rules found")
      return { success: true, processed: 0 }
    }

    console.log(`[v0] Found ${rules.length} active collection rules`)

    let totalProcessed = 0

    // 2. Processar cada régua
    for (const rule of rules) {
      console.log(`[v0] Processing rule: ${rule.name} (${rule.id})`)

      const processed = await processRuleForCompany(rule as any)
      totalProcessed += processed
    }

    console.log(`[v0] Collection Ruler Engine - Finished. Processed ${totalProcessed} actions`)

    return {
      success: true,
      processed: totalProcessed,
      rules: rules.length,
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
 * Processa uma régua específica para uma empresa
 */
async function processRuleForCompany(rule: CollectionRule): Promise<number> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  try {
    // 1. Buscar dívidas elegíveis para esta régua
    const eligibleDebts = await getEligibleDebts(rule)

    if (eligibleDebts.length === 0) {
      console.log(`[v0] Rule ${rule.name}: No eligible debts found`)
      return 0
    }

    console.log(`[v0] Rule ${rule.name}: Found ${eligibleDebts.length} eligible debts`)

    let actionsProcessed = 0

    // 2. Para cada dívida, processar steps aplicáveis hoje
    for (const debt of eligibleDebts) {
      const startDate = new Date(debt.start_date)
      const todayDate = new Date(today)
      const daysOffset = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      console.log(`[v0] Debt ${debt.id}: Days offset = D${daysOffset}`)

      // 3. Encontrar steps que devem ser executados hoje (matching days_offset)
      const stepsToExecute = rule.steps
        .filter((step) => step.is_enabled && step.days_after_due === daysOffset)
        .sort((a, b) => a.step_order - b.step_order)

      if (stepsToExecute.length === 0) {
        console.log(`[v0] Debt ${debt.id}: No steps to execute today (D${daysOffset})`)
        continue
      }

      console.log(`[v0] Debt ${debt.id}: ${stepsToExecute.length} steps to execute`)

      // 4. Verificar se já foi executado hoje
      const { data: existingExecution } = await supabase
        .from("collection_rule_executions")
        .select("id")
        .eq("debt_id", debt.id)
        .eq("rule_id", rule.id)
        .eq("execution_date", today)
        .eq("days_offset", daysOffset)
        .single()

      if (existingExecution) {
        console.log(`[v0] Debt ${debt.id}: Already executed today, skipping`)
        continue
      }

      // 5. Executar cada step
      for (const step of stepsToExecute) {
        const executed = await executeStep(rule, step, debt, daysOffset, today)
        if (executed) actionsProcessed++
      }
    }

    // 6. Atualizar last_execution_at da régua
    await supabase
      .from("collection_rules")
      .update({
        last_execution_at: new Date().toISOString(),
        next_execution_at: getNextExecutionDate().toISOString(),
      })
      .eq("id", rule.id)

    return actionsProcessed
  } catch (error: any) {
    console.error(`[v0] Error processing rule ${rule.name}:`, error)
    return 0
  }
}

/**
 * Busca dívidas elegíveis para a régua
 */
async function getEligibleDebts(rule: CollectionRule): Promise<EligibleDebt[]> {
  const supabase = await createClient()

  // Query base: dívidas da empresa com status pendente/overdue
  const query = supabase
    .from("VMAX")
    .select(`
      id,
      Cliente,
      CPF/CNPJ,
      Email,
      Telefone,
      Vencido,
      Primeira_Vencida,
      approval_status,
      id_company,
      recovery_score,
      recovery_class
    `)
    .eq("id_company", rule.company_id)
    .in("approval_status", rule.requires_approval_status || ["ACEITA", "ACEITA_ESPECIAL"])
    .not("Email", "is", null)
    .not("Telefone", "is", null)

  const { data: vmaxDebts, error } = await query

  if (error) {
    console.error("[v0] Error fetching eligible debts:", error)
    return []
  }

  if (!vmaxDebts || vmaxDebts.length === 0) {
    return []
  }

  // Mapear para estrutura EligibleDebt
  const eligibleDebts: EligibleDebt[] = vmaxDebts
    .map((debt) => {
      let startDate = debt.Primeira_Vencida || debt.due_date || new Date().toISOString().split("T")[0]

      // Determinar data de referência baseado em start_date_field
      if (rule.start_date_field === "due_date") {
        startDate = debt.Primeira_Vencida || startDate
      } else if (rule.start_date_field === "first_overdue") {
        startDate = debt.Primeira_Vencida || startDate
      }

      return {
        id: debt.id,
        customer_id: debt.id, // Usando id da VMAX como customer_id
        company_id: debt.id_company,
        amount: Number.parseFloat(debt.Vencido || "0"),
        due_date: debt.Primeira_Vencida || startDate,
        customer_name: debt.Cliente || "Cliente",
        customer_email: debt.Email || "",
        customer_phone: debt.Telefone || "",
        approval_status: debt.approval_status || "",
        start_date: startDate,
        recovery_score: debt.recovery_score,
        recovery_class: debt.recovery_class,
      }
    })
    .filter((debt) => {
      // Abaixo disso, apenas cobrança manual é permitida
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
 * Executa um step específico da régua
 */
async function executeStep(
  rule: CollectionRule,
  step: CollectionRuleStep,
  debt: EligibleDebt,
  daysOffset: number,
  executionDate: string,
): Promise<boolean> {
  const supabase = await createClient()

  console.log(`[v0] Executing step ${step.step_order} (${step.action_type}) for debt ${debt.id}`)

  try {
    // 1. Criar registro de execução (pending)
    const { data: execution, error: insertError } = await supabase
      .from("collection_rule_executions")
      .insert({
        rule_id: rule.id,
        debt_id: debt.id,
        customer_id: debt.customer_id,
        company_id: debt.company_id,
        execution_date: executionDate,
        days_offset: daysOffset,
        start_date: debt.start_date,
        step_id: step.id,
        step_order: step.step_order,
        action_type: step.action_type,
        status: "processing",
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Preparar mensagem substituindo variáveis
    const message = prepareMessage(step.template_content, debt)
    const subject = step.template_subject ? prepareMessage(step.template_subject, debt) : undefined

    // 3. Executar ação baseado no tipo
    let success = false
    let errorMessage = ""

    switch (step.action_type) {
      case "email":
        if (debt.customer_email) {
          const emailResult = await sendEmail(debt.customer_email, subject || "Lembrete de Pagamento", message)
          success = emailResult.success
          errorMessage = emailResult.error || ""
        } else {
          errorMessage = "Email não disponível"
        }
        break

      case "sms":
        if (debt.customer_phone) {
          const smsResult = await sendSMS(debt.customer_phone, message)
          success = smsResult.success
          errorMessage = smsResult.error || ""
        } else {
          errorMessage = "Telefone não disponível"
        }
        break

      case "whatsapp":
        if (debt.customer_phone) {
          const whatsappResult = await sendWhatsApp(debt.customer_phone, message)
          success = whatsappResult.success
          errorMessage = whatsappResult.error || ""
        } else {
          errorMessage = "Telefone não disponível"
        }
        break

      case "call_automatic":
      case "call_human":
        // Criar tarefa para operador
        await supabase.from("collection_tasks").insert({
          debt_id: debt.id,
          customer_id: debt.customer_id,
          task_type: step.action_type === "call_automatic" ? "automatic_call" : "manual_call",
          priority: "medium",
          status: "pending",
          description: message,
          metadata: {
            rule_id: rule.id,
            step_id: step.id,
            days_offset: daysOffset,
          },
        })
        success = true
        break

      case "task":
        // Criar tarefa genérica
        await supabase.from("collection_tasks").insert({
          debt_id: debt.id,
          customer_id: debt.customer_id,
          task_type: "follow_up",
          priority: "medium",
          status: "pending",
          description: message,
          metadata: {
            rule_id: rule.id,
            step_id: step.id,
            days_offset: daysOffset,
          },
        })
        success = true
        break
    }

    // 4. Atualizar status da execução
    await supabase
      .from("collection_rule_executions")
      .update({
        status: success ? "sent" : "failed",
        sent_at: success ? new Date().toISOString() : null,
        error_message: errorMessage || null,
      })
      .eq("id", execution.id)

    // 5. Criar log em collection_actions
    await supabase.from("collection_actions").insert({
      debt_id: debt.id,
      customer_id: debt.customer_id,
      company_id: debt.company_id,
      action_type: step.action_type,
      status: success ? "sent" : "failed",
      message: message,
      sent_at: success ? new Date().toISOString() : null,
      metadata: {
        rule_id: rule.id,
        step_id: step.id,
        days_offset: daysOffset,
        execution_id: execution.id,
      },
    })

    console.log(`[v0] Step ${step.step_order} execution: ${success ? "SUCCESS" : "FAILED"}`)

    return success
  } catch (error: any) {
    console.error(`[v0] Error executing step:`, error)
    return false
  }
}

/**
 * Substitui variáveis no template da mensagem
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
 * Calcula próxima data de execução (amanhã)
 */
function getNextExecutionDate(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return tomorrow
}
