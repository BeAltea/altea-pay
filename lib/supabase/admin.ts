import { createClient } from "@supabase/supabase-js"
import { resolveSupabaseUrl, resolveSupabaseServiceRoleKey } from "../db/target"

export function createAdminClient() {
  // Contrato D: resolve via camada de abstração (supabase default ou
  // local-postgres = Supabase self-hosted). Em supabase, idêntico ao anterior.
  const supabaseUrl = resolveSupabaseUrl()
  const supabaseServiceKey = resolveSupabaseServiceRoleKey()

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
