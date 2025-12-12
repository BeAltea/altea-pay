import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, profileData } = await request.json()

    console.log("[v0] 💾 API save-profile: Salvando perfil do usuário", userId)
    console.log("[v0] 📋 Dados do perfil:", profileData)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: profileData.email,
          full_name: profileData.full_name,
          company_id: profileData.company_id,
          company_name: profileData.company_name,
          role: profileData.role,
          phone: profileData.phone,
          cpf_cnpj: profileData.cpf_cnpj,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] ❌ Erro ao salvar perfil:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] ✅ Perfil salvo com sucesso:", data)

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error("[v0] ❌ Erro na API save-profile:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 })
  }
}
