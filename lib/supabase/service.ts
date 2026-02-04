// DEPRECATED: This module has been replaced by Drizzle ORM.
// Use `import { db } from "@/lib/db"` for database queries.

/** @deprecated Use `import { db } from "@/lib/db"` instead */
export function createServiceClient() {
  throw new Error("createServiceClient() from @/lib/supabase/service is deprecated. Use db from @/lib/db")
}
