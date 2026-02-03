/**
 * Masks a card number, keeping only the last 4 digits visible.
 * Example: "4111111111111111" → "************1111"
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s|-/g, "")
  if (cleaned.length < 4) return "****"
  const lastFour = cleaned.slice(-4)
  const masked = "*".repeat(cleaned.length - 4) + lastFour
  return masked
}

/**
 * Masks a CPF/CNPJ, showing only first 3 and last 2 digits.
 * Example: "12345678901" → "123*****01"
 */
export function maskDocument(document: string): string {
  const cleaned = document.replace(/[^\d]/g, "")
  if (cleaned.length <= 5) return "*".repeat(cleaned.length)
  return cleaned.slice(0, 3) + "*".repeat(cleaned.length - 5) + cleaned.slice(-2)
}

/**
 * Sanitizes a log object by masking sensitive fields.
 * Modifies the object in place and returns it.
 */
export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    "cardNumber",
    "card_number",
    "cvv",
    "cvc",
    "securityCode",
    "security_code",
    "password",
    "secret",
    "token",
    "access_token",
    "apiKey",
    "api_key",
  ]

  const sanitized = { ...data }

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = "[REDACTED]"
    } else if (key === "cpfCnpj" || key === "cpf_cnpj" || key === "document") {
      sanitized[key] = maskDocument(String(sanitized[key]))
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key] as Record<string, unknown>)
    }
  }

  return sanitized
}
