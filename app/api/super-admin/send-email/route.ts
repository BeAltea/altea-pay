import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBulkEmailViaSendGrid } from "@/lib/notifications/sendgrid"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== SEND EMAIL API ==========")

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Authentication error:", authError?.message)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "super_admin") {
      console.error("[v0] Not a super admin:", profileError?.message)
      return NextResponse.json({ error: "Acesso negado. Apenas super admins podem enviar emails." }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { companyId, recipientEmails, subject, htmlBody } = body

    console.log("[v0] Request:", {
      companyId,
      recipientCount: recipientEmails?.length,
      subject,
      htmlBodyLength: htmlBody?.length,
    })

    // Validate required fields
    if (!companyId) {
      return NextResponse.json({ error: "Empresa é obrigatória" }, { status: 400 })
    }

    if (!recipientEmails || recipientEmails.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um destinatário" }, { status: 400 })
    }

    if (!subject || subject.trim() === "") {
      return NextResponse.json({ error: "Assunto é obrigatório" }, { status: 400 })
    }

    if (!htmlBody || htmlBody.trim() === "") {
      return NextResponse.json({ error: "Corpo do email é obrigatório" }, { status: 400 })
    }

    // Send emails via SendGrid
    console.log("[v0] Sending emails via SendGrid...")
    const result = await sendBulkEmailViaSendGrid({
      recipients: recipientEmails,
      subject,
      html: htmlBody,
    })

    if (!result.success) {
      console.error("[v0] SendGrid error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Log the send operation (optional - table may not exist)
    try {
      const adminClient = createAdminClient()
      await adminClient.from("email_send_logs").insert({
        company_id: companyId,
        sender_id: user.id,
        recipient_count: recipientEmails.length,
        subject,
        sent_at: new Date().toISOString(),
      })
      console.log("[v0] Email send logged successfully")
    } catch (logError) {
      // Table may not exist, that's fine - just log the warning
      console.warn("[v0] Could not log email send (table may not exist):", logError)
    }
    console.log("[v0] ========== END SEND EMAIL API ==========")

    return NextResponse.json({
      success: true,
      message: `Email enviado com sucesso para ${recipientEmails.length} destinatário(s)`,
      recipientCount: recipientEmails.length,
    })
  } catch (error) {
    console.error("[v0] Send email API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno do servidor" },
      { status: 500 },
    )
  }
}
