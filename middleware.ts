import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname

  if (currentPath.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Páginas legais públicas: sem auth, sem redirect (exigência Meta/ANPD)
  if (currentPath === "/politica-de-privacidade" || currentPath === "/termos-de-uso") {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
