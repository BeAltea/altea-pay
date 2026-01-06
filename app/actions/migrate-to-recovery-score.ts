"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Migra classificações de Score de Crédito para Score de Recuperação
 *
 * Este script atualiza todos os registros VMAX e collection_tasks
 * para usar o Score de Recuperação (Recupere) ao invés do Score de Crédito
 *
 * Novo critério:
 * - Recovery Score >= 294 (Classes C, B, A) → Cobrança Automática
 * - Recovery Score < 294 (Classes D, E, F) → Cobrança Manual
 */
export async function migrateToRecoveryScore() {
  try {
    const supabase = await createClient()

    console.log("[v0] Iniciando migração para Score de Recuperação...")

    // Passo 1: Buscar todos os registros VMAX com analysis_metadata
    const { data: vmaxRecords, error: fetchError } = await supabase
      .from("VMAX")
      .select("id, analysis_metadata, 'CPF/CNPJ'")
      .not("analysis_metadata", "is", null)

    if (fetchError) {
      console.error("[v0] Erro ao buscar registros VMAX:", fetchError)
      return { success: false, error: fetchError.message }
    }

    console.log(`[v0] Encontrados ${vmaxRecords?.length || 0} registros VMAX com dados de análise`)

    let updatedCount = 0
    let autoEnabledCount = 0
    let autoDisabledCount = 0

    // Passo 2: Processar cada registro
    for (const record of vmaxRecords || []) {
      try {
        // Extrai recovery_score do JSON
        const recupereData = record.analysis_metadata?.recupere?.resposta?.score

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
        const { error: updateError } = await supabase
          .from("VMAX")
          .update({
            recovery_score: recoveryScore,
            recovery_class: recoveryClass,
            recovery_description: recoveryDescription,
            auto_collection_enabled: autoCollectionEnabled,
          })
          .eq("id", record.id)

        if (updateError) {
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
    const { data: tasksData, error: tasksError } = await supabase
      .from("collection_tasks")
      .select("id, customer_id, metadata")
      .in("status", ["pending", "in_progress"])

    if (tasksError) {
      console.error("[v0] Erro ao buscar tarefas:", tasksError)
    } else {
      console.log(`[v0] Atualizando ${tasksData?.length || 0} tarefas pendentes...`)

      for (const task of tasksData || []) {
        try {
          // Busca o cliente associado
          const { data: customer } = await supabase
            .from("customers")
            .select("document")
            .eq("id", task.customer_id)
            .single()

          if (!customer?.document) continue

          // Busca o recovery_score do VMAX
          const { data: vmaxData } = await supabase
            .from("VMAX")
            .select("recovery_score, recovery_class")
            .eq("CPF/CNPJ", customer.document)
            .single()

          if (!vmaxData?.recovery_score) continue

          // Atualiza metadata da tarefa
          const updatedMetadata = {
            ...(task.metadata || {}),
            recovery_score: vmaxData.recovery_score,
            recovery_class: vmaxData.recovery_class,
            migration_note: "Migrado para usar Score de Recuperação",
          }

          const autoDispatchBlocked = vmaxData.recovery_score < 294

          await supabase
            .from("collection_tasks")
            .update({
              metadata: updatedMetadata,
              auto_dispatch_blocked: autoDispatchBlocked,
            })
            .eq("id", task.id)

          console.log(`[v0] ✓ Tarefa ${task.id} atualizada`)
        } catch (error) {
          console.error(`[v0] Erro ao atualizar tarefa ${task.id}:`, error)
        }
      }
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
