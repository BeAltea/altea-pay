import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Liveness: o processo está de pé. Usado pelo livenessProbe do k8s (web).
export async function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() }, { status: 200 })
}
