import { drizzle } from "drizzle-orm/neon-http"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

function createDb() {
  const url = process.env.DATABASE_URL!

  // Use node-postgres for standard PostgreSQL connections (Docker, self-hosted)
  // Use @neondatabase/serverless for Neon/Vercel/Supabase (websocket) connections
  if (url.includes("neon.tech") || url.includes("supabase.co")) {
    const { neon } = require("@neondatabase/serverless")
    const sql = neon(url)
    return drizzle(sql, { schema })
  }

  const { Pool } = require("pg")
  const pool = new Pool({ connectionString: url })
  return drizzlePg(pool, { schema })
}

export const db = createDb()
