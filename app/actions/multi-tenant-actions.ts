"use server"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Busca o nome da tabela de clientes de uma empresa
 */
export async function getCompanyTableName(companyId: string) {
  try {
    const supabase = createAdminClient()

    const { data: company, error } = await supabase
      .from("companies")
      .select("id, name, customer_table_name")
      .eq("id", companyId)
      .single()

    if (error || !company) {
      console.error("[v0] getCompanyTableName - Error:", error)
      return { success: false, tableName: null, companyName: null }
    }

    // Se não tiver customer_table_name definido, usa o nome da empresa em uppercase
    const tableName = company.customer_table_name || company.name.toUpperCase().replace(/\s+/g, "_")

    console.log("[v0] getCompanyTableName - Company:", company.name, "Table:", tableName)

    return { success: true, tableName, companyName: company.name }
  } catch (error) {
    console.error("[v0] getCompanyTableName - Error:", error)
    return { success: false, tableName: null, companyName: null }
  }
}

/**
 * Busca as colunas disponíveis na tabela de clientes de uma empresa
 */
export async function getCompanyTableColumns(companyId: string) {
  try {
    const supabase = createAdminClient()

    // Primeiro busca o nome da tabela
    const { tableName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, columns: [], tableName: null }
    }

    // Busca um registro da tabela para pegar os nomes das colunas
    const { data, error } = await supabase.from(tableName).select("*").limit(1)

    if (error) {
      console.error("[v0] getCompanyTableColumns - Error:", error)
      return { success: false, columns: [], tableName }
    }

    // Pega todos os nomes de colunas do primeiro registro
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    // Filtra colunas do sistema que não devem ser editadas
    const editableColumns = columns.filter(
      (col) =>
        ![
          "id",
          "id_company",
          "created_at",
          "updated_at",
          "analysis_metadata",
          "last_analysis_date",
          "collection_processed_at",
          "last_collection_attempt",
          "approval_status",
          "auto_collection_enabled",
          "credit_score",
          "risk_level",
        ].includes(col),
    )

    console.log("[v0] getCompanyTableColumns - Found columns:", editableColumns.length)

    return { success: true, columns: editableColumns, tableName }
  } catch (error) {
    console.error("[v0] getCompanyTableColumns - Error:", error)
    return { success: false, columns: [], tableName: null }
  }
}

/**
 * Cria um cliente na tabela específica da empresa
 */
export async function createCompanyClient(companyId: string, clientData: Record<string, any>) {
  try {
    const supabase = createAdminClient()

    // Busca o nome da tabela da empresa
    const { tableName, companyName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, message: "Empresa não encontrada ou sem tabela configurada" }
    }

    console.log("[v0] createCompanyClient - Creating client in table:", tableName)

    // Verifica se cliente já existe (baseado em CPF/CNPJ se existir)
    const cpfCnpj = clientData["CPF/CNPJ"] || clientData.cpf_cnpj || clientData.document
    if (cpfCnpj) {
      const { data: existingCustomer } = await supabase
        .from(tableName)
        .select("id")
        .eq("CPF/CNPJ", cpfCnpj)
        .eq("id_company", companyId)
        .maybeSingle()

      if (existingCustomer) {
        return { success: false, message: "Cliente já cadastrado nesta empresa" }
      }
    }

    // Prepara dados para inserção
    const insertData: Record<string, any> = {
      ...clientData,
      id_company: companyId,
      auto_collection_enabled: false,
      approval_status: "PENDENTE",
    }

    // Remove campos undefined ou null
    Object.keys(insertData).forEach((key) => {
      if (insertData[key] === undefined || insertData[key] === null || insertData[key] === "") {
        delete insertData[key]
      }
    })

    // Insere o cliente
    const { data: newCustomer, error: insertError } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error("[v0] createCompanyClient - Error inserting:", insertError)
      return { success: false, message: `Erro ao cadastrar cliente: ${insertError.message}` }
    }

    console.log("[v0] createCompanyClient - Cliente criado com sucesso:", newCustomer.id)

    return {
      success: true,
      message: `Cliente cadastrado com sucesso na empresa ${companyName}!`,
      customer: newCustomer,
    }
  } catch (error: any) {
    console.error("[v0] createCompanyClient - Error:", error)
    return {
      success: false,
      message: `Erro inesperado: ${error.message}`,
    }
  }
}

/**
 * Busca todos os clientes de uma empresa (de sua tabela específica)
 */
export async function getCompanyClients(companyId: string) {
  try {
    const supabase = createAdminClient()

    const { tableName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, data: [], tableName: null }
    }

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id_company", companyId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] getCompanyClients - Error:", error)
      return { success: false, data: [], tableName }
    }

    console.log("[v0] getCompanyClients - Found clients:", data?.length || 0)

    return { success: true, data: data || [], tableName }
  } catch (error) {
    console.error("[v0] getCompanyClients - Error:", error)
    return { success: false, data: [], tableName: null }
  }
}
