import { type NextRequest, NextResponse } from "next/server"

// With NextAuth (credentials-based), this route simply redirects
// No Supabase token verification needed
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const type = searchParams.get("type")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  // Se tiver token de recovery, redireciona para processar
  if (token && type === "recovery") {
    const redirectUrl = new URL("/auth/reset-password", baseUrl)
    redirectUrl.searchParams.set("token", token)
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback - redireciona para página de reset com os parâmetros
  if (type === "recovery") {
    const redirectUrl = new URL("/auth/reset-password", baseUrl)
    // Copia todos os parâmetros da URL
    searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(redirectUrl)
  }

  // Para outros tipos ou sem parâmetros, vai para login
  return NextResponse.redirect(new URL("/auth/login", baseUrl))
}
