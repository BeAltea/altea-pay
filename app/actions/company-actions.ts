"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
      })
      .select()
      .single()

    if (error) throw error

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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .update({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

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
    const supabase = await createClient()

    // Check if company has users or data
    const { data: users } = await supabase.from("profiles").select("id").eq("company_id", params.id).limit(1)

    if (users && users.length > 0) {
      return {
        success: false,
        message: "Não é possível excluir empresa com usuários cadastrados",
      }
    }

    const { error } = await supabase.from("companies").delete().eq("id", params.id)

    if (error) throw error

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

export async function createCompanyWithCustomers(formData: FormData, customers?: any[]) {
  try {
    console.log("🚀 [TESTE] Iniciando criação de empresa")

    const adminClient = createAdminClient()

    const companyData = {
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip_code: (formData.get("zip_code") as string) || null,
      sector: (formData.get("sector") as string) || null,
    }

    console.log("🏢 [TESTE] Criando empresa:", companyData.name)

    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert(companyData)
      .select()
      .single()

    if (companyError) {
      console.error("❌ [TESTE] ERRO ao criar empresa:", companyError)
      throw companyError
    }

    console.log("✅ [TESTE] Empresa criada - ID:", company.id)

    console.log("👥 [TESTE] Inserindo 3 clientes de teste...")

    const testCustomers = [
      {
        company_id: company.id,
        name: "Cliente Teste 1",
        document: "11111111111",
        document_type: "CPF",
        email: "teste1@example.com",
        phone: "(11) 99999-1111",
      },
      {
        company_id: company.id,
        name: "Cliente Teste 2",
        document: "22222222222",
        document_type: "CPF",
        email: "teste2@example.com",
        phone: "(11) 99999-2222",
      },
      {
        company_id: company.id,
        name: "Cliente Teste 3",
        document: "33333333333",
        document_type: "CPF",
        email: "teste3@example.com",
        phone: "(11) 99999-3333",
      },
    ]

    console.log("📋 [TESTE] Dados dos clientes:", JSON.stringify(testCustomers, null, 2))

    const { data: insertedCustomers, error: customersError } = await adminClient
      .from("customers")
      .insert(testCustomers)
      .select()

    if (customersError) {
      console.error("❌ [TESTE] ERRO ao inserir clientes:", customersError)
      console.error("❌ [TESTE] Detalhes:", JSON.stringify(customersError, null, 2))
      throw customersError
    }

    console.log("✅ [TESTE] Clientes inseridos:", insertedCustomers?.length)
    console.log(
      "✅ [TESTE] IDs dos clientes:",
      insertedCustomers?.map((c) => c.id),
    )
    console.log(
      "✅ [TESTE] Company IDs dos clientes:",
      insertedCustomers?.map((c) => c.company_id),
    )

    console.log("💰 [TESTE] Inserindo 3 dívidas de teste...")

    const today = new Date()
    const dueDate = new Date(today.setDate(today.getDate() + 30))
    const dueDateString = dueDate.toISOString().split("T")[0]

    const testDebts = insertedCustomers!.map((customer, index) => ({
      company_id: company.id,
      customer_id: customer.id,
      amount: (index + 1) * 100,
      status: "pending",
      description: `Dívida teste ${index + 1}`,
      due_date: dueDateString,
      classification: "low", // Valores válidos: 'low', 'medium', 'high', 'critical'
    }))

    console.log("📋 [TESTE] Dados das dívidas:", JSON.stringify(testDebts, null, 2))

    const { data: insertedDebts, error: debtsError } = await adminClient.from("debts").insert(testDebts).select()

    if (debtsError) {
      console.error("❌ [TESTE] ERRO ao inserir dívidas:", debtsError)
      console.error("❌ [TESTE] Detalhes:", JSON.stringify(debtsError, null, 2))
      throw debtsError
    }

    console.log("✅ [TESTE] Dívidas inseridas:", insertedDebts?.length)
    console.log(
      "✅ [TESTE] IDs das dívidas:",
      insertedDebts?.map((d) => d.id),
    )
    console.log(
      "✅ [TESTE] Company IDs das dívidas:",
      insertedDebts?.map((d) => d.company_id),
    )

    console.log("🔍 [TESTE] Verificando dados no banco...")

    const { data: customersCheck, error: customersCheckError } = await adminClient
      .from("customers")
      .select("*")
      .eq("company_id", company.id)

    const { data: debtsCheck, error: debtsCheckError } = await adminClient
      .from("debts")
      .select("*")
      .eq("company_id", company.id)

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

export async function importCustomersToCompany(companyId: string, customers: any[]) {
  try {
    console.log("[v0] ===== INICIANDO IMPORTAÇÃO DE CLIENTES =====")
    const supabase = await createClient()

    if (!companyId) {
      return {
        success: false,
        error: "ID da empresa não fornecido",
        imported: 0,
        failed: 0,
        errors: [],
      }
    }

    if (!customers || customers.length === 0) {
      return {
        success: false,
        error: "Nenhum cliente fornecido",
        imported: 0,
        failed: 0,
        errors: [],
      }
    }

    console.log("[v0] Company ID:", companyId)
    console.log("[v0] Total de clientes a importar:", customers.length)

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      console.error("[v0] Empresa não encontrada:", companyError)
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

    for (let i = 0; i < customers.length; i++) {
      try {
        const customer = customers[i]

        if (!customer.name && !customer.document) {
          console.log(`[v0] Cliente ${i + 1} ignorado - sem nome e sem documento`)
          errors.push(`Cliente ${i + 1}: Nome e documento faltando`)
          continue
        }

        const validCustomer: any = {
          company_id: companyId,
          name: String(customer.name || "").trim(),
          document: String(customer.document || customer.cpf || "").trim(),
          document_type: customer.document_type || "CPF",
        }

        if (customer.email) validCustomer.email = String(customer.email)
        if (customer.phone) validCustomer.phone = String(customer.phone)
        if (customer.address) validCustomer.address = String(customer.address)
        if (customer.city) validCustomer.city = String(customer.city)
        if (customer.state) validCustomer.state = String(customer.state)
        if (customer.zip_code) validCustomer.zip_code = String(customer.zip_code)
        if (customer.external_id) validCustomer.external_id = String(customer.external_id)
        if (customer.source_system) validCustomer.source_system = String(customer.source_system)

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

      const adminClient = createAdminClient()
      const { data: insertedCustomers, error: customersError } = await adminClient
        .from("customers")
        .insert(validCustomers)
        .select()

      if (customersError) {
        console.error("[v0] ✗ ERRO ao importar clientes:", customersError)
        console.error("[v0] Detalhes do erro:", JSON.stringify(customersError, null, 2))
        failedCount += validCustomers.length
        errors.push(`Erro no banco: ${customersError.message}`)
      } else {
        importedCount = insertedCustomers?.length || 0
        console.log("[v0] ✓ Clientes importados com sucesso:", importedCount)
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
