import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("portal_token")?.value

    if (token) {
      const supabase = createServiceClient()

      // Delete session
      await supabase
        .from("final_client_sessions")
        .delete()
        .eq("token", token)
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    })

    response.cookies.set("portal_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("[PORTAL-LOGOUT] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
