import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decode } from "next-auth/jwt"

async function getSessionFromToken(request: NextRequest) {
  const sessionToken = request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value

  if (!sessionToken) {
    return null
  }

  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error("[Middleware] No AUTH_SECRET configured")
      return null
    }

    const decoded = await decode({
      token: sessionToken,
      secret,
      salt: request.cookies.get("__Secure-authjs.session-token")?.value
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    })

    return decoded
  } catch (error) {
    console.error("[Middleware] JWT decode failed:", error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname

  // Skip API routes
  if (currentPath.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Skip static files
  if (
    currentPath.startsWith("/_next") ||
    currentPath.startsWith("/_vercel") ||
    currentPath.includes(".") ||
    currentPath === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/verify-email",
    "/auth/callback",
    "/auth/error",
    "/auth/reset-password",
    "/auth/forgot-password",
    "/auth/register-success",
  ]
  const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith("/auth/")

  const session = await getSessionFromToken(request)
  const user = session as { id?: string; role?: string; companyId?: string } | null
  const userRole = user?.role ?? "user"

  // Not authenticated
  if (!user || !user.id) {
    if (isPublicPath) {
      return NextResponse.next()
    }
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Authenticated user on login page → redirect based on role
  if (currentPath === "/auth/login" || currentPath === "/") {
    const url = request.nextUrl.clone()
    url.pathname =
      userRole === "super_admin"
        ? "/super-admin"
        : userRole === "admin"
          ? "/dashboard"
          : "/user-dashboard"
    return NextResponse.redirect(url)
  }

  // Role-based access control
  if (currentPath.startsWith("/super-admin") && userRole !== "super_admin") {
    const url = request.nextUrl.clone()
    url.pathname = userRole === "admin" ? "/dashboard" : "/user-dashboard"
    return NextResponse.redirect(url)
  }

  if (
    currentPath.startsWith("/dashboard") &&
    !currentPath.startsWith("/user-dashboard") &&
    userRole !== "admin" &&
    userRole !== "super_admin"
  ) {
    const url = request.nextUrl.clone()
    url.pathname =
      userRole === "super_admin" ? "/super-admin" : "/user-dashboard"
    return NextResponse.redirect(url)
  }

  if (currentPath.startsWith("/user-dashboard") && userRole !== "user") {
    const url = request.nextUrl.clone()
    url.pathname =
      userRole === "super_admin" ? "/super-admin" : "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
