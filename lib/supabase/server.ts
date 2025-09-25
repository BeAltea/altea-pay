import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  console.log("[v0] Server - Creating Supabase client")

  try {
    const cookieStore = await cookies()
    console.log("[v0] Server - Got cookie store")

    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch (error) {
              console.log("[v0] Server - Cookie set error (expected in Server Components):", error)
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )

    console.log("[v0] Server - Supabase client created successfully")
    return client
  } catch (error) {
    console.error("[v0] Server - Error creating client:", error)
    throw error
  }
}

export { createClient as createServerClient }
