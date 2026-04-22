"use server"

import { createClient } from "@/lib/supabase/server"
import { consultarDocumento, type LocalizeResult } from "@/services/assertivaLocalizeService"

/**
 * Server action for Assertiva Localize queries
 *
 * This action wraps the existing consultarDocumento function with:
 * 1. Authentication check - only authenticated users can query
 * 2. Role check - only localize_only role (or super_admin) can access
 * 3. Logging for audit purposes
 */
export async function consultarDocumentoAction(documento: string): Promise<LocalizeResult> {
  // 1. Verify authentication
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      document: documento.replace(/\D/g, ""),
      documentType: documento.replace(/\D/g, "").length > 11 ? "cnpj" : "cpf",
      emails: [],
      bestEmail: null,
      phones: { best: null, allMoveis: [], allFixos: [] },
      error: "Nao autenticado. Faca login para continuar.",
    }
  }

  // 2. Verify role (localize_only or super_admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["localize_only", "super_admin"]
  if (!profile || !allowedRoles.includes(profile.role)) {
    return {
      success: false,
      document: documento.replace(/\D/g, ""),
      documentType: documento.replace(/\D/g, "").length > 11 ? "cnpj" : "cpf",
      emails: [],
      bestEmail: null,
      phones: { best: null, allMoveis: [], allFixos: [] },
      error: "Sem permissao para acessar este recurso.",
    }
  }

  // 3. Validate document format
  const cleanDoc = documento.replace(/\D/g, "")
  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    return {
      success: false,
      document: cleanDoc,
      documentType: cleanDoc.length > 11 ? "cnpj" : "cpf",
      emails: [],
      bestEmail: null,
      phones: { best: null, allMoveis: [], allFixos: [] },
      error: `Documento invalido: ${cleanDoc.length} digitos (esperado 11 para CPF ou 14 para CNPJ)`,
    }
  }

  // 4. Log the query for audit (optional - can be expanded later)
  console.log(`[LocalizeAction] User ${user.email} querying ${cleanDoc.length === 11 ? "CPF" : "CNPJ"}: ${cleanDoc.substring(0, 3)}***`)

  // 5. Execute the query using existing service
  const result = await consultarDocumento(cleanDoc)

  // 6. Log success/failure
  if (result.success) {
    console.log(`[LocalizeAction] Query successful for ${cleanDoc.substring(0, 3)}*** - Found: ${result.phones.allMoveis.length} mobiles, ${result.phones.allFixos.length} landlines, ${result.emails.length} emails`)
  } else {
    console.log(`[LocalizeAction] Query failed for ${cleanDoc.substring(0, 3)}***: ${result.error}`)
  }

  return result
}
