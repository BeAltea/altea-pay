import { describe, it, expect } from "vitest"
import { maskCardNumber, maskDocument, sanitizeForLog } from "../../src/security/pci-helpers"

describe("maskCardNumber", () => {
  it("masks a 16-digit card number keeping last 4", () => {
    expect(maskCardNumber("4111111111111111")).toBe("************1111")
  })

  it("handles card numbers with spaces", () => {
    expect(maskCardNumber("4111 1111 1111 1111")).toBe("************1111")
  })

  it("handles card numbers with dashes", () => {
    expect(maskCardNumber("4111-1111-1111-1111")).toBe("************1111")
  })

  it("handles short card numbers (less than 4 digits)", () => {
    expect(maskCardNumber("123")).toBe("****")
  })

  it("handles exactly 4 digits", () => {
    expect(maskCardNumber("1234")).toBe("1234")
  })

  it("handles 15-digit AMEX numbers", () => {
    expect(maskCardNumber("378282246310005")).toBe("***********0005")
  })
})

describe("maskDocument", () => {
  it("masks a CPF (11 digits)", () => {
    expect(maskDocument("12345678901")).toBe("123******01")
  })

  it("masks a CNPJ (14 digits)", () => {
    expect(maskDocument("12345678000199")).toBe("123*********99")
  })

  it("handles documents with formatting", () => {
    expect(maskDocument("123.456.789-01")).toBe("123******01")
  })

  it("handles very short documents (5 or fewer digits)", () => {
    expect(maskDocument("12345")).toBe("*****")
  })

  it("handles 6-digit document", () => {
    expect(maskDocument("123456")).toBe("123*56")
  })
})

describe("sanitizeForLog", () => {
  it("redacts sensitive fields", () => {
    const data = {
      cardNumber: "4111111111111111",
      cvv: "123",
      password: "secret",
      token: "abc123",
      apiKey: "key123",
      name: "João",
    }

    const sanitized = sanitizeForLog(data)

    expect(sanitized.cardNumber).toBe("[REDACTED]")
    expect(sanitized.cvv).toBe("[REDACTED]")
    expect(sanitized.password).toBe("[REDACTED]")
    expect(sanitized.token).toBe("[REDACTED]")
    expect(sanitized.apiKey).toBe("[REDACTED]")
    expect(sanitized.name).toBe("João")
  })

  it("masks cpfCnpj fields", () => {
    const data = { cpfCnpj: "12345678901" }

    const sanitized = sanitizeForLog(data)

    expect(sanitized.cpfCnpj).toBe("123******01")
  })

  it("masks cpf_cnpj fields", () => {
    const data = { cpf_cnpj: "12345678901" }

    const sanitized = sanitizeForLog(data)

    expect(sanitized.cpf_cnpj).toBe("123******01")
  })

  it("masks document fields", () => {
    const data = { document: "12345678901" }

    const sanitized = sanitizeForLog(data)

    expect(sanitized.document).toBe("123******01")
  })

  it("handles nested objects recursively", () => {
    const data = {
      customer: {
        name: "João",
        cpfCnpj: "12345678901",
        payment: {
          cardNumber: "4111111111111111",
          cvv: "123",
        },
      },
    }

    const sanitized = sanitizeForLog(data)
    const customer = sanitized.customer as Record<string, unknown>
    const payment = customer.payment as Record<string, unknown>

    expect(customer.name).toBe("João")
    expect(customer.cpfCnpj).toBe("123******01")
    expect(payment.cardNumber).toBe("[REDACTED]")
    expect(payment.cvv).toBe("[REDACTED]")
  })

  it("does not modify the original object", () => {
    const data = { password: "secret", name: "Test" }

    sanitizeForLog(data)

    expect(data.password).toBe("secret")
  })

  it("handles null values in nested objects", () => {
    const data = { name: "Test", details: null }

    const sanitized = sanitizeForLog(data)

    expect(sanitized.details).toBeNull()
  })

  it("redacts all sensitive field name variants", () => {
    const data = {
      card_number: "4111111111111111",
      cvc: "123",
      securityCode: "456",
      security_code: "789",
      secret: "mysecret",
      access_token: "token123",
      api_key: "key456",
    }

    const sanitized = sanitizeForLog(data)

    for (const key of Object.keys(data)) {
      expect(sanitized[key]).toBe("[REDACTED]")
    }
  })
})
