import { describe, it, expect } from "vitest"
import { randomBytes } from "crypto"
import { encrypt, decrypt } from "../../src/security/encryption"

function generateKey(): string {
  return randomBytes(32).toString("hex")
}

describe("Encryption", () => {
  it("encrypts and decrypts a string round-trip", () => {
    const key = generateKey()
    const plaintext = "Hello, payment data!"

    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)

    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const key = generateKey()
    const plaintext = "Same message"

    const encrypted1 = encrypt(plaintext, key)
    const encrypted2 = encrypt(plaintext, key)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it("handles empty string", () => {
    const key = generateKey()
    const plaintext = ""

    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)

    expect(decrypted).toBe("")
  })

  it("handles unicode characters", () => {
    const key = generateKey()
    const plaintext = "Pagamento de R$ 1.500,00 para João da Silva"

    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)

    expect(decrypted).toBe(plaintext)
  })

  it("handles long strings", () => {
    const key = generateKey()
    const plaintext = "A".repeat(10000)

    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)

    expect(decrypted).toBe(plaintext)
  })

  it("fails to decrypt with a different key", () => {
    const key1 = generateKey()
    const key2 = generateKey()
    const plaintext = "Secret data"

    const encrypted = encrypt(plaintext, key1)

    expect(() => decrypt(encrypted, key2)).toThrow()
  })

  it("fails to decrypt tampered ciphertext", () => {
    const key = generateKey()
    const plaintext = "Integrity check"

    const encrypted = encrypt(plaintext, key)

    // Tamper with a byte in the middle of the base64 string
    const buffer = Buffer.from(encrypted, "base64")
    buffer[buffer.length - 20] ^= 0xff
    const tampered = buffer.toString("base64")

    expect(() => decrypt(tampered, key)).toThrow()
  })

  it("returns base64-encoded output", () => {
    const key = generateKey()
    const encrypted = encrypt("test", key)

    const base64Regex = /^[A-Za-z0-9+/]+=*$/
    expect(encrypted).toMatch(base64Regex)
  })
})
