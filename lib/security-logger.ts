"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { securityEvents, profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

interface LogSecurityEventParams {
  eventType:
    | "login"
    | "logout"
    | "failed_login"
    | "data_access"
    | "data_export"
    | "data_delete"
    | "config_change"
    | "permission_change"
    | "api_call"
    | "integration_call"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "company_created"
    | "company_updated"
    | "company_deleted"
    | "credit_analysis"
    | "report_generated"
  severity?: "low" | "medium" | "high" | "critical"
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
  status?: "success" | "failed" | "blocked" | "pending"
  userId?: string
  companyId?: string
}

export async function logSecurityEvent(params: LogSecurityEventParams) {
  try {
    const headersList = await headers()

    // Get current user from session
    const session = await auth()
    const user = session?.user

    // Get IP and user agent from headers
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Unknown"
    const userAgent = headersList.get("user-agent") || "Unknown"

    // Get user profile for additional info
    let userEmail = user?.email || "system@alteapay.com"
    let companyId = params.companyId

    if (user?.id && !companyId) {
      const [profile] = await db
        .select({ email: profiles.email, companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1)

      if (profile) {
        userEmail = profile.email || userEmail
        companyId = profile.companyId || undefined
      }
    }

    // Insert security event
    await db.insert(securityEvents).values({
      eventType: params.eventType,
      severity: params.severity || "medium",
      userId: params.userId || user?.id,
      ipAddress,
      userAgent,
      action: params.action,
      resource: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      companyId,
      details: { userEmail, status: params.status || "success" },
    })
  } catch (error) {
    console.error("[v0] Failed to log security event:", error instanceof Error ? error.message : error)
  }
}
