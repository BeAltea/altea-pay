/**
 * Redis Connection for BullMQ
 *
 * This module provides a singleton Redis connection for BullMQ queues.
 * It supports both local Redis (via Docker) and Upstash Redis for production.
 */

import IORedis, { Redis, RedisOptions } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Singleton connection instance
let connection: Redis | null = null

/**
 * Get or create a Redis connection
 * Uses Upstash in production if configured, otherwise falls back to standard Redis
 */
export function getRedisConnection(): Redis {
  if (connection) {
    return connection
  }

  // Check if we're using Upstash (production)
  if (UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
    console.log("[Redis] Connecting to Upstash Redis")
    connection = new IORedis(UPSTASH_REDIS_URL, {
      password: UPSTASH_REDIS_TOKEN,
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  } else {
    // Local/Docker Redis
    console.log("[Redis] Connecting to local Redis at", REDIS_URL)
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }

  connection.on("connect", () => {
    console.log("[Redis] Connected successfully")
  })

  connection.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message)
  })

  connection.on("close", () => {
    console.log("[Redis] Connection closed")
  })

  return connection
}

/**
 * Close the Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit()
    connection = null
    console.log("[Redis] Connection closed gracefully")
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return connection?.status === "ready"
}

/**
 * Get Redis connection options for BullMQ
 * BullMQ needs separate connections for different purposes
 */
export function getRedisOptions(): RedisOptions {
  if (UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
    return {
      host: new URL(UPSTASH_REDIS_URL).hostname,
      port: parseInt(new URL(UPSTASH_REDIS_URL).port) || 6379,
      password: UPSTASH_REDIS_TOKEN,
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  }

  const url = new URL(REDIS_URL)
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
}
