import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"

export default auth(async (request) => {
  const currentPath = request.nextUrl.pathname

  if (currentPath.startsWith("/api/")) {
    return NextResponse.next()
  }

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
  const isPublicPath =
    publicPaths.includes(currentPath) || currentPath.startsWith("/auth/")

  const session = request.auth
  const user = session?.user
  const userRole = user?.role ?? "user"

  // Not authenticated
  if (!user) {
    if (isPublicPath) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Authenticated user on root → redirect based on role
  if (currentPath === "/") {
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
    userRole !== "admin"
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
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
