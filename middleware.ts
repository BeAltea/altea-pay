import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname

  if (currentPath.startsWith("/api/")) {
    console.log("[v0] Pulando middleware completamente para rota de API:", currentPath)
    return NextResponse.next()
  }

  console.log("[v0] Middleware chamado para:", currentPath)
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
