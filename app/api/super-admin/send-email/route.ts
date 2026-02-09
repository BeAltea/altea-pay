import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateSendGridConfig } from "@/lib/notifications/sendgrid"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

interface RecipientData {
  id: string
  email: string
}

interface SendResult {
  email: string
  success: boolean
  error?: string
}

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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401, headers: noCacheHeaders })
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "super_admin") {
      console.error("[v0] Not a super admin:", profileError?.message)
      return NextResponse.json({ error: "Acesso negado. Apenas super admins podem enviar emails." }, { status: 403, headers: noCacheHeaders })
    }

    // Validate SendGrid configuration
    const configValidation = await validateSendGridConfig()
    if (!configValidation.valid) {
      console.error("[v0] SendGrid config invalid:", configValidation.error)
      return NextResponse.json({ error: configValidation.error }, { status: 500, headers: noCacheHeaders })
    }

    // Parse request body
    const body = await request.json()
    const { companyId, recipients, subject, htmlBody, isTestMode } = body as {
      companyId: string | null
      recipients: RecipientData[]
      subject: string
      htmlBody: string
      isTestMode?: boolean
    }

    console.log("[v0] Request:", {
      companyId,
      recipientCount: recipients?.length,
      subject,
      htmlBodyLength: htmlBody?.length,
      isTestMode: isTestMode || false,
    })

    // Validate required fields - companyId not required in test mode
    if (!isTestMode && !companyId) {
      return NextResponse.json({ error: "Empresa é obrigatória" }, { status: 400, headers: noCacheHeaders })
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um destinatário" }, { status: 400, headers: noCacheHeaders })
    }

    if (!subject || subject.trim() === "") {
      return NextResponse.json({ error: "Assunto é obrigatório" }, { status: 400, headers: noCacheHeaders })
    }

    if (!htmlBody || htmlBody.trim() === "") {
      return NextResponse.json({ error: "Corpo do email é obrigatório" }, { status: 400, headers: noCacheHeaders })
    }

    // Get SendGrid configuration
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_SENDER_EMAIL || "noreply@alteapay.com"
    const fromName = process.env.SENDGRID_FROM_NAME || process.env.SENDGRID_SENDER_NAME || "AlteaPay"
    const replyTo = process.env.SENDGRID_REPLY_TO

    // Strip HTML for plain text version
    const textContent = htmlBody
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()

    const adminClient = createAdminClient()
    const results: SendResult[] = []
    let totalSent = 0
    let totalFailed = 0
    const failedDetails: { email: string; error: string }[] = []

    console.log(`[v0] Sending emails individually ${isTestMode ? "(TEST MODE - no tracking)" : "with tracking"}...`)

    // Send emails individually and track each one (skip tracking in test mode)
    for (const recipient of recipients) {
      try {
        // Build the request body for individual email
        const requestBody: Record<string, unknown> = {
          personalizations: [{ to: [{ email: recipient.email }] }],
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject,
          content: [
            { type: "text/plain", value: textContent },
            { type: "text/html", value: htmlBody },
          ],
        }

        // Add reply_to if configured
        if (replyTo) {
          requestBody.reply_to = { email: replyTo }
        }

        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.errors?.[0]?.message || `Erro HTTP ${response.status}`
          console.error(`[v0] Failed to send to ${recipient.email}:`, errorMessage)

          // Log failed send to tracking table (skip in test mode)
          if (!isTestMode && companyId) {
            try {
              await adminClient.from("email_sent_tracking").insert({
                user_id: recipient.id,
                company_id: companyId,
                email_subject: subject,
                sent_at: new Date().toISOString(),
                sent_by: user.id,
                status: "failed",
                error_message: errorMessage,
              })
            } catch (logError) {
              console.warn("[v0] Could not log failed email send:", logError)
            }
          }

          results.push({ email: recipient.email, success: false, error: errorMessage })
          failedDetails.push({ email: recipient.email, error: errorMessage })
          totalFailed++
        } else {
          console.log(`[v0] Successfully sent to ${recipient.email}`)

          // Log successful send to tracking table (skip in test mode)
          if (!isTestMode && companyId) {
            try {
              await adminClient.from("email_sent_tracking").insert({
                user_id: recipient.id,
                company_id: companyId,
                email_subject: subject,
                sent_at: new Date().toISOString(),
                sent_by: user.id,
                status: "sent",
              })
            } catch (logError) {
              console.warn("[v0] Could not log successful email send:", logError)
            }
          }

          results.push({ email: recipient.email, success: true })
          totalSent++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        console.error(`[v0] Exception sending to ${recipient.email}:`, errorMessage)

        // Log failed send to tracking table (skip in test mode)
        if (!isTestMode && companyId) {
          try {
            await adminClient.from("email_sent_tracking").insert({
              user_id: recipient.id,
              company_id: companyId,
              email_subject: subject,
              sent_at: new Date().toISOString(),
              sent_by: user.id,
              status: "failed",
              error_message: errorMessage,
            })
          } catch (logError) {
            console.warn("[v0] Could not log exception email send:", logError)
          }
        }

        results.push({ email: recipient.email, success: false, error: errorMessage })
        failedDetails.push({ email: recipient.email, error: errorMessage })
        totalFailed++
      }
    }

    console.log(`[v0] Completed: ${totalSent} sent, ${totalFailed} failed`)
    console.log("[v0] ========== END SEND EMAIL API ==========")

    const modeLabel = isTestMode ? " (modo de teste)" : ""
    return NextResponse.json({
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      message: totalFailed === 0
        ? `Email enviado com sucesso para ${totalSent} usuário(s)${modeLabel}`
        : `Email enviado para ${totalSent} usuário(s). Falha ao enviar para ${totalFailed} usuário(s).${modeLabel}`,
      failedDetails: failedDetails.length > 0 ? failedDetails : undefined,
      results,
    }, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[v0] Send email API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno do servidor" },
      { status: 500, headers: noCacheHeaders },
    )
  }
}
