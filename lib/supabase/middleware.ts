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

    if (currentPath.startsWith("/_next") || currentPath.startsWith("/api") || currentPath.startsWith("/_vercel")) {
      console.log("[v0] Pulando middleware para:", currentPath)
      return supabaseResponse
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] Status do usuário:", { hasUser: !!user, hasError: !!userError })

    // Se não há usuário autenticado
    if (userError || !user) {
      const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback"]
      const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith("/auth/")

      if (!isPublicPath) {
        console.log("[v0] Redirecionando usuário não autenticado para login")
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }

      console.log("[v0] Permitindo acesso a rota pública:", currentPath)
      return supabaseResponse
    }

    // Se há usuário autenticado
    console.log("[v0] Usuário autenticado:", user.email)

    if (currentPath === "/auth/callback") {
      console.log("[v0] Permitindo callback processar")
      return supabaseResponse
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      console.log("[v0] Perfil:", { hasProfile: !!profile, role: profile?.role, hasError: !!profileError })

      // Se não tem perfil, criar um básico
      if (!profile && !profileError) {
        console.log("[v0] Criando perfil básico para usuário")
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          role: "user",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
        })

        // Redirecionar para user-dashboard após criar perfil
        if (currentPath === "/") {
          const url = request.nextUrl.clone()
          url.pathname = "/user-dashboard"
          console.log("[v0] Redirecionando novo usuário para dashboard")
          return NextResponse.redirect(url)
        }
      }

      const userRole = profile?.role || "user"
      console.log("[v0] Role determinado:", userRole)

      if (currentPath === "/") {
        const targetPath = userRole === "admin" ? "/dashboard" : "/user-dashboard"
        console.log("[v0] Redirecionando da página inicial para:", targetPath)
        const url = request.nextUrl.clone()
        url.pathname = targetPath
        return NextResponse.redirect(url)
      }

      if (currentPath.startsWith("/auth/") && currentPath !== "/auth/callback") {
        const targetPath = userRole === "admin" ? "/dashboard" : "/user-dashboard"
        console.log("[v0] Redirecionando de auth para:", targetPath)
        const url = request.nextUrl.clone()
        url.pathname = targetPath
        return NextResponse.redirect(url)
      }

      if (userRole === "admin" && currentPath.startsWith("/user-dashboard")) {
        console.log("[v0] Admin redirecionado para dashboard admin")
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }

      if (userRole === "user" && currentPath.startsWith("/dashboard") && !currentPath.startsWith("/user-dashboard")) {
        console.log("[v0] Usuário redirecionado para dashboard de usuário")
        const url = request.nextUrl.clone()
        url.pathname = "/user-dashboard"
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error("[v0] Erro ao buscar/criar perfil:", error)
      // Em caso de erro, redirecionar para callback para tentar novamente
      const url = request.nextUrl.clone()
      url.pathname = "/auth/callback"
      return NextResponse.redirect(url)
    }

    console.log("[v0] Middleware finalizando - permitindo acesso")
    return supabaseResponse
  } catch (error) {
    console.error("[v0] Erro geral no middleware:", error)
    return supabaseResponse
  }
}
