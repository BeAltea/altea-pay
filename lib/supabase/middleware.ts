// DEPRECATED: Middleware auth is now handled by NextAuth in middleware.ts (root).

import { NextResponse, type NextRequest } from "next/server"

/** @deprecated Auth middleware is now handled by NextAuth in the root middleware.ts */
export async function updateSession(request: NextRequest) {
  return NextResponse.next()
}
