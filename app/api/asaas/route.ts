import { NextRequest, NextResponse } from "next/server"

const ASAAS_BASE_URL = "https://api.asaas.com/v3"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ASAAS_API_KEY

    if (!apiKey) {
      console.error("ASAAS_API_KEY not found in API route environment")
      return NextResponse.json(
        { error: "ASAAS_API_KEY not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { endpoint, method = "GET", data } = body

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
