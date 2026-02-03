import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { RateLimiter } from "../../src/security/rate-limiter"

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(3, 60_000)

    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(true)
  })

  it("blocks requests at the limit", () => {
    const limiter = new RateLimiter(2, 60_000)

    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(false)
  })

  it("tracks keys independently", () => {
    const limiter = new RateLimiter(1, 60_000)

    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(false)
    expect(limiter.isAllowed("company_2")).toBe(true)
  })

  it("allows requests after window expires", () => {
    const limiter = new RateLimiter(1, 1_000)

    expect(limiter.isAllowed("company_1")).toBe(true)
    expect(limiter.isAllowed("company_1")).toBe(false)

    vi.advanceTimersByTime(1_001)

    expect(limiter.isAllowed("company_1")).toBe(true)
  })

  it("uses sliding window (old timestamps drop off)", () => {
    const limiter = new RateLimiter(2, 1_000)

    expect(limiter.isAllowed("key")).toBe(true) // t=0
    vi.advanceTimersByTime(600)

    expect(limiter.isAllowed("key")).toBe(true) // t=600
    expect(limiter.isAllowed("key")).toBe(false) // at limit

    vi.advanceTimersByTime(500) // t=1100 — first request drops off

    expect(limiter.isAllowed("key")).toBe(true) // allowed again
  })

  describe("remaining", () => {
    it("returns max for unknown key", () => {
      const limiter = new RateLimiter(5, 60_000)

      expect(limiter.remaining("unknown")).toBe(5)
    })

    it("returns correct remaining count", () => {
      const limiter = new RateLimiter(5, 60_000)

      limiter.isAllowed("key")
      limiter.isAllowed("key")

      expect(limiter.remaining("key")).toBe(3)
    })

    it("returns 0 when fully consumed", () => {
      const limiter = new RateLimiter(2, 60_000)

      limiter.isAllowed("key")
      limiter.isAllowed("key")

      expect(limiter.remaining("key")).toBe(0)
    })

    it("recovers after window expires", () => {
      const limiter = new RateLimiter(2, 1_000)

      limiter.isAllowed("key")
      limiter.isAllowed("key")
      expect(limiter.remaining("key")).toBe(0)

      vi.advanceTimersByTime(1_001)

      expect(limiter.remaining("key")).toBe(2)
    })
  })

  describe("reset", () => {
    it("clears rate limit for a key", () => {
      const limiter = new RateLimiter(1, 60_000)

      limiter.isAllowed("key")
      expect(limiter.isAllowed("key")).toBe(false)

      limiter.reset("key")

      expect(limiter.isAllowed("key")).toBe(true)
    })

    it("does not affect other keys", () => {
      const limiter = new RateLimiter(1, 60_000)

      limiter.isAllowed("key1")
      limiter.isAllowed("key2")

      limiter.reset("key1")

      expect(limiter.isAllowed("key1")).toBe(true)
      expect(limiter.isAllowed("key2")).toBe(false)
    })

    it("is safe to call on unknown key", () => {
      const limiter = new RateLimiter(5, 60_000)

      expect(() => limiter.reset("nonexistent")).not.toThrow()
    })
  })

  it("uses default values (100 requests, 60s window)", () => {
    const limiter = new RateLimiter()

    for (let i = 0; i < 100; i++) {
      expect(limiter.isAllowed("key")).toBe(true)
    }
    expect(limiter.isAllowed("key")).toBe(false)
  })
})
