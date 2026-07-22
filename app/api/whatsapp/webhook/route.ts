import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { whatsappInboundQueue } from "@/lib/queue"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * WhatsApp Cloud API Webhook (roadmap-v1 WS-4)
 *
 * Receives the verification handshake (GET) and inbound messages (POST) from
 * the official Meta WhatsApp Cloud API (Graph API).
 *
 * Configuration in the Meta App Dashboard (WhatsApp > Configuration):
 *   - Callback URL: https://your-domain.com/api/whatsapp/webhook
 *   - Verify Token: same value as WHATSAPP_WEBHOOK_VERIFY_TOKEN
 *   - App Secret:   WHATSAPP_APP_SECRET (used to validate x-hub-signature-256)
 *
 * Inbound messages are enqueued (one job per message) to the
 * `alteapay-whatsapp-inbound` BullMQ queue per Contrato B.
 * WS-5 will add the consumer worker that forwards jobs to the negotiation agent.
 */

export const dynamic = "force-dynamic"

/**
 * Resolve company_id SERVER-SIDE from the business phone_number_id that received
 * the message. The company_id is NEVER trusted from the webhook payload body.
 *
 * WS-5: consulta a tabela `whatsapp_phone_mapping` (via service-role, bypassa RLS)
 * pelo phone_number_id ativo. Multi-tenant: cada empresa tem seu número/WABA.
 * Fallback (single-number) por env mantido para bootstrap: se o phone_number_id
 * casar com WHATSAPP_PHONE_NUMBER_ID, usa WHATSAPP_DEFAULT_COMPANY_ID.
 */
async function resolveCompanyIdFromPhoneNumberId(phoneNumberId: string | undefined): Promise<string> {
  if (!phoneNumberId) return ""

  // 1) Tabela de mapeamento (fonte autoritativa, multi-tenant).
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("whatsapp_phone_mapping")
      .select("company_id")
      .eq("phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      console.error("[WhatsApp Webhook] Erro ao consultar whatsapp_phone_mapping:", error.message)
    } else if (data?.company_id) {
      return data.company_id as string
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Falha no mapeamento phone_number_id->company_id:", (err as Error).message)
  }

  // 2) Fallback single-number por env (bootstrap).
  const configuredPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (configuredPhoneNumberId && phoneNumberId === configuredPhoneNumberId) {
    return process.env.WHATSAPP_DEFAULT_COMPANY_ID ?? ""
  }

  console.warn(
    "[WhatsApp Webhook] company_id não resolvido para phone_number_id:",
    phoneNumberId,
    "(sem linha em whatsapp_phone_mapping e sem fallback por env)"
  )
  return ""
}

/**
 * GET — Verification handshake.
 * Meta calls this once with hub.mode=subscribe and the verify token.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const verifyToken = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification handshake OK")
    return new Response(challenge ?? "", { status: 200 })
  }

  console.error("[WhatsApp Webhook] Verification handshake FAILED (mode/token mismatch)")
  return new Response("Forbidden", { status: 403 })
}

/**
 * Validate the x-hub-signature-256 header against the raw request body.
 * Signature is `sha256=<hex>` = HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET).
 */
function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    console.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET não configurado — rejeitando")
    return false
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    console.error("[WhatsApp Webhook] Header x-hub-signature-256 ausente ou malformado")
    return false
  }

  const provided = signatureHeader.slice("sha256=".length)
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")

  const providedBuf = Buffer.from(provided, "hex")
  const expectedBuf = Buffer.from(expected, "hex")

  // Guard against length mismatch before timingSafeEqual (which throws otherwise)
  if (providedBuf.length !== expectedBuf.length) {
    console.error("[WhatsApp Webhook] Assinatura inválida (length mismatch)")
    return false
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

/**
 * POST — Inbound messages.
 * The raw body MUST be read before parsing, because the HMAC signature is
 * computed over the raw bytes.
 */
export async function POST(request: NextRequest) {
  // 1. Read RAW body first (signature is computed over raw bytes)
  const raw = await request.text()
  const signature = request.headers.get("x-hub-signature-256")

  // 2. Validate signature
  if (!isValidSignature(raw, signature)) {
    console.error("[WhatsApp Webhook] Assinatura inválida — rejeitando (401)")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 3. Parse JSON
  let body: any
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch (err) {
    console.error("[WhatsApp Webhook] Falha ao parsear JSON:", (err as Error).message)
    // Return 200 so Meta does not retry-storm on a malformed payload we cannot use
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // 4. Extract inbound messages and enqueue one job per message (Contrato B)
  try {
    const entries: any[] = Array.isArray(body?.entry) ? body.entry : []

    for (const entry of entries) {
      const changes: any[] = Array.isArray(entry?.changes) ? entry.changes : []

      for (const change of changes) {
        const value = change?.value ?? {}
        const messages: any[] = Array.isArray(value?.messages) ? value.messages : []
        if (messages.length === 0) continue

        // Derive company_id SERVER-SIDE from the receiving business number
        const phoneNumberId: string | undefined = value?.metadata?.phone_number_id
        const companyId = await resolveCompanyIdFromPhoneNumberId(phoneNumberId)

        for (const message of messages) {
          const from = (message?.from || "").replace(/\D/g, "") // E.164 without +
          const text =
            message?.type === "text" && message?.text?.body ? message.text.body : ""

          const receivedAt = message?.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString()

          const jobData = {
            wa_message_id: message?.id ?? "",
            from,
            text,
            company_id: companyId,
            received_at: receivedAt,
            thread_id: `${companyId}:${from}`,
          }

          await whatsappInboundQueue.add(`wa-inbound-${jobData.wa_message_id || Date.now()}`, jobData)
        }
      }
    }
  } catch (err) {
    // On enqueue error still return 200 so Meta does not retry-storm — but log it.
    console.error("[WhatsApp Webhook] Erro ao enfileirar mensagem inbound:", (err as Error).message)
  }

  // 5. Always 200 quickly so Meta marks the webhook delivered
  return NextResponse.json({ received: true }, { status: 200 })
}
