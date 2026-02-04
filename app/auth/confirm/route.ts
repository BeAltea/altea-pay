import { db } from "@/lib/db"
import { eq, and, gt } from "drizzle-orm"
import { users, verificationTokens } from "@/lib/db/schema"
import { type NextRequest, NextResponse } from "next/server"

// This route processes email verification links
// With NextAuth, we use verification tokens instead of Supabase OTP
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete("token")
  redirectTo.searchParams.delete("type")

  if (token && type) {
    try {
      // For password recovery, redirect to reset password page
      if (type === "recovery") {
        // Verify the token exists and is not expired
        const [resetToken] = await db
          .select()
          .from(verificationTokens)
          .where(
            and(
              eq(verificationTokens.token, token),
              gt(verificationTokens.expires, new Date())
            )
          )
          .limit(1)

        if (resetToken) {
          redirectTo.pathname = "/auth/reset-password"
          redirectTo.searchParams.set("token", token)
          return NextResponse.redirect(redirectTo)
        }
      }

      // For email verification (signup)
      if (type === "signup" || type === "email") {
        // Find and validate the verification token
        const [verificationToken] = await db
          .select()
          .from(verificationTokens)
          .where(
            and(
              eq(verificationTokens.token, token),
              gt(verificationTokens.expires, new Date())
            )
          )
          .limit(1)

        if (verificationToken) {
          // Mark user email as verified
          await db
            .update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.email, verificationToken.identifier))

          // Delete the used token
          await db
            .delete(verificationTokens)
            .where(
              and(
                eq(verificationTokens.identifier, verificationToken.identifier),
                eq(verificationTokens.token, token)
              )
            )

          // Redirect to success page or login
          redirectTo.pathname = "/auth/login"
          redirectTo.searchParams.set("message", "Email verificado com sucesso")
          return NextResponse.redirect(redirectTo)
        }
      }
    } catch (error) {
      console.error("[v0] Error verifying token:", error)
    }
  }

  // In case of error, redirect to error page
  redirectTo.pathname = "/auth/error"
  redirectTo.searchParams.set("message", "Link invalido ou expirado")
  return NextResponse.redirect(redirectTo)
}
