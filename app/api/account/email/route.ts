import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  createAuthCookieValue,
  readUsers,
  validateAuthCookie,
  writeUsers,
} from "@/lib/auth"

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? ""
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const currentEmail = validateAuthCookie(
      cookieStore.get(AUTH_COOKIE_NAME)?.value
    )

    if (!currentEmail) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const nextEmail = normalizeEmail(body?.email)

    if (!nextEmail || !nextEmail.includes("@") || nextEmail.length < 5) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const userIndex = users.findIndex((u) => u.email === currentEmail)

    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 })
    }

    const alreadyUsed = users.some(
      (u, idx) => idx !== userIndex && u.email === nextEmail
    )
    if (alreadyUsed) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      )
    }

    users[userIndex].email = nextEmail
    await writeUsers(users)

    const cookieValue = createAuthCookieValue(nextEmail)
    const response = NextResponse.json({ email: nextEmail })
    response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(cookieValue), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Erreur lors du changement d'email", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
