import { NextRequest, NextResponse } from "next/server"

const ASAAS_BASE_URL = "https://api.asaas.com/v3"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ASAAS_API_KEY

    console.log("[v0] /api/asaas called - apiKey exists:", !!apiKey, "- apiKey length:", apiKey?.length || 0)

    if (!apiKey) {
      console.error("[v0] ASAAS_API_KEY not found in API route process.env. Available env keys:", Object.keys(process.env).filter(k => k.includes("ASAAS") || k.includes("NEXT_PUBLIC")).join(", "))
      return NextResponse.json(
        { error: "ASAAS_API_KEY not configured in server environment" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { endpoint, method = "GET", data } = body

    console.log("[v0] /api/asaas request - endpoint:", endpoint, "method:", method)

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint parameter" },
        { status: 400 }
      )
    }

    const url = `${ASAAS_BASE_URL}${endpoint}`

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey.trim(),
      },
    }

    if (data && method !== "GET") {
      fetchOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, fetchOptions)

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      const text = await response.text()
      console.error("Asaas API returned non-JSON:", response.status, text.substring(0, 300))
      return NextResponse.json(
        { error: `Asaas API retornou resposta invalida (${response.status}). Verifique a ASAAS_API_KEY.` },
        { status: 502 }
      )
    }

    const responseData = await response.json()

    if (!response.ok) {
      console.error("Asaas API proxy error:", response.status, JSON.stringify(responseData))
      return NextResponse.json(responseData, { status: response.status })
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Asaas proxy route error:", error)
    return NextResponse.json(
      { error: error.message || "Internal proxy error" },
      { status: 500 }
    )
  }
}
