import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let clientInstance: SupabaseClient | null = null

export function createClient() {
  // Return existing instance if already created
  if (clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables. Please check your configuration.")
  }

  // Extract subdomain for unique storage key
  const subdomain = supabaseUrl.split("//")[1]?.split(".")[0] || "supabase"

  // Create new instance only if it doesn't exist
  clientInstance = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: `sb-${subdomain}-auth-token`,
    },
    global: {
      headers: {
        "X-Client-Info": "cobrancaauto-web",
      },
    },
  })

  return clientInstance
}

export function createBrowserClient() {
  return createClient()
}

// Reset function for testing or hot reload
export function resetClient() {
  clientInstance = null
}
