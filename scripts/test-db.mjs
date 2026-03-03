import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const { data, error } = await supabase
  .from("VMAX")
  .select('id, Cliente, Email, "Telefone 1"')
  .eq("id", "778dd8a0-73cf-4d5f-bdbb-745ba0c7be85")
  .single()

console.log("Raw DB result:", JSON.stringify(data, null, 2))
console.log("Error:", error)
