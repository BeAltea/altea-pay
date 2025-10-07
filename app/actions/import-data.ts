"use server"

import { createClient } from "@/lib/supabase/server"
import Papa from "papaparse"
import * as XLSX from "xlsx"

export interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
  duplicates: number
}

interface CustomerData {
  name: string
  document: string
  document_type: "CPF" | "CNPJ"
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
}

interface DebtData {
  customer_document: string
  amount: number
  due_date: string
  description: string
  classification?: "critical" | "high" | "medium" | "low"
}

// Validação de CPF
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "")
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number.parseInt(cpf.charAt(i)) * (10 - i)
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== Number.parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number.parseInt(cpf.charAt(i)) * (11 - i)
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  return digit === Number.parseInt(cpf.charAt(10))
}

// Validação de CNPJ
function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "")
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false

  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === Number.parseInt(digits.charAt(1))
}

// Validação de email
function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Processar CSV
async function processCSV(content: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    })
  })
}

// Processar XLSX
function processXLSX(buffer: ArrayBuffer): any[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(firstSheet)
}

// Processar JSON
function processJSON(content: string): any[] {
  const data = JSON.parse(content)
  return Array.isArray(data) ? data : [data]
}

// Processar XML
function processXML(content: string): any[] {
  // Implementação básica - pode ser melhorada com fast-xml-parser
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(content, "text/xml")
  const items = xmlDoc.getElementsByTagName("item")
  const result: any[] = []

  for (let i = 0; i < items.length; i++) {
    const item: any = {}
    const children = items[i].children
    for (let j = 0; j < children.length; j++) {
      item[children[j].tagName] = children[j].textContent
    }
    result.push(item)
  }

  return result
}

