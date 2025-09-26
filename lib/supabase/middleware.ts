import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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

    // Skip middleware for static files and API routes
    if (currentPath.startsWith("/_next") || currentPath.startsWith("/api") || currentPath.startsWith("/_vercel")) {
      return supabaseResponse
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback"]
      const isPublicPath = publicPaths.some((path) => currentPath.startsWith(path))

      if (!isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    if (user) {
      // Permitir callback processar
      if (currentPath.startsWith("/auth/callback")) {
        return supabaseResponse
      }

      try {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        if (!profile) {
          // Se não encontrar perfil, redireciona para callback
          const url = request.nextUrl.clone()
          url.pathname = "/auth/callback"
          return NextResponse.redirect(url)
        }

        const userRole = profile.role || "user"

        if (currentPath === "/") {
          const url = request.nextUrl.clone()
          url.pathname = userRole === "admin" ? "/dashboard" : "/user-dashboard"
          return NextResponse.redirect(url)
        }

        if (userRole === "admin") {
          if (currentPath.startsWith("/user-dashboard")) {
            const url = request.nextUrl.clone()
            url.pathname = "/dashboard"
            return NextResponse.redirect(url)
          }
          if (currentPath.startsWith("/auth/") && !currentPath.includes("/callback")) {
            const url = request.nextUrl.clone()
            url.pathname = "/dashboard"
            return NextResponse.redirect(url)
          }
        } else {
          if (currentPath.startsWith("/dashboard")) {
            const url = request.nextUrl.clone()
            url.pathname = "/user-dashboard"
            return NextResponse.redirect(url)
          }
          if (currentPath.startsWith("/auth/") && !currentPath.includes("/callback")) {
            const url = request.nextUrl.clone()
            url.pathname = "/user-dashboard"
            return NextResponse.redirect(url)
          }
        }
      } catch (error) {
        console.error("Error fetching profile in middleware:", error)
        // Em caso de erro, redireciona para callback
        const url = request.nextUrl.clone()
        url.pathname = "/auth/callback"
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error("Middleware error:", error)
    return supabaseResponse
  }
}
