import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import * as crypto from "crypto"

export const dynamic = "force-dynamic"

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// This endpoint links a test user (Fabio) to the portal
// Only for development/testing purposes
export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid request (could add more security here)
    const body = await request.json()
    const { secret } = body

    // Simple secret check for safety
    if (secret !== process.env.CRON_SECRET && secret !== "alteapay-test-2024") {
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // Test user data - Fabio
    const testUser = {
      email: "usuario@alteapay.com",
      password: "123456",
      document: "41719010811", // CPF clean
      document_type: "cpf",
      name: "Fabio - Test User",
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from("final_clients")
      .select("id, email")
      .eq("email", testUser.email)
      .single()

    if (existing) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("final_clients")
        .update({
          password_hash: hashPassword(testUser.password),
          document: testUser.document,
          document_type: testUser.document_type,
          name: testUser.name,
          is_active: true,
        })
        .eq("id", existing.id)

      if (updateError) {
        console.error("[LINK-TEST-USER] Update error:", updateError)
        return NextResponse.json(
          { error: "Erro ao atualizar usuario" },
          { status: 500 }
        )
      }

      console.log(`[LINK-TEST-USER] Updated existing user: ${testUser.email}`)

      return NextResponse.json({
        success: true,
        message: "Usuario de teste atualizado",
        user: {
          id: existing.id,
          email: testUser.email,
          document: testUser.document,
          document_type: testUser.document_type,
        },
      })
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from("final_clients")
      .insert({
        email: testUser.email,
        password_hash: hashPassword(testUser.password),
        document: testUser.document,
        document_type: testUser.document_type,
        name: testUser.name,
      })
      .select("id, email, document, document_type")
      .single()

    if (insertError) {
      console.error("[LINK-TEST-USER] Insert error:", insertError)
      return NextResponse.json(
        { error: "Erro ao criar usuario" },
        { status: 500 }
      )
    }

    console.log(`[LINK-TEST-USER] Created test user: ${testUser.email}`)

    return NextResponse.json({
      success: true,
      message: "Usuario de teste criado",
      user: {
        id: newUser.id,
        email: newUser.email,
        document: newUser.document,
        document_type: newUser.document_type,
      },
      credentials: {
        email: testUser.email,
        password: testUser.password,
      },
    })
  } catch (error: any) {
    console.error("[LINK-TEST-USER] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