export async function importCustomers(file: File, companyId: string): Promise<ImportResult> {
  try {
    const supabase = await createClient()

    // Verificar autenticação e permissões
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "Não autenticado", imported: 0, errors: [], duplicates: 0 }
    }

    // Verificar se o usuário pertence à empresa
    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single()

    if (!profile || (profile.company_id !== companyId && profile.role !== "super_admin")) {
      return {
        success: false,
        message: "Sem permissão para importar dados desta empresa",
        imported: 0,
        errors: [],
        duplicates: 0,
      }
    }

    // Processar arquivo baseado no tipo
    const fileType = file.name.split(".").pop()?.toLowerCase()
    let data: any[] = []

    if (fileType === "csv") {
      const content = await file.text()
      data = await processCSV(content)
    } else if (fileType === "xlsx" || fileType === "xls") {
      const buffer = await file.arrayBuffer()
      data = processXLSX(buffer)
    } else if (fileType === "json") {
      const content = await file.text()
      data = processJSON(content)
    } else if (fileType === "xml") {
      const content = await file.text()
      data = processXML(content)
    } else {
      return { success: false, message: "Formato de arquivo não suportado", imported: 0, errors: [], duplicates: 0 }
    }

    const errors: string[] = []
    let imported = 0
    let duplicates = 0

    // Processar cada registro
    for (let i = 0; i < data.length; i++) {
      const row = data[i]

      try {
        // Normalizar campos (aceitar variações de nomes de colunas)
        const customerData: CustomerData = {
          name: row.name || row.nome || row.Name || row.Nome || "",
          document: (row.document || row.cpf || row.cnpj || row.documento || "").replace(/[^\d]/g, ""),
          document_type:
            (row.document || row.cpf || row.cnpj || row.documento || "").replace(/[^\d]/g, "").length === 11
              ? "CPF"
              : "CNPJ",
          email: row.email || row.Email || "",
          phone: row.phone || row.telefone || row.Phone || row.Telefone || "",
          address: row.address || row.endereco || row.Address || row.Endereço || "",
          city: row.city || row.cidade || row.City || row.Cidade || "",
          state: row.state || row.estado || row.State || row.Estado || row.uf || row.UF || "",
          zip_code: row.zip_code || row.cep || row.CEP || "",
        }

        // Validações
        if (!customerData.name) {
          errors.push(`Linha ${i + 1}: Nome obrigatório`)
          continue
        }

        if (!customerData.document) {
          errors.push(`Linha ${i + 1}: Documento obrigatório`)
          continue
        }

        if (customerData.document_type === "CPF" && !validateCPF(customerData.document)) {
          errors.push(`Linha ${i + 1}: CPF inválido (${customerData.document})`)
          continue
        }

        if (customerData.document_type === "CNPJ" && !validateCNPJ(customerData.document)) {
          errors.push(`Linha ${i + 1}: CNPJ inválido (${customerData.document})`)
          continue
        }

        if (customerData.email && !validateEmail(customerData.email)) {
          errors.push(`Linha ${i + 1}: Email inválido (${customerData.email})`)
          continue
        }

        // Verificar duplicata
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", companyId)
          .eq("document", customerData.document)
          .single()

        if (existing) {
          duplicates++
          continue
        }

        // Inserir no banco
        const { error: insertError } = await supabase.from("customers").insert({
          company_id: companyId,
          name: customerData.name,
          document: customerData.document,
          document_type: customerData.document_type,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          zip_code: customerData.zip_code,
          source_system: "manual",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) {
          errors.push(`Linha ${i + 1}: Erro ao inserir - ${insertError.message}`)
          continue
        }

        imported++
      } catch (error: any) {
        errors.push(`Linha ${i + 1}: ${error.message}`)
      }
    }

    return {
      success: imported > 0,
      message: `Importação concluída: ${imported} registros importados, ${duplicates} duplicados, ${errors.length} erros`,
      imported,
      errors: errors.slice(0, 10), // Limitar a 10 erros para não sobrecarregar a UI
      duplicates,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao processar arquivo: ${error.message}`,
      imported: 0,
      errors: [error.message],
      duplicates: 0,
    }
  }
}

export async function importDebts(file: File, companyId: string): Promise<ImportResult> {
  try {
    const supabase = await createClient()

    // Verificar autenticação e permissões
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "Não autenticado", imported: 0, errors: [], duplicates: 0 }
    }

    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single()

    if (!profile || (profile.company_id !== companyId && profile.role !== "super_admin")) {
      return {
        success: false,
        message: "Sem permissão para importar dados desta empresa",
        imported: 0,
        errors: [],
        duplicates: 0,
      }
    }

    // Processar arquivo
    const fileType = file.name.split(".").pop()?.toLowerCase()
    let data: any[] = []

    if (fileType === "csv") {
      const content = await file.text()
      data = await processCSV(content)
    } else if (fileType === "xlsx" || fileType === "xls") {
      const buffer = await file.arrayBuffer()
      data = processXLSX(buffer)
    } else if (fileType === "json") {
      const content = await file.text()
      data = processJSON(content)
    } else if (fileType === "xml") {
      const content = await file.text()
      data = processXML(content)
    } else {
      return { success: false, message: "Formato de arquivo não suportado", imported: 0, errors: [], duplicates: 0 }
    }

    const errors: string[] = []
    let imported = 0
    let duplicates = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]

      try {
        const debtData: DebtData = {
          customer_document: (row.customer_document || row.cpf || row.cnpj || row.documento || "").replace(
            /[^\d]/g,
            "",
          ),
          amount: Number.parseFloat(row.amount || row.valor || row.Amount || row.Valor || "0"),
          due_date: row.due_date || row.vencimento || row.data_vencimento || "",
          description: row.description || row.descricao || row.Description || row.Descrição || "",
          classification: row.classification || row.classificacao || "medium",
        }

        // Validações
        if (!debtData.customer_document) {
          errors.push(`Linha ${i + 1}: Documento do cliente obrigatório`)
          continue
        }

        if (!debtData.amount || debtData.amount <= 0) {
          errors.push(`Linha ${i + 1}: Valor inválido`)
          continue
        }

        if (!debtData.due_date) {
          errors.push(`Linha ${i + 1}: Data de vencimento obrigatória`)
          continue
        }

        // Buscar cliente
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", companyId)
          .eq("document", debtData.customer_document)
          .single()

        if (!customer) {
          errors.push(`Linha ${i + 1}: Cliente não encontrado (${debtData.customer_document})`)
          continue
        }

        // Verificar duplicata (mesmo cliente, mesmo valor, mesma data)
        const { data: existing } = await supabase
          .from("debts")
          .select("id")
          .eq("company_id", companyId)
          .eq("customer_id", customer.id)
          .eq("amount", debtData.amount)
          .eq("due_date", debtData.due_date)
          .single()

        if (existing) {
          duplicates++
          continue
        }

        // Inserir dívida
        const { error: insertError } = await supabase.from("debts").insert({
          company_id: companyId,
          customer_id: customer.id,
          amount: debtData.amount,
          due_date: debtData.due_date,
          description: debtData.description,
          status: "pending",
          classification: debtData.classification,
          source_system: "manual",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) {
          errors.push(`Linha ${i + 1}: Erro ao inserir - ${insertError.message}`)
          continue
        }

        imported++
      } catch (error: any) {
        errors.push(`Linha ${i + 1}: ${error.message}`)
      }
    }

    return {
      success: imported > 0,
      message: `Importação concluída: ${imported} dívidas importadas, ${duplicates} duplicadas, ${errors.length} erros`,
      imported,
      errors: errors.slice(0, 10),
      duplicates,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao processar arquivo: ${error.message}`,
      imported: 0,
      errors: [error.message],
      duplicates: 0,
    }
  }
}
