import { NextRequest, NextResponse } from "next/server"

const ASAAS_BASE_URL = "https://api.asaas.com/v3"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ASAAS_API_KEY
    
    console.log("[v0] API Route /api/asaas - ASAAS_API_KEY present:", !!apiKey, "len:", apiKey?.length ?? 0)
    
    if (!apiKey) {
      // Log ALL env var keys to debug
      const allKeys = Object.keys(process.env).sort()
      console.log("[v0] ALL env var keys:", allKeys.join(", "))
      return NextResponse.json(
        { error: "ASAAS_API_KEY not found in environment" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { endpoint, method = "GET", data } = body

    const url = `${ASAAS_BASE_URL}${endpoint}`
    console.log("[v0] Proxying to Asaas:", method, url)

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey.trim(),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Asaas API error:", response.status, JSON.stringify(result))
      return NextResponse.json(
        { error: result.errors?.[0]?.description || `Asaas API error (${response.status})` },
        { status: response.status }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Asaas proxy error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
