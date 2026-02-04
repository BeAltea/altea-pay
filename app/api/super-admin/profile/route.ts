import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const profileData = {
      id: profile.id,
      fullName: profile.fullName || "",
      email: profile.email,
      phone: profile.phone || "",
      role: profile.role,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error("[API] Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, phone } = body

    await db
      .update(profiles)
      .set({
        fullName,
        phone,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
