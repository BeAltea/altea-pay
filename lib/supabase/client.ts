// DEPRECATED: This module has been replaced by NextAuth.
// Use `import { useSession, signOut } from "next-auth/react"` for client-side auth.
// Use server actions or API routes for data queries.

/** @deprecated Use NextAuth useSession/signOut instead */
export function createClient() {
  throw new Error("createClient() from @/lib/supabase/client is deprecated. Use NextAuth useSession/signOut")
}

/** @deprecated Use NextAuth useSession/signOut instead */
export function createBrowserClient() {
  return createClient()
}

export function resetClient() {
  // no-op
}
