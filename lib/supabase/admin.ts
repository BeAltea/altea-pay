// DEPRECATED: This module has been replaced by Drizzle ORM.
// Use `import { db } from "@/lib/db"` for database queries.

/** @deprecated Use `import { db } from "@/lib/db"` instead */
export function createAdminClient() {
  throw new Error("createAdminClient() from @/lib/supabase/admin is deprecated. Use db from @/lib/db")
}
