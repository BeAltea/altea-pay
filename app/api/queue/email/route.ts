/**
 * Email Queue API Route
 *
 * POST /api/queue/email - Add email job to queue
 *
 * This is the ONLY way to send emails in AlteaPay.
 * ALL email sending MUST go through this queue.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueEmail, queueEmailBulk, type EmailJobData } from "@/lib/queue"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Check if it's a bulk request
    if (Array.isArray(body.emails)) {
      // Bulk email
      const emails: EmailJobData[] = body.emails.map((email: any) => ({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: email.replyTo,
        from: email.from,
        fromName: email.fromName,
        metadata: {
          ...email.metadata,
          userId: user.id,
        },
      }))

      const jobs = await queueEmailBulk(emails, body.priority)

      return NextResponse.json({
        success: true,
        message: `${jobs.length} emails adicionados à fila`,
        count: jobs.length,
        jobIds: jobs.map(j => j.id),
      })
    }

    // Single email
    const emailData: EmailJobData = {
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      replyTo: body.replyTo,
      from: body.from,
      fromName: body.fromName,
      metadata: {
        ...body.metadata,
        userId: user.id,
      },
    }

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: to, subject, html" },
        { status: 400 }
      )
    }

    const job = await queueEmail(emailData, body.priority)

    return NextResponse.json({
      success: true,
      message: "Email adicionado à fila",
      jobId: job.id,
    })
  } catch (error: any) {
    console.error("[API] /api/queue/email error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    )
  }
}
