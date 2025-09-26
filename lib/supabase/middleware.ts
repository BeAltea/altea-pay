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
      currentPath.includes(".") ||
      currentPath === "/favicon.ico"
    ) {
      console.log("[v0] Pulando middleware para:", currentPath)
      return supabaseResponse
    }

    let user = null
    let userError = null

    try {
      const { data, error } = await supabase.auth.getUser()
      user = data.user
      userError = error

      console.log("[v0] Status do usuário:", {
        hasUser: !!user,
        hasError: !!userError,
        userId: user?.id,
        email: user?.email,
      })
    } catch (error) {
      console.error("[v0] Erro ao obter usuário:", error)
      userError = error
    }

    const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback", "/auth/error"]
    const isPublicPath = publicPaths.includes(currentPath)

    if ((!user || userError) && !isPublicPath) {
      console.log("[v0] Redirecionando usuário não autenticado para login")
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    if (user && !userError) {
      try {
        const serviceSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

        const { data: profile, error: profileError } = await serviceSupabase
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

        let userRole = profile?.role || "user"

        if (profileError && profileError.code === "PGRST116") {
          console.log("[v0] Criando perfil automaticamente para:", user.email)

          const { data: newProfile, error: insertError } = await serviceSupabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
              role: "user",
              full_name: user.user_metadata?.full_name || null,
              company_id: null,
            })
            .select("role, company_id")
            .single()

          if (!insertError && newProfile) {
            userRole = newProfile.role
            console.log("[v0] Perfil criado com sucesso, role:", userRole)
          }
        }

        console.log("[v0] Role determinado:", userRole)

        if (currentPath.startsWith("/super-admin") && userRole !== "super_admin") {
          console.log("[v0] Acesso negado para super-admin")
          const url = request.nextUrl.clone()
          url.pathname = userRole === "admin" ? "/dashboard" : "/user-dashboard"
          return NextResponse.redirect(url)
        }

        if (
          currentPath.startsWith("/dashboard") &&
          !currentPath.startsWith("/user-dashboard") &&
          userRole !== "admin"
        ) {
          console.log("[v0] Acesso negado para dashboard admin")
          const url = request.nextUrl.clone()
          url.pathname = userRole === "super_admin" ? "/super-admin" : "/user-dashboard"
          return NextResponse.redirect(url)
        }

        if (currentPath.startsWith("/user-dashboard") && userRole !== "user") {
          console.log("[v0] Redirecionando da área de usuário")
          const url = request.nextUrl.clone()
          url.pathname = userRole === "super_admin" ? "/super-admin" : "/dashboard"
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar perfil:", error)
      }
    }

    console.log("[v0] Middleware finalizando - permitindo acesso")
    return supabaseResponse
  } catch (error) {
    console.error("[v0] Erro no middleware:", error)
    return supabaseResponse
  }
}
