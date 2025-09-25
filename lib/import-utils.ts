export interface ImportValidationError {
  line: number
  field: string
  value: string
  error: string
}

export interface ImportResult {
  success: boolean
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors: ImportValidationError[]
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, "")

  // Check if has 11 digits
  if (cleanCPF.length !== 11) return false

  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Validate CPF algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleanCPF.charAt(10))) return false

  return true
}

export function validateCNPJ(cnpj: string): boolean {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, "")

  // Check if has 14 digits
  if (cleanCNPJ.length !== 14) return false

  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false

  // Validate CNPJ algorithm
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(cleanCNPJ.charAt(i)) * weights1[i]
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (digit1 !== Number.parseInt(cleanCNPJ.charAt(12))) return false

  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += Number.parseInt(cleanCNPJ.charAt(i)) * weights2[i]
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  if (digit2 !== Number.parseInt(cleanCNPJ.charAt(13))) return false

  return true
}

export function validateDocument(document: string): boolean {
  const cleanDoc = document.replace(/\D/g, "")

  if (cleanDoc.length === 11) {
    return validateCPF(document)
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(document)
  }

  return false
}

export function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
      const row: any = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      data.push(row)
    }
  }

  return data
}

export function validateCustomerRecord(record: any, lineNumber: number): ImportValidationError[] {
  const errors: ImportValidationError[] = []

  // Required fields
  if (!record.nome || record.nome.trim() === "") {
    errors.push({
      line: lineNumber,
      field: "nome",
      value: record.nome || "",
      error: "Nome é obrigatório",
    })
  }

  if (!record.email || record.email.trim() === "") {
    errors.push({
      line: lineNumber,
      field: "email",
      value: record.email || "",
      error: "Email é obrigatório",
    })
  } else if (!validateEmail(record.email)) {
    errors.push({
      line: lineNumber,
      field: "email",
      value: record.email,
      error: "Email inválido",
    })
  }

  if (!record.documento || record.documento.trim() === "") {
    errors.push({
      line: lineNumber,
      field: "documento",
      value: record.documento || "",
      error: "Documento (CPF/CNPJ) é obrigatório",
    })
  } else if (!validateDocument(record.documento)) {
    errors.push({
      line: lineNumber,
      field: "documento",
      value: record.documento,
      error: "CPF/CNPJ inválido",
    })
  }

  return errors
}

export function validateDebtRecord(record: any, lineNumber: number): ImportValidationError[] {
  const errors: ImportValidationError[] = []

  // Required fields
  if (!record.cliente_documento || record.cliente_documento.trim() === "") {
    errors.push({
      line: lineNumber,
      field: "cliente_documento",
      value: record.cliente_documento || "",
      error: "Documento do cliente é obrigatório",
    })
  } else if (!validateDocument(record.cliente_documento)) {
    errors.push({
      line: lineNumber,
      field: "cliente_documento",
      value: record.cliente_documento,
      error: "CPF/CNPJ do cliente inválido",
    })
  }

  if (!record.valor_original || isNaN(Number.parseFloat(record.valor_original))) {
    errors.push({
      line: lineNumber,
      field: "valor_original",
      value: record.valor_original || "",
      error: "Valor original deve ser um número válido",
    })
  }

  if (!record.valor_atual || isNaN(Number.parseFloat(record.valor_atual))) {
    errors.push({
      line: lineNumber,
      field: "valor_atual",
      value: record.valor_atual || "",
      error: "Valor atual deve ser um número válido",
    })
  }

  if (!record.data_vencimento) {
    errors.push({
      line: lineNumber,
      field: "data_vencimento",
      value: record.data_vencimento || "",
      error: "Data de vencimento é obrigatória",
    })
  } else {
    const date = new Date(record.data_vencimento)
    if (isNaN(date.getTime())) {
      errors.push({
        line: lineNumber,
        field: "data_vencimento",
        value: record.data_vencimento,
        error: "Data de vencimento inválida (use formato YYYY-MM-DD)",
      })
    }
  }

  return errors
}
