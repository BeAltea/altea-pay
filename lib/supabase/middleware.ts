import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const currentPath = request.nextUrl.pathname

  if (
    currentPath.startsWith("/_next") ||
    currentPath.startsWith("/api/") ||
    currentPath.startsWith("/_vercel") ||
    currentPath.includes(".") ||
    currentPath === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

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

    const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/callback", "/auth/error", "/auth/reset-password", "/auth/forgot-password", "/auth/confirm"]
    const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith("/auth/")

    let user = null
    let userError = null

    try {
      const { data, error } = await supabase.auth.getUser()
      user = data.user
      userError = error
    } catch (error) {
      if (isPublicPath) {
        return supabaseResponse
      }
      userError = error
    }

    if ((!user || userError) && isPublicPath) {
      return supabaseResponse
    }

    if ((!user || userError) && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
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

        let userRole = profile?.role || "user"

        if (profileError && profileError.code === "PGRST116") {
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
          }
        }

        if (currentPath === "/" && user) {
          const url = request.nextUrl.clone()
          url.pathname =
            userRole === "super_admin" ? "/super-admin" : userRole === "admin" ? "/dashboard" : "/user-dashboard"
          return NextResponse.redirect(url)
        }

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
          url.pathname = userRole === "super_admin" ? "/super-admin" : "/user-dashboard"
          return NextResponse.redirect(url)
        }

        if (currentPath.startsWith("/user-dashboard") && userRole !== "user") {
          const url = request.nextUrl.clone()
          url.pathname = userRole === "super_admin" ? "/super-admin" : "/dashboard"
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar perfil:", error)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Erro no middleware:", error)
    return supabaseResponse
  }
}
