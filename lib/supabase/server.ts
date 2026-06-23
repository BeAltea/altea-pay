import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { resolveSupabaseUrl, resolveSupabaseAnonKey, resolveSupabaseServiceRoleKey } from "../db/target"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  try {
    const cookieStore = await cookies()

    // Contrato D: URL/anon resolvidos pela camada de abstração (DATABASE_TARGET).
    const client = createServerClient(resolveSupabaseUrl(), resolveSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignorar erro esperado em Server Components
          }
        },
      },
    })

    return client
  } catch (error) {
    throw error
  }
}

export function createAdminClient() {
  // Contrato D: URL/service-role resolvidos pela camada de abstração.
  return createServerClient(resolveSupabaseUrl(), resolveSupabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for admin client
      },
    },
  })
}

export { createClient as createServerClient }
