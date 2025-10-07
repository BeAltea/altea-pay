// Utilitários para normalização e padronização de dados

import type { StandardizedCustomer, StandardizedDebt, CustomerStatus } from "../integrations/erp/types"

// Remove máscara de CPF/CNPJ
export function cleanDocument(doc: string): string {
  return doc.replace(/[^\d]/g, "")
}

// Valida CPF
export function isValidCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf)
  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== Number.parseInt(cleaned.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== Number.parseInt(cleaned.charAt(10))) return false

  return true
}

// Valida CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj)
  if (cleaned.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleaned)) return false

  let size = cleaned.length - 2
  let numbers = cleaned.substring(0, size)
  const digits = cleaned.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(0))) return false

  size = size + 1
  numbers = cleaned.substring(0, size)
  sum = 0
  pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(1))) return false

  return true
}

// Valida CPF ou CNPJ
export function isValidDocument(doc: string): boolean {
  const cleaned = cleanDocument(doc)
  if (cleaned.length === 11) return isValidCPF(cleaned)
  if (cleaned.length === 14) return isValidCNPJ(cleaned)
  return false
}

// Normaliza string (remove acentos, converte para minúsculas, remove espaços extras)
export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

// Normaliza telefone
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, "")
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`
  }
  return phone
}

// Normaliza email
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// Normaliza data (converte para formato ISO)
export function normalizeDate(date: string | Date): string {
  if (date instanceof Date) {
    return date.toISOString().split("T")[0]
  }

  // Tenta parsear diferentes formatos de data
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = date.match(format)
    if (match) {
      if (format === formats[0]) {
        return date // Já está no formato correto
      } else {
        const [, day, month, year] = match
        return `${year}-${month}-${day}`
      }
    }
  }

  // Se não conseguir parsear, tenta criar um Date
  const parsed = new Date(date)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }

  return date
}

// Mapeia status de diferentes sistemas para o padrão interno
export function normalizeStatus(status: string): CustomerStatus {
  const normalized = normalizeString(status)

  const statusMap: Record<string, CustomerStatus> = {
    inadimplente: "inadimplente",
    inad: "inadimplente",
    overdue: "inadimplente",
    atrasado: "inadimplente",
    devedor: "inadimplente",

    "em acordo": "em_acordo",
    em_acordo: "em_acordo",
    acordo: "em_acordo",
    agreement: "em_acordo",
    negociacao: "em_acordo",

    pago: "pago",
    paid: "pago",
    quitado: "pago",
    liquidado: "pago",

    ativo: "ativo",
    active: "ativo",
    regular: "ativo",
    adimplente: "ativo",
  }

  return statusMap[normalized] || "ativo"
}

// Detecta campos equivalentes em diferentes origens
export function detectFieldMapping(data: any): Record<string, string> {
  const mapping: Record<string, string> = {}

  // Mapeamento de nomes
  const nameFields = ["name", "nome", "full_name", "fullname", "client_name", "customer_name", "razao_social"]
  for (const field of nameFields) {
    if (data[field]) {
      mapping.name = field
      break
    }
  }

  // Mapeamento de documentos
  const docFields = ["cpf", "cnpj", "cpf_cnpj", "document", "documento", "doc", "tax_id"]
  for (const field of docFields) {
    if (data[field]) {
      mapping.document = field
      break
    }
  }

  // Mapeamento de email
  const emailFields = ["email", "e_mail", "mail", "email_address"]
  for (const field of emailFields) {
    if (data[field]) {
      mapping.email = field
      break
    }
  }

  // Mapeamento de telefone
  const phoneFields = ["phone", "telefone", "tel", "celular", "mobile", "phone_number"]
  for (const field of phoneFields) {
    if (data[field]) {
      mapping.phone = field
      break
    }
  }

  // Mapeamento de endereço
  const addressFields = ["address", "endereco", "addr", "street", "rua"]
  for (const field of addressFields) {
    if (data[field]) {
      mapping.address = field
      break
    }
  }

  return mapping
}

// Normaliza cliente de qualquer origem para formato padrão
export function normalizeCustomerData(
  rawData: any,
  sourceSystem: string,
  companyId: string,
): StandardizedCustomer | null {
  try {
    const mapping = detectFieldMapping(rawData)

    const name = rawData[mapping.name || "name"]
    const document = rawData[mapping.document || "document"]

    if (!name || !document) {
      console.error("[v0] Missing required fields:", { name, document })
      return null
    }

    const cleanedDoc = cleanDocument(document)
    if (!isValidDocument(cleanedDoc)) {
      console.error("[v0] Invalid document:", document)
      return null
    }

    return {
      external_id: rawData.id || rawData.external_id || cleanedDoc,
      name: normalizeString(name),
      cpfCnpj: cleanedDoc,
      email: rawData[mapping.email || "email"] ? normalizeEmail(rawData[mapping.email || "email"]) : undefined,
      phone: rawData[mapping.phone || "phone"] ? normalizePhone(rawData[mapping.phone || "phone"]) : undefined,
      address: rawData[mapping.address || "address"],
      city: rawData.city || rawData.cidade,
      state: rawData.state || rawData.estado || rawData.uf,
      zip_code: rawData.zip_code || rawData.cep,
      balance: rawData.balance || rawData.saldo || 0,
      status: rawData.status ? normalizeStatus(rawData.status) : "ativo",
      source_system: sourceSystem,
      company_id: companyId,
    }
  } catch (error) {
    console.error("[v0] Error normalizing customer:", error)
    return null
  }
}

// Normaliza dívida de qualquer origem para formato padrão
export function normalizeDebtData(rawData: any, sourceSystem: string, companyId: string): StandardizedDebt | null {
  try {
    const amount = Number.parseFloat(rawData.amount || rawData.valor || rawData.value || "0")
    const dueDate = rawData.due_date || rawData.vencimento || rawData.data_vencimento

    if (!amount || !dueDate) {
      console.error("[v0] Missing required debt fields:", { amount, dueDate })
      return null
    }

    return {
      external_id: rawData.id || rawData.external_id || `${rawData.customer_id}-${dueDate}`,
      customer_external_id: rawData.customer_id || rawData.client_id || rawData.cliente_id,
      amount,
      due_date: normalizeDate(dueDate),
      description: rawData.description || rawData.descricao || rawData.obs,
      status: rawData.status === "paid" || rawData.status === "pago" ? "paid" : "pending",
      classification: rawData.classification || rawData.classificacao || "medium",
      source_system: sourceSystem,
      company_id: companyId,
    }
  } catch (error) {
    console.error("[v0] Error normalizing debt:", error)
    return null
  }
}
