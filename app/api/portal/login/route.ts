import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import * as crypto from "crypto"

export const dynamic = "force-dynamic"

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha sao obrigatorios" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Find client by email
    const { data: client, error: findError } = await supabase
      .from("final_clients")
      .select("id, email, password_hash, document, document_type, name, is_active")
      .eq("email", email.toLowerCase())
      .single()

    if (findError || !client) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      )
    }

    // Check if account is active
    if (!client.is_active) {
      return NextResponse.json(
        { error: "Conta desativada" },
        { status: 403 }
      )
    }

    // Verify password
    const passwordHash = hashPassword(password)
    if (passwordHash !== client.password_hash) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      )
    }

    // Generate session token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Get client info for logging
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Create session
    const { error: sessionError } = await supabase
      .from("final_client_sessions")
      .insert({
        final_client_id: client.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ip,
        user_agent: userAgent.substring(0, 500),
      })

    if (sessionError) {
      console.error("[PORTAL-LOGIN] Session error:", sessionError)
      return NextResponse.json(
        { error: "Erro ao criar sessao" },
        { status: 500 }
      )
    }

    // Update last login
    await supabase
      .from("final_clients")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", client.id)

    console.log(`[PORTAL-LOGIN] Client logged in: ${email}`)

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
      client: {
        id: client.id,
        email: client.email,
        document_type: client.document_type,
        name: client.name,
      },
    })

    // Set secure cookie with token
    response.cookies.set("portal_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("[PORTAL-LOGIN] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
