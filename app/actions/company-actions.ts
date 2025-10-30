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
    console.log("🚀 [IMPORTAÇÃO] Iniciando criação de empresa com", customers?.length || 0, "clientes")

    if (customers && customers.length > 0) {
      console.log("📋 [IMPORTAÇÃO] Colunas do primeiro cliente:", Object.keys(customers[0]))
    }

    const adminClient = createAdminClient()

    console.log("[v0] ===== INICIANDO CRIAÇÃO DE EMPRESA =====")
    console.log("[v0] Total de clientes recebidos:", customers?.length || 0)

    if (customers && customers.length > 0) {
      console.log("[v0] Colunas do primeiro cliente:", Object.keys(customers[0]))
      console.log("[v0] Primeiro cliente (amostra):", JSON.stringify(customers[0], null, 2))
    }

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

    console.log("[v0] Dados da empresa:", companyData.name, "-", companyData.cnpj)

    const { data: existingCompany, error: checkError } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("cnpj", companyData.cnpj)
      .single()

    if (existingCompany) {
      console.log("[v0] CNPJ já existe - Empresa:", existingCompany.name)

      if (customers && customers.length > 0) {
        console.log("[v0] Adicionando", customers.length, "clientes à empresa existente...")
        const importResult = await importCustomersToCompany(existingCompany.id, customers)

        if (importResult.success) {
          revalidatePath("/super-admin/empresas")
          revalidatePath("/super-admin/companies")

          return {
            success: true,
            message: `Empresa "${existingCompany.name}" já existe. ${importResult.imported} clientes foram adicionados à empresa existente.${importResult.failed > 0 ? ` ${importResult.failed} falharam.` : ""}`,
            data: {
              company: existingCompany,
              importedCount: importResult.imported,
              failedCount: importResult.failed,
              errors: importResult.errors,
            },
          }
        } else {
          return {
            success: false,
            message: `Empresa "${existingCompany.name}" já existe, mas houve erro ao adicionar os clientes: ${importResult.error}`,
            error: importResult.error,
          }
        }
      }

      return {
        success: false,
        message: `Uma empresa com o CNPJ ${companyData.cnpj} já está cadastrada com o nome "${existingCompany.name}".`,
        error: "CNPJ duplicado",
      }
    }

    console.log("[v0] Criando nova empresa...")
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert(companyData)
      .select()
      .single()

    if (companyError) {
      console.error("[v0] ERRO ao criar empresa:", companyError)
      throw companyError
    }

    console.log("[v0] Empresa criada com ID:", company.id)

    let importedCount = 0
    let debtsCreatedCount = 0
    let failedCount = 0
    const errors: string[] = []
    const customersToInsert: any[] = []
    const debtsToInsert: any[] = []

    if (customers && customers.length > 0) {
      console.log("[v0] ===== PROCESSANDO CLIENTES =====")
      console.log("[v0] Total de clientes a processar:", customers.length)

      for (let i = 0; i < customers.length; i++) {
        try {
          const customer = customers[i]

          if (!customer.name && !customer.document) {
            console.log(`[v0] Cliente ${i + 1} ignorado - sem nome e sem documento`)
            failedCount++
            continue
          }

          const customerData: any = {
            company_id: company.id,
            name: String(customer.name || "").trim(),
            document: String(customer.document || customer.cpf || "").trim(),
            document_type: customer.document_type || "CPF",
          }

          if (customer.email) customerData.email = String(customer.email)
          if (customer.phone) customerData.phone = String(customer.phone)
          if (customer.address) customerData.address = String(customer.address)
          if (customer.city) customerData.city = String(customer.city)
          if (customer.state) customerData.state = String(customer.state)
          if (customer.zip_code) customerData.zip_code = String(customer.zip_code)
          if (customer.external_id) customerData.external_id = String(customer.external_id)
          if (customer.source_system) customerData.source_system = String(customer.source_system)

          customersToInsert.push(customerData)

          const debtData: any = {
            company_id: company.id,
            status: customer.status || "pending",
          }

          const amountValue = customer.debt_amount || customer.valor || customer.valor_divida || customer.amount || 0
          if (amountValue) {
            const amountStr = String(amountValue)
              .replace(/[^\d.,]/g, "")
              .replace(",", ".")
            debtData.amount = Number.parseFloat(amountStr) || 0
          } else {
            debtData.amount = 0
          }

          const dueDate = customer.due_date || customer.vencimento || customer.data_vencimento
          if (dueDate) debtData.due_date = String(dueDate)

          if (customer.description) debtData.description = String(customer.description)
          if (customer.contract_number) debtData.external_id = String(customer.contract_number)

          debtsToInsert.push(debtData)
        } catch (error) {
          console.error(`[v0] Erro ao processar cliente ${i + 1}:`, error)
          failedCount++
        }
      }

      console.log("[v0] ===== RESUMO DO PROCESSAMENTO =====")
      console.log("[v0] Clientes válidos para inserir:", customersToInsert.length)
      console.log("[v0] Dívidas preparadas:", debtsToInsert.length)
      console.log("[v0] Clientes com erro:", failedCount)

      if (customersToInsert.length > 0) {
        console.log("[v0] ===== INSERINDO CLIENTES NO BANCO =====")
        console.log("[v0] Primeiros 3 clientes a inserir:", JSON.stringify(customersToInsert.slice(0, 3), null, 2))

        const { data: insertedCustomers, error: customersError } = await adminClient
          .from("customers")
          .insert(customersToInsert)
          .select()

        if (customersError) {
          console.error("[v0] ERRO ao inserir clientes:", customersError.message)
          console.error("[v0] Detalhes do erro:", JSON.stringify(customersError, null, 2))
          errors.push(`Erro ao inserir clientes: ${customersError.message}`)
          failedCount += customersToInsert.length
        } else {
          importedCount = insertedCustomers?.length || 0
          console.log("[v0] Clientes inseridos com sucesso:", importedCount)
          console.log("[v0] Primeiros 3 clientes inseridos:", JSON.stringify(insertedCustomers?.slice(0, 3), null, 2))

          if (insertedCustomers && insertedCustomers.length > 0 && debtsToInsert.length > 0) {
            console.log("[v0] ===== INSERINDO DÍVIDAS NO BANCO =====")

            const debtsWithCustomerIds = insertedCustomers.map((customer, index) => ({
              ...debtsToInsert[index],
              customer_id: customer.id,
            }))

            console.log("[v0] Total de dívidas a inserir:", debtsWithCustomerIds.length)
            console.log(
              "[v0] Primeiras 3 dívidas a inserir:",
              JSON.stringify(debtsWithCustomerIds.slice(0, 3), null, 2),
            )

            const { data: insertedDebts, error: debtsError } = await adminClient
              .from("debts")
              .insert(debtsWithCustomerIds)
              .select()

            if (debtsError) {
              console.error("[v0] ERRO ao inserir dívidas:", debtsError.message)
              console.error("[v0] Detalhes do erro:", JSON.stringify(debtsError, null, 2))
              errors.push(`Erro ao inserir dívidas: ${debtsError.message}`)
            } else {
              debtsCreatedCount = insertedDebts?.length || 0
              console.log("[v0] Dívidas inseridas com sucesso:", debtsCreatedCount)
              console.log("[v0] Primeiras 3 dívidas inseridas:", JSON.stringify(insertedDebts?.slice(0, 3), null, 2))
            }
          }
        }
      }
    }

    revalidatePath("/super-admin/empresas")
    revalidatePath("/super-admin/companies")

    console.log("[v0] ===== FINALIZADO =====")
    console.log("[v0] Empresa ID:", company.id)
    console.log("[v0] Clientes importados:", importedCount)
    console.log("[v0] Dívidas criadas:", debtsCreatedCount)
    console.log("[v0] Erros:", failedCount)

    return {
      success: true,
      message: `Empresa criada com sucesso! ${importedCount > 0 ? `${importedCount} clientes importados.` : ""}${debtsCreatedCount > 0 ? ` ${debtsCreatedCount} dívidas criadas.` : ""}${failedCount > 0 ? ` ${failedCount} falharam.` : ""} A pessoa responsável deve criar uma conta com o email ${companyData.email} para acessar o dashboard.`,
      data: {
        company,
        importedCount,
        debtsCreatedCount,
        failedCount,
        errors,
        debugInfo: {
          totalCustomers: customers?.length || 0,
          validCustomers: customersToInsert.length,
          debtsCreated: debtsCreatedCount,
        },
      },
    }
  } catch (error) {
    console.error("[v0] ERRO FATAL:", error)
    return {
      success: false,
      message: "Erro ao criar empresa",
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

    revalidatePath("/super-admin/empresas")
    revalidatePath(`/super-admin/empresas/${companyId}`)
    revalidatePath(`/super-admin/empresas/${companyId}/base`)
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
