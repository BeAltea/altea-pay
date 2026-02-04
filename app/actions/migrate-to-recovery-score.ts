"use server"

import { db } from "@/lib/db"
import { vmax, collectionTasks, customers } from "@/lib/db/schema"
import { eq, isNotNull, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Migra classificações de Score de Crédito para Score de Recuperação
 *
 * Este script atualiza todos os registros VMAX e collection_tasks
 * para usar o Score de Recuperação (Recupere) ao invés do Score de Crédito
 *
 * Novo critério:
 * - Recovery Score >= 294 (Classes C, B, A) -> Cobrança Automática
 * - Recovery Score < 294 (Classes D, E, F) -> Cobrança Manual
 */
export async function migrateToRecoveryScore() {
  try {
    console.log("[v0] Iniciando migração para Score de Recuperação...")

    // Passo 1: Buscar todos os registros VMAX com analysis_metadata
    const vmaxRecords = await db
      .select({ id: vmax.id, analysisMetadata: vmax.analysisMetadata, cpfCnpj: vmax.cpfCnpj })
      .from(vmax)
      .where(isNotNull(vmax.analysisMetadata))

    console.log(`[v0] Encontrados ${vmaxRecords?.length || 0} registros VMAX com dados de análise`)

    let updatedCount = 0
    let autoEnabledCount = 0
    let autoDisabledCount = 0

    // Passo 2: Processar cada registro
    for (const record of vmaxRecords || []) {
      try {
        // Extrai recovery_score do JSON
        const recupereData = (record.analysisMetadata as any)?.recupere?.resposta?.score

        if (!recupereData?.pontos) {
          console.log(`[v0] Registro ${record.id} não tem dados de recuperação`)
          continue
        }

        const recoveryScore = Number(recupereData.pontos)
        const recoveryClass = recupereData.classe || "F"
        const recoveryDescription = recupereData.faixa?.descricao || "Sem informação"

        // Determina se pode ter cobrança automática
        const autoCollectionEnabled = recoveryScore >= 294

        // Atualiza registro VMAX
        try {
          await db
            .update(vmax)
            .set({
              autoCollectionEnabled: autoCollectionEnabled,
              analysisMetadata: {
                ...(record.analysisMetadata as any),
                recovery_score: recoveryScore,
                recovery_class: recoveryClass,
                recovery_description: recoveryDescription,
              },
            })
            .where(eq(vmax.id, record.id))
        } catch (updateError) {
          console.error(`[v0] Erro ao atualizar VMAX ${record.id}:`, updateError)
          continue
        }

        updatedCount++
        if (autoCollectionEnabled) {
          autoEnabledCount++
        } else {
          autoDisabledCount++
        }

        console.log(
          `[v0] ✓ ${record.id}: Score ${recoveryScore} (Classe ${recoveryClass}) - Auto: ${autoCollectionEnabled}`,
        )
      } catch (error) {
        console.error(`[v0] Erro ao processar registro ${record.id}:`, error)
      }
    }

    // Passo 3: Atualizar tarefas pendentes
    try {
      const tasksData = await db
        .select({ id: collectionTasks.id, customerId: collectionTasks.customerId, metadata: collectionTasks.metadata })
        .from(collectionTasks)
        .where(inArray(collectionTasks.status, ["pending", "in_progress"]))

      console.log(`[v0] Atualizando ${tasksData?.length || 0} tarefas pendentes...`)

      for (const task of tasksData || []) {
        try {
          // Busca o cliente associado
          if (!task.customerId) continue

          const [customer] = await db
            .select({ document: customers.document })
            .from(customers)
            .where(eq(customers.id, task.customerId))
            .limit(1)

          if (!customer?.document) continue

          // Busca o recovery_score do VMAX
          const [vmaxData] = await db
            .select({ analysisMetadata: vmax.analysisMetadata, autoCollectionEnabled: vmax.autoCollectionEnabled })
            .from(vmax)
            .where(eq(vmax.cpfCnpj, customer.document))
            .limit(1)

          const recoveryScore = (vmaxData?.analysisMetadata as any)?.recovery_score
          const recoveryClass = (vmaxData?.analysisMetadata as any)?.recovery_class

          if (!recoveryScore) continue

          // Atualiza metadata da tarefa
          const updatedMetadata = {
            ...((task.metadata as any) || {}),
            recovery_score: recoveryScore,
            recovery_class: recoveryClass,
            migration_note: "Migrado para usar Score de Recuperação",
            auto_dispatch_blocked: recoveryScore < 294,
          }

          await db
            .update(collectionTasks)
            .set({
              metadata: updatedMetadata,
            })
            .where(eq(collectionTasks.id, task.id))

          console.log(`[v0] ✓ Tarefa ${task.id} atualizada`)
        } catch (error) {
          console.error(`[v0] Erro ao atualizar tarefa ${task.id}:`, error)
        }
      }
    } catch (tasksError) {
      console.error("[v0] Erro ao buscar tarefas:", tasksError)
    }

    // Revalidar caches
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/clientes")
    revalidatePath("/super-admin/companies")

    console.log("[v0] ========================================")
    console.log("[v0] MIGRAÇÃO CONCLUÍDA")
    console.log(`[v0] Total atualizado: ${updatedCount}`)
    console.log(`[v0] Cobrança automática habilitada: ${autoEnabledCount}`)
    console.log(`[v0] Cobrança manual obrigatória: ${autoDisabledCount}`)
    console.log("[v0] ========================================")

    return {
      success: true,
      updated: updatedCount,
      autoEnabled: autoEnabledCount,
      autoDisabled: autoDisabledCount,
    }
  } catch (error) {
    console.error("[v0] Erro na migração:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
