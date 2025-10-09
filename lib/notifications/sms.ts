"use server"

import twilio from "twilio"

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

interface SendSMSParams {
  to: string
  body: string
}

export async function sendSMS({ to, body }: SendSMSParams) {
  try {
    console.log("[Twilio] Sending SMS to:", to)
    console.log("[Twilio] Body preview:", body.substring(0, 100))

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = to.replace(/[\s\-()]/g, "")
    // Ensure phone number starts with +
    const formattedPhone = normalizedPhone.startsWith("+") ? normalizedPhone : `+55${normalizedPhone}`

    console.log("[Twilio] Formatted phone:", formattedPhone)

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    })

    console.log("[Twilio] SMS sent:", message.sid)
    return { success: true, messageId: message.sid }
  } catch (error: any) {
    console.error("[Twilio] ERROR:", error)
    return { success: false, message: error.message || "Failed to send SMS" }
  }
}
