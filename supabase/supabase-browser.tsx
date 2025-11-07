import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createSupabaseBrowserClient> | undefined

export function createBrowserClient(supabaseUrl: string, supabaseKey: string) {
  // Singleton pattern to prevent creating multiple clients
  if (client) {
    return client
  }

  client = createSupabaseBrowserClient(supabaseUrl, supabaseKey)

  return client
}
