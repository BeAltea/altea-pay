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

    console.log("[v0] Middleware executando para:", currentPath)

    // Skip middleware for static files and API routes
    if (currentPath.startsWith("/_next") || currentPath.startsWith("/api") || currentPath.startsWith("/_vercel")) {
      return supabaseResponse
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] Usuário encontrado:", !!user, "Erro:", !!userError)

    if (userError || !user) {
      const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback"]
      const isPublicPath = publicPaths.some((path) => currentPath.startsWith(path))

      if (!isPublicPath) {
        console.log("[v0] Redirecionando para login - rota protegida")
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    if (user) {
      console.log("[v0] Usuário autenticado:", user.email)

      // Permitir callback processar
      if (currentPath.startsWith("/auth/callback")) {
        console.log("[v0] Permitindo callback processar")
        return supabaseResponse
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        console.log("[v0] Perfil encontrado:", !!profile, "Role:", profile?.role, "Erro:", !!profileError)

        if (!profile) {
          console.log("[v0] Perfil não encontrado, redirecionando para callback")
          const url = request.nextUrl.clone()
          url.pathname = "/auth/callback"
          return NextResponse.redirect(url)
        }

        const userRole = profile.role || "user"
        console.log("[v0] Role do usuário:", userRole, "Caminho atual:", currentPath)

        if (currentPath === "/") {
          const targetPath = userRole === "admin" ? "/dashboard" : "/user-dashboard"
          console.log("[v0] Redirecionando da página inicial para:", targetPath)
          const url = request.nextUrl.clone()
          url.pathname = targetPath
          return NextResponse.redirect(url)
        }

        if (userRole === "admin") {
          if (currentPath.startsWith("/user-dashboard")) {
            console.log("[v0] Admin redirecionado do user-dashboard para dashboard")
            const url = request.nextUrl.clone()
            url.pathname = "/dashboard"
            return NextResponse.redirect(url)
          }
          if (currentPath.startsWith("/auth/") && !currentPath.includes("/callback")) {
            console.log("[v0] Admin redirecionado de auth para dashboard")
            const url = request.nextUrl.clone()
            url.pathname = "/dashboard"
            return NextResponse.redirect(url)
          }
        } else {
          if (currentPath.startsWith("/dashboard")) {
            console.log("[v0] Usuário redirecionado do dashboard para user-dashboard")
            const url = request.nextUrl.clone()
            url.pathname = "/user-dashboard"
            return NextResponse.redirect(url)
          }
          if (currentPath.startsWith("/auth/") && !currentPath.includes("/callback")) {
            console.log("[v0] Usuário redirecionado de auth para user-dashboard")
            const url = request.nextUrl.clone()
            url.pathname = "/user-dashboard"
            return NextResponse.redirect(url)
          }
        }
      } catch (error) {
        console.error("[v0] Erro ao buscar perfil no middleware:", error)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/callback"
        return NextResponse.redirect(url)
      }
    }

    console.log("[v0] Middleware finalizando sem redirecionamento")
    return supabaseResponse
  } catch (error) {
    console.error("[v0] Erro no middleware:", error)
    return supabaseResponse
  }
}
