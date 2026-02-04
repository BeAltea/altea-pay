import { db } from "@/lib/db"
import { companies } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, cnpj } = await request.json()

    console.log("[API] Buscando empresa por email/CNPJ:", { email, cnpj })

    // Fetch all companies
    const allCompanies = await db.select().from(companies)

    console.log("[API] Total de empresas encontradas:", allCompanies?.length || 0)

    if (allCompanies && allCompanies.length > 0) {
      console.log("[API] Empresas no banco:", allCompanies.map((c: any) => ({
        name: c.name,
        cnpj: c.cnpj,
        email: c.email
      })))
    }

    // Find matching company
    const foundCompany = allCompanies?.find((comp: any) => {
      const companyCnpj = comp.cnpj?.replace(/\D/g, "")
      const inputCnpj = cnpj?.replace(/\D/g, "")
      const cnpjMatch = companyCnpj === inputCnpj
      const emailMatch = comp.email?.toLowerCase() === email?.toLowerCase()

      console.log("[API] Comparando:", {
        company: comp.name,
        companyCnpj,
        inputCnpj,
        cnpjMatch,
        companyEmail: comp.email,
        inputEmail: email,
        emailMatch
      })

      return cnpjMatch || emailMatch
    })

    console.log("[API] Empresa encontrada:", foundCompany ? foundCompany.name : "Nenhuma")

    return NextResponse.json({ company: foundCompany || null, error: null })
  } catch (error) {
    console.error("[API] Erro no check-company:", error)
    return NextResponse.json({ company: null, error: "Erro interno do servidor" })
  }
}
