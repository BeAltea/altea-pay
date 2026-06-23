/**
 * Official Meta WhatsApp Cloud API client (Graph API) — roadmap-v1 WS-4
 *
 * This is the OFFICIAL Meta WhatsApp Cloud API client, talking directly to the
 * Graph API (graph.facebook.com). It is NOT 360dialog and NOT Twilio.
 *
 * Twilio (`lib/notifications/sms.tsx`) stays as-is for now and remains the
 * existing SMS/WhatsApp path. This client is the new outbound channel for the
 * negotiation agent flow.
 *
 * Config is read from env at CALL TIME (not at module load), so Netlify
 * functions / workers can pick up env without import-order surprises:
 *   - WHATSAPP_API_VERSION       (default "v21.0")
 *   - WHATSAPP_PHONE_NUMBER_ID   (required)
 *   - WHATSAPP_ACCESS_TOKEN      (required)
 *
 * Errors are NEVER silent: on non-2xx we log the HTTP status AND the parsed
 * Graph API error body, then throw an Error with a clear message.
 */

const GRAPH_BASE_URL = "https://graph.facebook.com"

interface WhatsAppConfig {
  apiVersion: string
  phoneNumberId: string
  accessToken: string
}

/**
 * Read WhatsApp Cloud API config from env at call time.
 * Throws a clear error if a required variable is missing.
 */
function getConfig(): WhatsAppConfig {
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0"
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId) {
    throw new Error(
      "[WhatsApp Cloud] WHATSAPP_PHONE_NUMBER_ID não configurado (env obrigatória)"
    )
  }
  if (!accessToken) {
    throw new Error(
      "[WhatsApp Cloud] WHATSAPP_ACCESS_TOKEN não configurado (env obrigatória)"
    )
  }

  return { apiVersion, phoneNumberId, accessToken }
}

/**
 * Normalize a phone number to E.164 WITHOUT the leading `+` (digits only).
 * Brazilian numbers keep their country code (55). The Graph API expects the
 * recipient as digits only, e.g. "5511999999999".
 */
export function normalizeE164(to: string): string {
  const digits = (to || "").replace(/\D/g, "")
  if (!digits) {
    throw new Error(`[WhatsApp Cloud] Número de telefone inválido: "${to}"`)
  }
  return digits
}

/**
 * Inspect a Graph API error payload and produce a clear, actionable message.
 * Detects well-known Cloud API error codes.
 */
function describeGraphError(status: number, errorBody: any): string {
  const err = errorBody?.error ?? {}
  const code: number | undefined = err.code
  const subcode: number | undefined = err.error_subcode
  const detail: string = err.message || errorBody?.message || "erro desconhecido"

  // Access token expired / invalid
  if (code === 190) {
    return `[WhatsApp Cloud] Token de acesso expirado ou inválido (code 190): ${detail}`
  }

  // Template not approved / not found (templating errors live in the 132xxx range)
  if (typeof code === "number" && code >= 132000 && code < 133000) {
    return `[WhatsApp Cloud] Template não aprovado ou não encontrado (code ${code}): ${detail}`
  }

  // Outside the 24h customer service window
  if (code === 131047 || code === 131026) {
    return `[WhatsApp Cloud] Fora da janela de atendimento de 24h — use um template aprovado (code ${code}): ${detail}`
  }

  // Rate limit
  if (code === 130429 || code === 80007) {
    return `[WhatsApp Cloud] Limite de taxa atingido (rate limit, code ${code}): ${detail}`
  }

  const codePart = code !== undefined ? ` code=${code}` : ""
  const subPart = subcode !== undefined ? ` subcode=${subcode}` : ""
  return `[WhatsApp Cloud] Falha na Graph API (HTTP ${status}${codePart}${subPart}): ${detail}`
}

/**
 * Generic outbound sender. POSTs an arbitrary message object to the Cloud API
 * `/messages` endpoint. All higher-level helpers delegate to this.
 *
 * `message` should NOT include `messaging_product` — it is added here.
 * Returns the parsed success body (contains `messages[0].id`).
 */
export async function sendOutbound(message: Record<string, any>): Promise<any> {
  const { apiVersion, phoneNumberId, accessToken } = getConfig()

  const url = `${GRAPH_BASE_URL}/${apiVersion}/${phoneNumberId}/messages`

  const payload = {
    messaging_product: "whatsapp",
    ...message,
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  // Parse body defensively — Graph may return non-JSON on some failures.
  let parsed: any = null
  const rawText = await response.text()
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch {
    parsed = { raw: rawText }
  }

  if (!response.ok) {
    console.error(
      "[WhatsApp Cloud] HTTP error status:",
      response.status,
      "body:",
      JSON.stringify(parsed)
    )
    throw new Error(describeGraphError(response.status, parsed))
  }

  return parsed
}

/**
 * Send a plain text message.
 * Note: free-form text only works inside the 24h customer service window;
 * outside of it use `sendTemplate`.
 */
export async function sendText(to: string, body: string): Promise<any> {
  const recipient = normalizeE164(to)
  return sendOutbound({
    to: recipient,
    type: "text",
    text: { preview_url: false, body },
  })
}

/**
 * Send a template (HSM) message. Required when outside the 24h window.
 * `components` follows the Cloud API template components structure.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: any[]
): Promise<any> {
  const recipient = normalizeE164(to)
  return sendOutbound({
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  })
}

/**
 * Send an interactive message (buttons, lists, etc.).
 * `interactivePayload` is the Cloud API `interactive` object.
 */
export async function sendInteractive(
  to: string,
  interactivePayload: Record<string, any>
): Promise<any> {
  const recipient = normalizeE164(to)
  return sendOutbound({
    to: recipient,
    type: "interactive",
    interactive: interactivePayload,
  })
}
