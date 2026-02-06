import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const allEnvKeys = Object.keys(process.env).sort()
  const asaasKey = process.env.ASAAS_API_KEY
  const rawValue = process.env["ASAAS_API_KEY"]
  
  return NextResponse.json({
    asaas_key_exists: !!asaasKey,
    asaas_key_typeof: typeof asaasKey,
    asaas_key_raw_typeof: typeof rawValue,
    asaas_key_length: asaasKey?.length || 0,
    asaas_key_is_empty_string: asaasKey === "",
    asaas_key_is_undefined: asaasKey === undefined,
    asaas_key_first_chars: asaasKey ? asaasKey.substring(0, 12) + "..." : "NOT_FOUND",
    asaas_key_in_env: "ASAAS_API_KEY" in process.env,
    total_env_vars: allEnvKeys.length,
    supabase_url_exists: !!process.env.SUPABASE_URL,
    supabase_url_length: process.env.SUPABASE_URL?.length || 0,
  })
}
