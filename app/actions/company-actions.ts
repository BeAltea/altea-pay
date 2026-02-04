"use server"

import { db } from "@/lib/db"
import { companies, customers, debts, profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface CreateCompanyParams {
  name: string
  cnpj: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
}

export interface UpdateCompanyParams extends CreateCompanyParams {
  id: string
}

export interface DeleteCompanyParams {
  id: string
}

function detectCSVDelimiter(text: string): string {
  const firstLine = text.split("\n")[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length

  console.log("[v0] Detectando separador - Ponto e vírgula:", semicolonCount, "Vírgulas:", commaCount)
  return semicolonCount > commaCount ? ";" : ","
}

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export async function createCompany(params: CreateCompanyParams) {
  try {
    const [data] = await db
      .insert(companies)
      .values({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
      })
      .returning()

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create company error:", error)
    return {
      success: false,
      message: "Erro ao criar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateCompany(params: UpdateCompanyParams) {
  try {
    const [data] = await db
      .update(companies)
      .set({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
      })
      .where(eq(companies.id, params.id))
      .returning()

    revalidatePath("/super-admin/companies")
    revalidatePath(`/super-admin/companies/${params.id}`)

    return {
      success: true,
      message: "Empresa atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update company error:", error)
    return {
      success: false,
      message: "Erro ao atualizar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCompany(params: DeleteCompanyParams) {
  try {
    // Check if company has users or data
    const users = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.companyId, params.id))
      .limit(1)

    if (users && users.length > 0) {
      return {
        success: false,
        message: "Não é possível excluir empresa com usuários cadastrados",
      }
    }

    await db.delete(companies).where(eq(companies.id, params.id))

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa excluída com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete company error:", error)
    return {
      success: false,
      message: "Erro ao excluir empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function createCompanyWithCustomers(formData: FormData, customersParam?: any[]) {
  try {
    console.log("🚀 [TESTE] Iniciando criação de empresa")

    const companyData = {
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zipCode: (formData.get("zip_code") as string) || null,
      sector: (formData.get("sector") as string) || null,
    }

    console.log("🏢 [TESTE] Criando empresa:", companyData.name)

    const [company] = await db
      .insert(companies)
      .values(companyData)
      .returning()

    if (!company) {
      console.error("❌ [TESTE] ERRO ao criar empresa")
      throw new Error("Failed to create company")
    }

    console.log("✅ [TESTE] Empresa criada - ID:", company.id)

    console.log("👥 [TESTE] Inserindo 3 clientes de teste...")

    const testCustomers = [
      {
        companyId: company.id,
        name: "Cliente Teste 1",
        document: "11111111111",
        documentType: "CPF",
        email: "teste1@example.com",
        phone: "(11) 99999-1111",
      },
      {
        companyId: company.id,
        name: "Cliente Teste 2",
        document: "22222222222",
        documentType: "CPF",
        email: "teste2@example.com",
        phone: "(11) 99999-2222",
      },
      {
        companyId: company.id,
        name: "Cliente Teste 3",
        document: "33333333333",
        documentType: "CPF",
        email: "teste3@example.com",
        phone: "(11) 99999-3333",
      },
    ]

    console.log("📋 [TESTE] Dados dos clientes:", JSON.stringify(testCustomers, null, 2))

    const insertedCustomers = await db
      .insert(customers)
      .values(testCustomers)
      .returning()

    if (!insertedCustomers || insertedCustomers.length === 0) {
      console.error("❌ [TESTE] ERRO ao inserir clientes")
      throw new Error("Failed to insert customers")
    }

    console.log("✅ [TESTE] Clientes inseridos:", insertedCustomers?.length)
    console.log(
      "✅ [TESTE] IDs dos clientes:",
      insertedCustomers?.map((c) => c.id),
    )
    console.log(
      "✅ [TESTE] Company IDs dos clientes:",
      insertedCustomers?.map((c) => c.companyId),
    )

    console.log("💰 [TESTE] Inserindo 3 dívidas de teste...")

    const today = new Date()
    const dueDateObj = new Date(today.setDate(today.getDate() + 30))
    const dueDateString = dueDateObj.toISOString().split("T")[0]

    const testDebts = insertedCustomers!.map((customer, index) => ({
      companyId: company.id,
      customerId: customer.id,
      amount: ((index + 1) * 100).toString(),
      status: "pending",
      description: `Dívida teste ${index + 1}`,
      dueDate: dueDateString,
      classification: "low" as const,
    }))

    console.log("📋 [TESTE] Dados das dívidas:", JSON.stringify(testDebts, null, 2))

    const insertedDebts = await db.insert(debts).values(testDebts).returning()

    if (!insertedDebts || insertedDebts.length === 0) {
      console.error("❌ [TESTE] ERRO ao inserir dívidas")
      throw new Error("Failed to insert debts")
    }

    console.log("✅ [TESTE] Dívidas inseridas:", insertedDebts?.length)
    console.log(
      "✅ [TESTE] IDs das dívidas:",
      insertedDebts?.map((d) => d.id),
    )
    console.log(
      "✅ [TESTE] Company IDs das dívidas:",
      insertedDebts?.map((d) => d.companyId),
    )

    console.log("🔍 [TESTE] Verificando dados no banco...")

    const customersCheck = await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, company.id))

    const debtsCheck = await db
      .select()
      .from(debts)
      .where(eq(debts.companyId, company.id))

    console.log("📊 [TESTE] Clientes no banco:", customersCheck?.length || 0)
    console.log("📊 [TESTE] Dívidas no banco:", debtsCheck?.length || 0)

    if (customersCheck && customersCheck.length > 0) {
      console.log("✅ [TESTE] Primeiros clientes:", JSON.stringify(customersCheck.slice(0, 2), null, 2))
    }

    if (debtsCheck && debtsCheck.length > 0) {
      console.log("✅ [TESTE] Primeiras dívidas:", JSON.stringify(debtsCheck.slice(0, 2), null, 2))
    }

    revalidatePath("/super-admin/companies")

    console.log("🎉 [TESTE] FINALIZADO COM SUCESSO!")
    console.log("📊 [TESTE] Resumo: Empresa criada | 3 clientes | 3 dívidas")

    return {
      success: true,
      message: `TESTE: Empresa criada com 3 clientes e 3 dívidas de teste. Verifique se aparecem na página!`,
      data: {
        company,
        importedCount: 3,
        debtsCreatedCount: 3,
        failedCount: 0,
        errors: [],
      },
    }
  } catch (error) {
    console.error("❌ [TESTE] ERRO FATAL:", error)
    return {
      success: false,
      message: "Erro ao criar empresa de teste",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function importCustomersToCompany(companyId: string, customersParam: any[]) {
  try {
    console.log("[v0] ===== INICIANDO IMPORTAÇÃO DE CLIENTES =====")

    if (!companyId) {
      return {
        success: false,
        error: "ID da empresa não fornecido",
        imported: 0,
        failed: 0,
        errors: [],
      }
    }

    if (!customersParam || customersParam.length === 0) {
      return {
        success: false,
        error: "Nenhum cliente fornecido",
        imported: 0,
        failed: 0,
        errors: [],
      }
    }

    console.log("[v0] Company ID:", companyId)
    console.log("[v0] Total de clientes a importar:", customersParam.length)

    const [company] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    if (!company) {
      console.error("[v0] Empresa não encontrada")
      return {
        success: false,
        error: "Empresa não encontrada",
        imported: 0,
        failed: 0,
        errors: [],
      }
    }

    console.log("[v0] Empresa encontrada:", company.name)

    const validCustomers: any[] = []
    const errors: string[] = []

    for (let i = 0; i < customersParam.length; i++) {
      try {
        const customer = customersParam[i]

        if (!customer.name && !customer.document) {
          console.log(`[v0] Cliente ${i + 1} ignorado - sem nome e sem documento`)
          errors.push(`Cliente ${i + 1}: Nome e documento faltando`)
          continue
        }

        const validCustomer: any = {
          companyId: companyId,
          name: String(customer.name || "").trim(),
          document: String(customer.document || customer.cpf || "").trim(),
          documentType: customer.document_type || "CPF",
        }

        if (customer.email) validCustomer.email = String(customer.email)
        if (customer.phone) validCustomer.phone = String(customer.phone)
        if (customer.address) validCustomer.address = String(customer.address)
        if (customer.city) validCustomer.city = String(customer.city)
        if (customer.state) validCustomer.state = String(customer.state)
        if (customer.zip_code) validCustomer.zipCode = String(customer.zip_code)
        if (customer.external_id) validCustomer.externalId = String(customer.external_id)
        if (customer.source_system) validCustomer.sourceSystem = String(customer.source_system)

        validCustomers.push(validCustomer)
      } catch (error) {
        console.error(`[v0] Erro ao processar cliente ${i + 1}:`, error)
        errors.push(`Cliente ${i + 1}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      }
    }

    console.log("[v0] ===== RESUMO DA VALIDAÇÃO =====")
    console.log("[v0] Clientes válidos:", validCustomers.length)
    console.log("[v0] Clientes com erro:", errors.length)

    let importedCount = 0
    let failedCount = errors.length

    if (validCustomers.length > 0) {
      console.log("[v0] Inserindo clientes no banco de dados...")

      try {
        const insertedCustomers = await db
          .insert(customers)
          .values(validCustomers)
          .returning()

        importedCount = insertedCustomers?.length || 0
        console.log("[v0] ✓ Clientes importados com sucesso:", importedCount)
      } catch (insertError: any) {
        console.error("[v0] ✗ ERRO ao importar clientes:", insertError)
        console.error("[v0] Detalhes do erro:", JSON.stringify(insertError, null, 2))
        failedCount += validCustomers.length
        errors.push(`Erro no banco: ${insertError.message}`)
      }
    } else {
      console.log("[v0] ⚠ Nenhum cliente válido para importar")
    }

    revalidatePath("/super-admin/companies")
    revalidatePath(`/super-admin/companies/${companyId}`)
    revalidatePath(`/super-admin/companies/${companyId}/customers`)
    revalidatePath("/dashboard/customers")

    console.log("[v0] ===== FINALIZADO =====")
    console.log("[v0] Clientes importados:", importedCount)
    console.log("[v0] Clientes com erro:", failedCount)

    return {
      success: true,
      imported: importedCount,
      failed: failedCount,
      errors,
    }
  } catch (error) {
    console.error("[v0] ✗ ERRO FATAL ao importar clientes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      imported: 0,
      failed: 0,
      errors: [],
    }
  }
}
