import { createClient } from "@/lib/supabase/server"
import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Esta rota processa os links de confirmação do Supabase (email, reset de senha, etc.)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/"

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete("token_hash")
  redirectTo.searchParams.delete("type")

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Se for recovery (reset de senha), redireciona para a página de reset
      if (type === "recovery") {
        redirectTo.pathname = "/auth/reset-password"
        return NextResponse.redirect(redirectTo)
      }
      
      // Para outros tipos (signup, magiclink, etc.), usa o next padrão
      redirectTo.searchParams.delete("next")
      return NextResponse.redirect(redirectTo)
    }

    // OTP verification failed
  }

  // Em caso de erro, redireciona para a página de erro
  redirectTo.pathname = "/auth/error"
  redirectTo.searchParams.set("message", "Link inválido ou expirado")
  return NextResponse.redirect(redirectTo)
}
