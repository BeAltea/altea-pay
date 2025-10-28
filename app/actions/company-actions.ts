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
    console.log("[v0] ===== INICIANDO CRIAÇÃO DE EMPRESA COM CLIENTES =====")
    const supabase = await createClient()

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

    console.log("[v0] Dados da empresa:", JSON.stringify(companyData, null, 2))

    const { data: existingCompany, error: checkError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("cnpj", companyData.cnpj)
      .single()

    if (existingCompany) {
      console.log("[v0] ⚠ CNPJ já existe - Empresa:", existingCompany.name, "ID:", existingCompany.id)

      if (customers && customers.length > 0) {
        console.log("[v0] Adicionando clientes à empresa existente...")
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

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(companyData)
      .select()
      .single()

    if (companyError) {
      console.error("[v0] ERRO ao criar empresa:", companyError)
      throw companyError
    }

    console.log("[v0] ✓ Empresa criada com ID:", company.id)

    let importedCount = 0
    let failedCount = 0
    const errors: string[] = []
    const debtDataList: any[] = []

    if (customers && customers.length > 0) {
      console.log("[v0] ===== PROCESSANDO CLIENTES =====")
      console.log("[v0] Total de clientes:", customers.length)
      console.log("[v0] Primeiro cliente (exemplo):", JSON.stringify(customers[0], null, 2))

      const validCustomers = []

      for (let i = 0; i < customers.length; i++) {
        try {
          const customer = customers[i]

          if (!customer.name && !customer.document) {
            console.log(`[v0] Cliente ${i + 1} ignorado - sem nome e sem documento`)
            errors.push(`Cliente ${i + 1}: Nome e documento faltando`)
            failedCount++
            continue
          }

          let cleanDoc = ""
          let documentType = "CPF"

          if (customer.document) {
            cleanDoc = String(customer.document).replace(/\D/g, "")
            documentType = cleanDoc.length === 14 ? "CNPJ" : "CPF"
          }

          const validCustomer: any = {
            company_id: company.id,
            name: String(customer.name || "").trim(),
            document: String(customer.document || customer.cpf || "").trim(),
            document_type: customer.document_type || "CPF",
          }

          // Campos opcionais do cliente
          if (customer.email) validCustomer.email = String(customer.email)
          if (customer.phone) validCustomer.phone = String(customer.phone)
          if (customer.address) validCustomer.address = String(customer.address)
          if (customer.city) validCustomer.city = String(customer.city)
          if (customer.state) validCustomer.state = String(customer.state)
          if (customer.zip_code) validCustomer.zip_code = String(customer.zip_code)
          if (customer.external_id) validCustomer.external_id = String(customer.external_id)
          if (customer.source_system) validCustomer.source_system = String(customer.source_system)

          validCustomers.push(validCustomer)

          // Armazenar dados de dívida separadamente para criar depois
          if (customer.debt_amount || customer.due_date || customer.contract_number) {
            const debtData: any = {
              customer_document: validCustomer.document,
              company_id: company.id,
            }

            if (customer.debt_amount)
              debtData.amount = Number.parseFloat(
                String(customer.debt_amount)
                  .replace(/[^\d.,]/g, "")
                  .replace(",", "."),
              )
            if (customer.due_date) debtData.due_date = String(customer.due_date)
            if (customer.description) debtData.description = String(customer.description)
            if (customer.contract_number) debtData.external_id = String(customer.contract_number)
            if (customer.status) debtData.status = String(customer.status)

            debtDataList.push(debtData)
          }
        } catch (error) {
          console.error(`[v0] Erro ao processar cliente ${i + 1}:`, error)
          errors.push(`Cliente ${i + 1}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
          failedCount++
        }
      }

      console.log("[v0] ===== RESUMO DA VALIDAÇÃO =====")
      console.log("[v0] Clientes válidos para inserção:", validCustomers.length)
      console.log("[v0] Clientes com erro:", failedCount)

      if (validCustomers.length > 0) {
        console.log("[v0] Inserindo clientes no banco de dados...")
        console.log("[v0] Exemplo de cliente a ser inserido:", JSON.stringify(validCustomers[0], null, 2))

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
          console.log("[v0] IDs dos clientes importados:", insertedCustomers?.map((c) => c.id).join(", "))
        }
      } else {
        console.log("[v0] ⚠ Nenhum cliente válido para importar")
      }

      if (debtDataList.length > 0) {
        console.log("[v0] Inserindo dados de dívida no banco de dados...")
        console.log("[v0] Exemplo de dívida a ser inserida:", JSON.stringify(debtDataList[0], null, 2))

        const adminClient = createAdminClient()
        const { error: debtError } = await adminClient.from("debts").insert(debtDataList)

        if (debtError) {
          console.error("[v0] ✗ ERRO ao importar dados de dívida:", debtError)
          console.error("[v0] Detalhes do erro:", JSON.stringify(debtError, null, 2))
          failedCount += debtDataList.length
          errors.push(`Erro no banco ao inserir dívidas: ${debtError.message}`)
        } else {
          console.log("[v0] ✓ Dados de dívida importados com sucesso:", debtDataList.length)
        }
      } else {
        console.log("[v0] ⚠ Nenhum dado de dívida válido para importar")
      }
    }

    revalidatePath("/super-admin/empresas")
    revalidatePath("/super-admin/companies")

    console.log("[v0] ===== FINALIZADO =====")
    console.log("[v0] Empresa ID:", company.id)
    console.log("[v0] Clientes importados:", importedCount)
    console.log("[v0] Clientes com erro:", failedCount)
    if (errors.length > 0) {
      console.log(
        "[v0] Erros:",
        errors.slice(0, 5).join(", "),
        errors.length > 5 ? `... e mais ${errors.length - 5}` : "",
      )
    }

    return {
      success: true,
      message: `Empresa criada com sucesso! ${importedCount > 0 ? `${importedCount} clientes importados.` : ""}${failedCount > 0 ? ` ${failedCount} falharam.` : ""} A pessoa responsável deve criar uma conta com o email ${companyData.email} para acessar o dashboard.`,
      data: { company, importedCount, failedCount, errors },
    }
  } catch (error) {
    console.error("[v0] ✗ ERRO FATAL ao criar empresa com clientes:", error)
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
      }
    }

    if (!customers || customers.length === 0) {
      return {
        success: false,
        error: "Nenhum cliente fornecido",
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
      }
    }

    console.log("[v0] Empresa encontrada:", company.name)

    const validCustomers = []
    const errors: string[] = []
    const debtDataList: any[] = []

    for (let i = 0; i < customers.length; i++) {
      try {
        const customer = customers[i]

        if (!customer.name && !customer.document) {
          console.log(`[v0] Cliente ${i + 1} ignorado - sem nome e sem documento`)
          errors.push(`Cliente ${i + 1}: Nome e documento faltando`)
          continue
        }

        let cleanDoc = ""
        let documentType = "CPF"

        if (customer.document) {
          cleanDoc = String(customer.document).replace(/\D/g, "")
          documentType = cleanDoc.length === 14 ? "CNPJ" : "CPF"
        }

        const validCustomer: any = {
          company_id: companyId,
          name: String(customer.name || "").trim(),
          document: String(customer.document || customer.cpf || "").trim(),
          document_type: customer.document_type || "CPF",
        }

        // Campos opcionais do cliente
        if (customer.email) validCustomer.email = String(customer.email)
        if (customer.phone) validCustomer.phone = String(customer.phone)
        if (customer.address) validCustomer.address = String(customer.address)
        if (customer.city) validCustomer.city = String(customer.city)
        if (customer.state) validCustomer.state = String(customer.state)
        if (customer.zip_code) validCustomer.zip_code = String(customer.zip_code)
        if (customer.external_id) validCustomer.external_id = String(customer.external_id)
        if (customer.source_system) validCustomer.source_system = String(customer.source_system)

        validCustomers.push(validCustomer)

        // Armazenar dados de dívida separadamente para criar depois
        if (customer.debt_amount || customer.due_date || customer.contract_number) {
          const debtData: any = {
            customer_document: validCustomer.document,
            company_id: companyId,
          }

          if (customer.debt_amount)
            debtData.amount = Number.parseFloat(
              String(customer.debt_amount)
                .replace(/[^\d.,]/g, "")
                .replace(",", "."),
            )
          if (customer.due_date) debtData.due_date = String(customer.due_date)
          if (customer.description) debtData.description = String(customer.description)
          if (customer.contract_number) debtData.external_id = String(customer.contract_number)
          if (customer.status) debtData.status = String(customer.status)

          debtDataList.push(debtData)
        }
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
        console.log("[v0] IDs dos clientes importados:", insertedCustomers?.map((c) => c.id).join(", "))
      }
    } else {
      console.log("[v0] ⚠ Nenhum cliente válido para importar")
    }

    if (debtDataList.length > 0) {
      console.log("[v0] Inserindo dados de dívida no banco de dados...")
      console.log("[v0] Exemplo de dívida a ser inserida:", JSON.stringify(debtDataList[0], null, 2))

      const adminClient = createAdminClient()
      const { error: debtError } = await adminClient.from("debts").insert(debtDataList)

      if (debtError) {
        console.error("[v0] ✗ ERRO ao importar dados de dívida:", debtError)
        console.error("[v0] Detalhes do erro:", JSON.stringify(debtError, null, 2))
        failedCount += debtDataList.length
        errors.push(`Erro no banco ao inserir dívidas: ${debtError.message}`)
      } else {
        console.log("[v0] ✓ Dados de dívida importados com sucesso:", debtDataList.length)
      }
    } else {
      console.log("[v0] ⚠ Nenhum dado de dívida válido para importar")
    }

    revalidatePath("/super-admin/empresas")
    revalidatePath(`/super-admin/empresas/${companyId}`)
    revalidatePath(`/super-admin/empresas/${companyId}/base`)
    revalidatePath("/dashboard/customers")

    console.log("[v0] ===== FINALIZADO =====")
    console.log("[v0] Clientes importados:", importedCount)
    console.log("[v0] Clientes com erro:", failedCount)
    if (errors.length > 0) {
      console.log(
        "[v0] Erros:",
        errors.slice(0, 5).join(", "),
        errors.length > 5 ? `... e mais ${errors.length - 5}` : "",
      )
    }

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
    }
  }
}
