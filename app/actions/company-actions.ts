"use server"

import { createClient } from "@/lib/supabase/server"
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
  status: "active" | "inactive" | "suspended"
}

export interface UpdateCompanyParams extends CreateCompanyParams {
  id: string
}

export interface DeleteCompanyParams {
  id: string
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
        status: params.status,
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
        status: params.status,
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

export async function createCompanyWithCustomers(formData: FormData) {
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

    // Create company
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

    const customerFile = formData.get("customerFile") as File
    let importedCount = 0
    let failedCount = 0
    const errors: string[] = []

    if (customerFile && customerFile.size > 0) {
      console.log("[v0] ===== PROCESSANDO ARQUIVO DE CLIENTES =====")
      console.log("[v0] Nome do arquivo:", customerFile.name)
      console.log("[v0] Tamanho:", customerFile.size, "bytes")

      const text = await customerFile.text()
      console.log("[v0] Conteúdo lido:", text.substring(0, 200) + "...")

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            result.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }

        result.push(current.trim())
        return result
      }

      const lines = text.split("\n").filter((line) => line.trim())
      const headers = parseCSVLine(lines[0]).map((h) =>
        h
          .trim()
          .toLowerCase()
          .replace(/[^\w\s]/g, ""),
      )

      console.log("[v0] Cabeçalhos detectados:", headers)
      console.log("[v0] Total de linhas (incluindo cabeçalho):", lines.length)

      const headerMap: Record<string, string> = {
        // Nome variations
        nome: "name",
        name: "name",
        cliente: "name",
        razaosocial: "name",
        razao_social: "name",
        titular: "name",

        // Email variations
        email: "email",
        e_mail: "email",
        correio: "email",

        // Phone variations
        telefone: "phone",
        phone: "phone",
        celular: "phone",
        fone: "phone",
        contato: "phone",
        whatsapp: "phone",

        // Document variations
        documento: "document",
        cpf: "document",
        cnpj: "document",
        document: "document",
        cpfcnpj: "document",
        cpf_cnpj: "document",

        // Address variations
        endereco: "address",
        address: "address",
        rua: "address",
        logradouro: "address",

        // City variations
        cidade: "city",
        city: "city",
        municipio: "city",

        // State variations
        estado: "state",
        state: "state",
        uf: "state",

        // Zipcode variations
        cep: "zip_code",
        zipcode: "zip_code",
        zip_code: "zip_code",
        codigo_postal: "zip_code",
      }

      console.log("[v0] Mapeamento de colunas:")
      headers.forEach((header, index) => {
        const mapped = headerMap[header]
        console.log(`[v0]   ${index}: "${header}" → ${mapped || "NÃO MAPEADO"}`)
      })

