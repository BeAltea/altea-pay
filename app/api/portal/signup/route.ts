import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import * as crypto from "crypto"

export const dynamic = "force-dynamic"

// Simple password hashing using crypto (production should use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Validate CPF (Brazilian individual taxpayer ID)
function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, "")
  if (cleanCpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cleanCpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf[10])) return false

  return true
}

// Validate CNPJ (Brazilian company taxpayer ID)
function validateCNPJ(cnpj: string): boolean {
  const cleanCnpj = cnpj.replace(/\D/g, "")
  if (cleanCnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cleanCnpj)) return false

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCnpj[i]) * weights1[i]
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (digit1 !== parseInt(cleanCnpj[12])) return false

  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCnpj[i]) * weights2[i]
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  if (digit2 !== parseInt(cleanCnpj[13])) return false

  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, document, document_type, name, phone } = body

    // Validate required fields
    if (!email || !password || !document || !document_type) {
      return NextResponse.json(
        { error: "Email, senha, documento e tipo de documento sao obrigatorios" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Validate document type
    if (!["cpf", "cnpj"].includes(document_type)) {
      return NextResponse.json(
        { error: "Tipo de documento deve ser cpf ou cnpj" },
        { status: 400 }
      )
    }

    // Validate document
    const cleanDocument = document.replace(/\D/g, "")
    if (document_type === "cpf") {
      if (!validateCPF(cleanDocument)) {
        return NextResponse.json({ error: "CPF invalido" }, { status: 400 })
      }
    } else {
      if (!validateCNPJ(cleanDocument)) {
        return NextResponse.json({ error: "CNPJ invalido" }, { status: 400 })
      }
    }

    const supabase = createServiceClient()

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from("final_clients")
      .select("id")
      .eq("email", email.toLowerCase())
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 }
      )
    }

    // Check if document already exists
    const { data: existingDoc } = await supabase
      .from("final_clients")
      .select("id")
      .ilike("document", `%${cleanDocument}%`)
      .single()

    if (existingDoc) {
      return NextResponse.json(
        { error: "Documento ja cadastrado" },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = hashPassword(password)

    // Create final client
    const { data: client, error: insertError } = await supabase
      .from("final_clients")
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        document: cleanDocument,
        document_type,
        name: name || null,
        phone: phone || null,
      })
      .select("id, email, document, document_type, name, created_at")
      .single()

    if (insertError) {
      console.error("[PORTAL-SIGNUP] Insert error:", insertError)
      return NextResponse.json(
        { error: "Erro ao criar conta" },
        { status: 500 }
      )
    }

    console.log(`[PORTAL-SIGNUP] New client registered: ${email}`)

    return NextResponse.json({
      success: true,
      message: "Conta criada com sucesso",
      client: {
        id: client.id,
        email: client.email,
        document_type: client.document_type,
        name: client.name,
      },
    })
  } catch (error: any) {
    console.error("[PORTAL-SIGNUP] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
