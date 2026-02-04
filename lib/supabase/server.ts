// DEPRECATED: This module has been replaced by Drizzle ORM + NextAuth.
// Use `import { db } from "@/lib/db"` for database queries
// Use `import { auth } from "@/lib/auth/config"` for authentication

/** @deprecated Use `import { db } from "@/lib/db"` and `import { auth } from "@/lib/auth/config"` instead */
export async function createClient() {
  throw new Error("createClient() from @/lib/supabase/server is deprecated. Use db from @/lib/db and auth from @/lib/auth/config")
}

/** @deprecated Use `import { db } from "@/lib/db"` instead */
export function createAdminClient() {
  throw new Error("createAdminClient() from @/lib/supabase/server is deprecated. Use db from @/lib/db")
}

/** @deprecated Use `import { db } from "@/lib/db"` and `import { auth } from "@/lib/auth/config"` instead */
export const createServerClient = createClient
