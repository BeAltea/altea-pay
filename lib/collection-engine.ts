"use server"

import { db } from "@/lib/db"
import { integrationLogs, collectionRules, debts, customers, companies, collectionActions, collectionTasks } from "@/lib/db/schema"
import { eq, and, gte, lte, desc } from "drizzle-orm"
import { sendEmail, generateDebtCollectionEmail } from "@/lib/notifications/email"
import { sendSMS, generateDebtCollectionSMS } from "@/lib/notifications/sms"

export type RiskTier = "LOW" | "MEDIUM" | "HIGH"
export type TaskType = "AUTO_MESSAGE" | "ASSISTED_COLLECTION" | "MANUAL_COLLECTION"
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

/**
 * Motor de Regras de Cobranca Automatica
 * Processa dividas baseado no score de recuperacao do devedor
 */
export async function processCollectionByScore(params: {
  debtId: string
  customerId: string
  cpf: string
  amount: number
  dueDate: string
}) {
  try {
    // 1. Chamar endpoint /score-check para obter recovery_score
    const scoreResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/score-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpf: params.cpf,
        customerId: params.customerId,
        debtId: params.debtId,
      }),
    })

    if (!scoreResponse.ok) {
      throw new Error("Falha ao verificar score de recuperacao")
    }

    const scoreData = await scoreResponse.json()
    const { recovery_score, recovery_class } = scoreData

    console.log(
      `[v0] Collection Engine - Debt: ${params.debtId}, Recovery Score: ${recovery_score}, Recovery Class: ${recovery_class}`,
    )

    // 2. Motor de Regras interpreta o score de recuperacao e executa acao
    let actionResult: any

    // Processa reguas de cobranca (padrao + customizadas)
    actionResult = await processCollectionRules(params.debtId, params.customerId, recovery_score)

    // 3. Registrar log de auditoria
    await db.insert(integrationLogs).values({
      action: "auto_collection_process",
      status: "success",
      details: {
        integration_name: "collection_engine",
        operation: "auto_collection_process",
        request_data: {
          debt_id: params.debtId,
          customer_id: params.customerId,
          cpf: params.cpf,
          amount: params.amount,
        },
        response_data: {
          recovery_score,
          recovery_class,
          action: actionResult?.action,
          task_id: actionResult?.taskId,
        },
      },
    })

    return {
      success: true,
      recovery_score,
      recovery_class,
      action: actionResult?.action,
      message: actionResult?.message,
    }
  } catch (error: any) {
    console.error("[v0] Collection Engine Error:", error)

    await db.insert(integrationLogs).values({
      action: "auto_collection_process",
      status: "error",
      details: {
        integration_name: "collection_engine",
        operation: "auto_collection_process",
        request_data: params,
        response_data: { error: error.message },
      },
    })

    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Processa reguas de cobranca (padrao + customizadas)
 */
export async function processCollectionRules(debtId: string, customerId: string, recoveryScore: number) {
  try {
    // 1. Verificar se existe regua customizada para este cliente
    const customRulesResult = await db
      .select()
      .from(collectionRules)
      .where(
        and(
          eq(collectionRules.isActive, true),
        )
      )
      .orderBy(desc(collectionRules.priority))
      .limit(1)

    // Filter by rule_type custom, score range, and active_for_customers in application layer
    // since these columns may not exist in the Drizzle schema
    const filteredRules = customRulesResult.filter((rule: any) => {
      const meta = rule.metadata as any
      return meta?.rule_type === "custom" &&
        (meta?.active_for_customers || []).includes(customerId) &&
        (meta?.max_score ?? Infinity) >= recoveryScore &&
        (meta?.min_score ?? -Infinity) <= recoveryScore
    })

    if (filteredRules.length > 0) {
      // Usar regua customizada
      console.log(`[v0] Using custom rule for customer ${customerId}:`, filteredRules[0].name)
      return await applyCustomRule(debtId, customerId, filteredRules[0], recoveryScore)
    }

    // 2. Se nao houver regua customizada, usar regua padrao baseada em recovery score
    console.log(`[v0] Using default rule for customer ${customerId}`)
    return await applyDefaultRule(debtId, customerId, recoveryScore)
  } catch (error) {
    console.error("[v0] Error processing collection rules:", error)
    throw error
  }
}

/**
 * Aplica regua customizada
 */
async function applyCustomRule(debtId: string, customerId: string, rule: any, recoveryScore: number) {
  const meta = rule.metadata as any
  const processType = meta?.process_type

  console.log(`[v0] Applying custom rule: ${rule.name} (${processType})`)

  if (processType === "automatic") {
    // Disparo automatico
    return await dispatchAutoMessage({ debtId, customerId })
  } else if (processType === "semi_automatic") {
    // Tarefa assistida
    return await createAssistedCollectionTask({
      debtId,
      customerId,
      priority: rule.priority,
      description: `Regua customizada: ${rule.name} - Recovery Score: ${recoveryScore}`,
    })
  } else {
    // Manual
    return await createManualCollectionTask({
      debtId,
      customerId,
      priority: rule.priority,
      description: `Regua customizada (manual): ${rule.name} - Recovery Score: ${recoveryScore}`,
    })
  }
}

/**
 * Aplica regua padrao do sistema
 * Nova logica baseada em Recovery Score:
 * - Score >= 294 (Classes C, B, A): Cobranca automatica
 * - Score < 294 (Classes D, E, F): Cobranca manual
 */
async function applyDefaultRule(debtId: string, customerId: string, recoveryScore: number) {
  if (recoveryScore >= 294) {
    // CLASSES C, B, A - Cobranca automatica permitida
    console.log(`[v0] Recovery Score ${recoveryScore} >= 294 - Automatic collection allowed`)
    return await dispatchAutoMessage({ debtId, customerId })
  } else {
    // CLASSES D, E, F - Cobranca manual obrigatoria
    console.log(`[v0] Recovery Score ${recoveryScore} < 294 - Manual collection required`)
    return await createManualCollectionTask({
      debtId,
      customerId,
      priority: "high",
      description: `Cobranca manual obrigatoria - Recovery Score: ${recoveryScore} (Classes D, E ou F). Disparos automaticos bloqueados.`,
    })
  }
}

/**
 * RISCO BAIXO - Dispara mensagem automatica
 */
async function dispatchAutoMessage(params: any) {
  // Buscar dados do cliente e empresa
  const debtResults = await db
    .select({
      debt: debts,
      customer: customers,
      company: companies,
    })
    .from(debts)
    .innerJoin(customers, eq(debts.customerId, customers.id))
    .innerJoin(companies, eq(debts.companyId, companies.id))
    .where(eq(debts.id, params.debtId))
    .limit(1)

  const debtRow = debtResults[0]

  if (!debtRow || !debtRow.customer) {
    throw new Error("Cliente nao encontrado")
  }

  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/user-dashboard/debts/${params.debtId}`

  // Enviar por Email
  if (debtRow.customer.email) {
    const emailHtml = await generateDebtCollectionEmail({
      customerName: debtRow.customer.name,
      debtAmount: debtRow.debt.amount,
      dueDate: debtRow.debt.dueDate ? new Date(debtRow.debt.dueDate).toLocaleDateString("pt-BR") : "",
      companyName: debtRow.company.name,
      paymentLink,
    })

    await sendEmail({
      to: debtRow.customer.email,
      subject: `Cobranca Automatica - ${debtRow.company.name}`,
      html: emailHtml,
    })
  }

  // Enviar por SMS
  if (debtRow.customer.phone) {
    const smsBody = await generateDebtCollectionSMS({
      customerName: debtRow.customer.name,
      debtAmount: debtRow.debt.amount,
      companyName: debtRow.company.name,
      paymentLink,
    })

    await sendSMS({
      to: debtRow.customer.phone,
      body: smsBody,
    })
  }

  // Registrar acao automatica
  await db.insert(collectionActions).values({
    actionType: "auto_message",
    status: "sent",
    companyId: debtRow.debt.companyId,
  })

  return {
    action: "AUTO_MESSAGE",
    message: "Mensagem automatica enviada com sucesso (Email + SMS)",
  }
}

/**
 * RISCO MEDIO - Cria tarefa de cobranca assistida
 */
async function createAssistedCollectionTask(params: any) {
  const [task] = await db
    .insert(collectionTasks)
    .values({
      customerId: params.customerId,
      taskType: "ASSISTED_COLLECTION",
      status: "pending",
      metadata: {
        debt_id: params.debtId,
        priority: params.priority || "medium",
        description: params.description || `Cobranca assistida via WhatsApp - Cliente com risco medio (Score 350-490)`,
        amount: params.amount,
        due_date: params.dueDate,
      },
    })
    .returning()

  return {
    action: "ASSISTED_COLLECTION",
    taskId: task?.id,
    message: "Tarefa de cobranca assistida criada para operador humano",
  }
}

/**
 * RISCO ALTO - Cria tarefa manual e bloqueia automacao
 */
async function createManualCollectionTask(params: any) {
  const [task] = await db
    .insert(collectionTasks)
    .values({
      customerId: params.customerId,
      taskType: "MANUAL_COLLECTION",
      status: "pending",
      metadata: {
        debt_id: params.debtId,
        priority: params.priority || "high",
        description:
          params.description ||
          `Cobranca 100% manual - Cliente com alto risco (Score < 350). Disparos automaticos bloqueados.`,
        amount: params.amount,
        due_date: params.dueDate,
        auto_dispatch_blocked: true,
      },
    })
    .returning()

  return {
    action: "MANUAL_COLLECTION",
    taskId: task?.id,
    message: "Tarefa de cobranca manual criada. Disparos automaticos bloqueados.",
  }
}
