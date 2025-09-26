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
    console.log("[v0] Processando caminho:", currentPath)

    if (
      currentPath.startsWith("/_next") ||
      currentPath.startsWith("/api") ||
      currentPath.startsWith("/_vercel") ||
      currentPath.includes(".")
    ) {
      console.log("[v0] Pulando middleware para:", currentPath)
      return supabaseResponse
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] Status do usuário:", { hasUser: !!user, hasError: !!userError })

    const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback", "/auth/error"]
    const isPublicPath = publicPaths.includes(currentPath)

    if ((userError || !user) && !isPublicPath) {
      console.log("[v0] Redirecionando usuário não autenticado para login")
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    if (user && !userError) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single()

        console.log("[v0] Usuário autenticado:", user.email)
        console.log("[v0] Perfil:", {
          hasProfile: !!profile,
          role: profile?.role,
          companyId: profile?.company_id,
          hasError: !!profileError,
        })

        const userRole = profile?.role || "user"
        console.log("[v0] Role determinado:", userRole)

        // Proteção de rotas super admin
        if (currentPath.startsWith("/super-admin")) {
          if (userRole !== "super_admin") {
            console.log("[v0] Usuário sem permissão para área super admin")
            const url = request.nextUrl.clone()
            if (userRole === "admin") {
              url.pathname = "/dashboard"
            } else if (userRole === "user") {
              url.pathname = "/user-dashboard"
            } else {
              url.pathname = "/auth/login"
            }
            return NextResponse.redirect(url)
          }
        }

        // Proteção de rotas administrativas (company admin)
        if (currentPath.startsWith("/dashboard") && !currentPath.startsWith("/user-dashboard")) {
          if (userRole !== "admin") {
            console.log("[v0] Usuário sem permissão para área admin")
            const url = request.nextUrl.clone()
            if (userRole === "super_admin") {
              url.pathname = "/super-admin"
            } else if (userRole === "user") {
              url.pathname = "/user-dashboard"
            } else {
              url.pathname = "/auth/login"
            }
            return NextResponse.redirect(url)
          }
        }

        // Proteção de rotas de usuário comum
        if (currentPath.startsWith("/user-dashboard")) {
          if (userRole !== "user") {
            console.log("[v0] Usuário redirecionado da área de usuário")
            const url = request.nextUrl.clone()
            if (userRole === "super_admin") {
              url.pathname = "/super-admin"
            } else if (userRole === "admin") {
              url.pathname = "/dashboard"
            } else {
              url.pathname = "/auth/login"
            }
            return NextResponse.redirect(url)
          }
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar perfil:", error)
        try {
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            role: "user",
            full_name: user.user_metadata?.full_name || null,
            company_id: null, // Will be assigned later by super admin
          })
          console.log("[v0] Perfil básico criado para usuário")
        } catch (insertError) {
          console.error("[v0] Erro ao criar perfil básico:", insertError)
        }
      }
    }

    console.log("[v0] Middleware finalizando - permitindo acesso")
    return supabaseResponse
  } catch (error) {
    console.error("[v0] Erro no middleware:", error)
    return supabaseResponse
  }
}
