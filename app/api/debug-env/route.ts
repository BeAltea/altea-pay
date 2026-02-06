import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const allEnvKeys = Object.keys(process.env).sort()
  const asaasKey = process.env.ASAAS_API_KEY
  
  return NextResponse.json({
    asaas_key_exists: !!asaasKey,
    asaas_key_length: asaasKey?.length || 0,
    asaas_key_first_chars: asaasKey ? asaasKey.substring(0, 8) + "..." : "NOT_FOUND",
    total_env_vars: allEnvKeys.length,
    relevant_keys: allEnvKeys.filter(k => 
      k.includes("ASAAS") || 
      k.includes("SUPABASE") || 
      k.includes("NEXT_PUBLIC") ||
      k.includes("VERCEL")
    ),
  })
}