      const customers = []

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i])
          const customer: any = {
            company_id: company.id,
          }

          console.log(`[v0] --- Linha ${i} ---`)
          console.log(`[v0] Valores:`, values)

          headers.forEach((header, index) => {
            const dbColumn = headerMap[header]
            const value = values[index]?.trim()

            if (dbColumn && value) {
              customer[dbColumn] = value
              console.log(`[v0]   ${header} (${dbColumn}): "${value}"`)
            }
          })

          if (customer.document) {
            const cleanDoc = customer.document.replace(/\D/g, "")
            customer.document_type = cleanDoc.length === 11 ? "CPF" : "CNPJ"
            customer.document = cleanDoc
            console.log(`[v0]   Documento limpo: ${cleanDoc} (${customer.document_type})`)
          }

          if (!customer.name) {
            console.log(`[v0]   ✗ IGNORADO: Nome não encontrado`)
            errors.push(`Linha ${i}: Nome não encontrado`)
            continue
          }

          customers.push(customer)
          console.log(`[v0]   ✓ Cliente válido adicionado`)
        } catch (error) {
          console.error(`[v0]   ✗ ERRO ao processar linha ${i}:`, error)
          errors.push(`Linha ${i}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
          failedCount++
        }
      }

      console.log("[v0] ===== RESUMO DO PARSING =====")
      console.log("[v0] Total de clientes válidos:", customers.length)
      console.log("[v0] Total de erros:", errors.length)

      if (customers.length > 0) {
        console.log("[v0] Inserindo clientes no banco de dados...")

        const { data: insertedCustomers, error: customersError } = await supabase
          .from("customers")
          .insert(customers)
          .select()

        if (customersError) {
          console.error("[v0] ✗ ERRO ao importar clientes:", customersError)
          failedCount += customers.length
          errors.push(`Erro no banco: ${customersError.message}`)
        } else {
          importedCount = insertedCustomers?.length || 0
          console.log("[v0] ✓ Clientes importados com sucesso:", importedCount)
        }
      }
    }

    revalidatePath("/super-admin/empresas")
    revalidatePath("/super-admin/companies")

    console.log("[v0] ===== FINALIZADO =====")
    console.log("[v0] Empresa ID:", company.id)
    console.log("[v0] Clientes importados:", importedCount)
    console.log("[v0] Clientes com erro:", failedCount)

    return {
      success: true,
      message: `Empresa criada com sucesso! ${importedCount > 0 ? `${importedCount} clientes importados.` : ""}${failedCount > 0 ? ` ${failedCount} falharam.` : ""}`,
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

export async function importCustomersToCompany(formData: FormData) {
  try {
    console.log("[v0] ===== INICIANDO IMPORTAÇÃO DE CLIENTES =====")
    const supabase = await createClient()

    const companyId = formData.get("companyId") as string
    const customerFile = formData.get("file") as File

    if (!companyId) {
      return {
        success: false,
        error: "ID da empresa não fornecido",
      }
    }

    if (!customerFile || customerFile.size === 0) {
      return {
        success: false,
        error: "Arquivo não fornecido",
      }
    }

    console.log("[v0] Company ID:", companyId)
    console.log("[v0] Arquivo:", customerFile.name, customerFile.size, "bytes")

    // Verify company exists
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

    const text = await customerFile.text()
    console.log("[v0] Conteúdo lido:", text.substring(0, 200) + "...")

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result
    }

    const lines = text.split("\n").filter((line) => line.trim())
    const headers = parseCSVLine(lines[0]).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, ""),
    )

    console.log("[v0] Cabeçalhos detectados:", headers)
    console.log("[v0] Total de linhas (incluindo cabeçalho):", lines.length)

    const headerMap: Record<string, string> = {
      // Nome variations
      nome: "name",
      name: "name",
      cliente: "name",
      razaosocial: "name",
      razao_social: "name",
      titular: "name",

      // Email variations
      email: "email",
      e_mail: "email",
      correio: "email",

      // Phone variations
      telefone: "phone",
      phone: "phone",
      celular: "phone",
      fone: "phone",
      contato: "phone",
      whatsapp: "phone",

      // Document variations
      documento: "document",
      cpf: "document",
      cnpj: "document",
      document: "document",
      cpfcnpj: "document",
      cpf_cnpj: "document",

      // Address variations
      endereco: "address",
      address: "address",
      rua: "address",
      logradouro: "address",

      // City variations
      cidade: "city",
      city: "city",
      municipio: "city",

      // State variations
      estado: "state",
      state: "state",
      uf: "state",

      // Zipcode variations
      cep: "zip_code",
      zipcode: "zip_code",
      zip_code: "zip_code",
      codigo_postal: "zip_code",
    }

    console.log("[v0] Mapeamento de colunas:")
    headers.forEach((header, index) => {
      const mapped = headerMap[header]
      console.log(`[v0]   ${index}: "${header}" → ${mapped || "NÃO MAPEADO"}`)
    })

    const customers = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        const customer: any = {
          company_id: companyId,
        }

        console.log(`[v0] --- Linha ${i} ---`)
        console.log(`[v0] Valores:`, values)

        headers.forEach((header, index) => {
          const dbColumn = headerMap[header]
          const value = values[index]?.trim()

          if (dbColumn && value) {
            customer[dbColumn] = value
            console.log(`[v0]   ${header} (${dbColumn}): "${value}"`)
          }
        })

        if (customer.document) {
          const cleanDoc = customer.document.replace(/\D/g, "")
          customer.document_type = cleanDoc.length === 11 ? "CPF" : "CNPJ"
          customer.document = cleanDoc
          console.log(`[v0]   Documento limpo: ${cleanDoc} (${customer.document_type})`)
        }

        if (!customer.name) {
          console.log(`[v0]   ✗ IGNORADO: Nome não encontrado`)
          errors.push(`Linha ${i}: Nome não encontrado`)
          continue
        }

        customers.push(customer)
        console.log(`[v0]   ✓ Cliente válido adicionado`)
      } catch (error) {
        console.error(`[v0]   ✗ ERRO ao processar linha ${i}:`, error)
        errors.push(`Linha ${i}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      }
    }

    console.log("[v0] ===== RESUMO DO PARSING =====")
    console.log("[v0] Total de clientes válidos:", customers.length)
    console.log("[v0] Total de erros:", errors.length)

    let importedCount = 0
    let failedCount = errors.length

    if (customers.length > 0) {
      console.log("[v0] Inserindo clientes no banco de dados...")

      const { data: insertedCustomers, error: customersError } = await supabase
        .from("customers")
        .insert(customers)
        .select()

      if (customersError) {
        console.error("[v0] ✗ ERRO ao importar clientes:", customersError)
        failedCount += customers.length
        errors.push(`Erro no banco: ${customersError.message}`)
      } else {
        importedCount = insertedCustomers?.length || 0
        console.log("[v0] ✓ Clientes importados com sucesso:", importedCount)
      }
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
      customersImported: importedCount,
      customersFailed: failedCount,
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
