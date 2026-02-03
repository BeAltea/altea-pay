/**
 * Sliding window rate limiter per company_id.
 * Uses an in-memory store. For distributed deployments, swap to Redis-based.
 */

interface WindowEntry {
  timestamps: number[]
}

export class RateLimiter {
  private windows = new Map<string, WindowEntry>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests = 100, windowMs = 60_000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  /**
   * Check if a request is allowed for the given key (e.g., company_id).
   * Returns true if allowed, false if rate limited.
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    let entry = this.windows.get(key)

    if (!entry) {
      entry = { timestamps: [] }
      this.windows.set(key, entry)
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs)

    if (entry.timestamps.length >= this.maxRequests) {
      return false
    }

    entry.timestamps.push(now)
    return true
  }

  /**
   * Get remaining requests for the given key.
   */
  remaining(key: string): number {
    const now = Date.now()
    const entry = this.windows.get(key)
    if (!entry) return this.maxRequests

    const validTimestamps = entry.timestamps.filter((t) => now - t < this.windowMs)
    return Math.max(0, this.maxRequests - validTimestamps.length)
  }

  /**
   * Reset the rate limiter for a given key.
   */
  reset(key: string): void {
    this.windows.delete(key)
  }
}
