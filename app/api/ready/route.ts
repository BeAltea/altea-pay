import { NextResponse } from "next/server"
import { getDatabaseTarget } from "@/lib/db/target"

export const dynamic = "force-dynamic"

// Readiness: pronto para servir. Usado pelo readinessProbe do k8s (web).
// Reporta o DATABASE_TARGET ativo (Contrato D) sem abrir conexão pesada.
export async function GET() {
  return NextResponse.json(
    { status: "ready", databaseTarget: getDatabaseTarget() },
    { status: 200 },
  )
}
