import { describe, it, expect } from "vitest"
import { mapAsaasStatus, mapAsaasEvent } from "../../src/providers/asaas/asaas-status-mapper"

describe("mapAsaasStatus", () => {
  const statusMappings: [string, string][] = [
    ["PENDING", "pending"],
    ["CONFIRMED", "confirmed"],
    ["RECEIVED", "received"],
    ["OVERDUE", "overdue"],
    ["REFUNDED", "refunded"],
    ["DELETED", "deleted"],
    ["REFUND_REQUESTED", "refunded"],
    ["CHARGEBACK_REQUESTED", "refunded"],
    ["CHARGEBACK_DISPUTE", "refunded"],
    ["AWAITING_CHARGEBACK_REVERSAL", "refunded"],
    ["DUNNING_REQUESTED", "overdue"],
    ["DUNNING_RECEIVED", "received"],
    ["AWAITING_RISK_ANALYSIS", "pending"],
  ]

  it.each(statusMappings)("maps %s to %s", (asaasStatus, expected) => {
    expect(mapAsaasStatus(asaasStatus)).toBe(expected)
  })

  it("falls back to 'pending' for unknown statuses", () => {
    expect(mapAsaasStatus("SOME_UNKNOWN_STATUS")).toBe("pending")
  })
})

describe("mapAsaasEvent", () => {
  const eventMappings: [string, string][] = [
    ["PAYMENT_CREATED", "PAYMENT_CREATED"],
    ["PAYMENT_UPDATED", "PAYMENT_CONFIRMED"],
    ["PAYMENT_CONFIRMED", "PAYMENT_CONFIRMED"],
    ["PAYMENT_RECEIVED", "PAYMENT_RECEIVED"],
    ["PAYMENT_OVERDUE", "PAYMENT_OVERDUE"],
    ["PAYMENT_DELETED", "PAYMENT_DELETED"],
    ["PAYMENT_RESTORED", "PAYMENT_CREATED"],
    ["PAYMENT_REFUNDED", "PAYMENT_REFUNDED"],
    ["PAYMENT_RECEIVED_IN_CASH_UNDONE", "PAYMENT_REFUNDED"],
    ["PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_REFUNDED"],
    ["PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_REFUNDED"],
    ["PAYMENT_AWAITING_CHARGEBACK_REVERSAL", "PAYMENT_REFUNDED"],
    ["PAYMENT_DUNNING_RECEIVED", "PAYMENT_RECEIVED"],
    ["PAYMENT_DUNNING_REQUESTED", "PAYMENT_OVERDUE"],
    ["PAYMENT_BANK_SLIP_VIEWED", "PAYMENT_CONFIRMED"],
    ["PAYMENT_CHECKOUT_VIEWED", "PAYMENT_CONFIRMED"],
  ]

  it.each(eventMappings)("maps %s to %s", (asaasEvent, expected) => {
    expect(mapAsaasEvent(asaasEvent)).toBe(expected)
  })

  it("falls back to 'PAYMENT_CREATED' for unknown events", () => {
    expect(mapAsaasEvent("UNKNOWN_EVENT")).toBe("PAYMENT_CREATED")
  })
})
