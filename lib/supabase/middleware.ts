import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  console.log("[v0] Middleware - Starting updateSession")

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const currentPath = request.nextUrl.pathname
    console.log("[v0] Middleware - Processing path:", currentPath)

    // Skip middleware for static files and API routes
    if (currentPath.startsWith("/_next") || currentPath.startsWith("/api")) {
      console.log("[v0] Middleware - Skipping static/API path")
      return supabaseResponse
    }

    console.log("[v0] Middleware - Getting user...")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.log("[v0] Middleware - Auth error:", userError.message)
      const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback"]
      const isPublicPath = publicPaths.some((path) => currentPath.startsWith(path))

      if (!isPublicPath) {
        console.log("[v0] Middleware - Redirecting to login due to auth error")
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    if (user) {
      console.log("[v0] Middleware - User authenticated:", user.email)

      if (currentPath.startsWith("/auth/callback")) {
        console.log("[v0] Middleware - Allowing callback page access")
        return supabaseResponse
      }

      const serviceSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // No need to set cookies for service client
            },
          },
        },
      )

      console.log("[v0] Middleware - Getting profile for user ID:", user.id)
      const { data: profile, error: profileError } = await serviceSupabase
        .from("profiles")
        .select("role, email, id")
        .eq("id", user.id)
        .single()

      console.log("[v0] Middleware - Profile data:", profile, "Error:", profileError)

      if (profileError || !profile) {
        console.log("[v0] Middleware - Profile not found for user:", user.id)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/callback"
        return NextResponse.redirect(url)
      }

      const userRole = profile.role || "user"
      console.log("[v0] Middleware - User role:", userRole)

      if (userRole === "admin") {
        // If admin is trying to access user-dashboard, redirect to dashboard
        if (currentPath.startsWith("/user-dashboard")) {
          console.log("[v0] Middleware - Redirecting admin to dashboard")
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }
        if (
          currentPath.startsWith("/auth/") &&
          !currentPath.includes("/verify-email") &&
          !currentPath.includes("/callback")
        ) {
          console.log("[v0] Middleware - Redirecting admin to dashboard")
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }
      } else {
        // If user is trying to access admin dashboard, redirect to user-dashboard
        if (currentPath.startsWith("/dashboard")) {
          console.log("[v0] Middleware - Redirecting user to user-dashboard")
          const url = request.nextUrl.clone()
          url.pathname = "/user-dashboard"
          return NextResponse.redirect(url)
        }
        if (
          currentPath.startsWith("/auth/") &&
          !currentPath.includes("/verify-email") &&
          !currentPath.includes("/callback")
        ) {
          console.log("[v0] Middleware - Redirecting user to user-dashboard")
          const url = request.nextUrl.clone()
          url.pathname = "/user-dashboard"
          return NextResponse.redirect(url)
        }
      }
    } else {
      console.log("[v0] Middleware - User not authenticated")
      const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback"]
      const isPublicPath = publicPaths.some((path) => currentPath.startsWith(path))

      if (!isPublicPath) {
        console.log("[v0] Middleware - Redirecting unauthenticated user to login")
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
    }

    console.log("[v0] Middleware - Returning response")
    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware - Error:", error)
    // In case of any error, allow the request to continue
    return supabaseResponse
  }
}
