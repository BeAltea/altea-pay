"use server"

import { db } from "@/lib/db"
import { companies, vmax } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

/**
 * Busca o nome da tabela de clientes de uma empresa
 */
export async function getCompanyTableName(companyId: string) {
  try {
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        customerTableName: companies.customerTableName,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    if (!company) {
      console.error("[v0] getCompanyTableName - Company not found")
      return { success: false, tableName: null, companyName: null }
    }

    // Se nao tiver customer_table_name definido, usa o nome da empresa em uppercase
    const tableName = company.customerTableName || company.name.toUpperCase().replace(/\s+/g, "_")

    console.log("[v0] getCompanyTableName - Company:", company.name, "Table:", tableName)

    return { success: true, tableName, companyName: company.name }
  } catch (error) {
    console.error("[v0] getCompanyTableName - Error:", error)
    return { success: false, tableName: null, companyName: null }
  }
}

/**
 * Busca as colunas disponiveis na tabela de clientes de uma empresa
 * Note: With Drizzle, we use the VMAX table schema directly
 */
export async function getCompanyTableColumns(companyId: string) {
  try {
    const { tableName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, columns: [], tableName: null }
    }

    // Busca um registro da tabela VMAX para pegar os nomes das colunas
    const data = await db.select().from(vmax).limit(1)

    // Pega todos os nomes de colunas do primeiro registro
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    // Filtra colunas do sistema que nao devem ser editadas
    const editableColumns = columns.filter(
      (col) =>
        ![
          "id",
          "idCompany",
          "createdAt",
          "updatedAt",
          "analysisMetadata",
          "lastAnalysisDate",
          "collectionProcessedAt",
          "lastCollectionAttempt",
          "approvalStatus",
          "autoCollectionEnabled",
          "creditScore",
          "riskLevel",
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
 * Cria um cliente na tabela especifica da empresa
 */
export async function createCompanyClient(companyId: string, clientData: Record<string, any>) {
  try {
    // Busca o nome da tabela da empresa
    const { tableName, companyName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, message: "Empresa nao encontrada ou sem tabela configurada" }
    }

    console.log("[v0] createCompanyClient - Creating client in table:", tableName)

    const cpfCnpj = clientData["CPF/CNPJ"] || clientData.cpf_cnpj || clientData.document
    if (cpfCnpj) {
      const [existingCustomer] = await db
        .select({ id: vmax.id })
        .from(vmax)
        .where(
          sql`${vmax.cpfCnpj} = ${cpfCnpj} AND ${vmax.idCompany} = ${companyId}`,
        )
        .limit(1)

      if (existingCustomer) {
        return { success: false, message: "Cliente ja cadastrado nesta empresa" }
      }
    }

    // Prepara dados para insercao
    const insertValues: any = {
      idCompany: companyId,
      autoCollectionEnabled: false,
      approvalStatus: "PENDENTE",
      cliente: clientData.Cliente || clientData.name,
      cpfCnpj: clientData["CPF/CNPJ"] || clientData.cpf_cnpj || clientData.document,
      cidade: clientData.Cidade || clientData.city,
    }

    // Insere o cliente
    const [newCustomer] = await db
      .insert(vmax)
      .values(insertValues)
      .returning()

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
 * Busca todos os clientes de uma empresa (de sua tabela especifica)
 */
export async function getCompanyClients(companyId: string) {
  try {
    const { tableName } = await getCompanyTableName(companyId)
    if (!tableName) {
      return { success: false, data: [], tableName: null }
    }

    const data = await db
      .select()
      .from(vmax)
      .where(eq(vmax.idCompany, companyId))
      .orderBy(desc(vmax.createdAt))

    console.log("[v0] getCompanyClients - Found clients:", data.length)

    return { success: true, data: data, tableName }
  } catch (error) {
    console.error("[v0] getCompanyClients - Error:", error)
    return { success: false, data: [], tableName: null }
  }
}
