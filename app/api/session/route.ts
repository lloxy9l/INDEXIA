import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, readUsers, validateAuthCookie } from "@/lib/auth"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const users = await readUsers()
    const user = users.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    return NextResponse.json({
      email,
      admin: user.admin ?? false,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      service: user.service ?? null,
    })
  } catch (error) {
    console.error("Erreur validation session", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
