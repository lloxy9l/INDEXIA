import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  createAuthCookieValue,
  hashPassword,
  readUsers,
} from "@/lib/auth"

function authResponse(body: unknown, status: number, email: string) {
  const cookieValue = createAuthCookieValue(email)
  const response = NextResponse.json(body, { status })
  response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(cookieValue), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  })
  return response
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = (body?.email as string | undefined)?.trim().toLowerCase()
    const password = body?.password as string | undefined

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const user = users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      )
    }

    const passwordHash = hashPassword(password)
    if (user.passwordHash !== passwordHash) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      )
    }

    return authResponse({ message: "Connexion réussie", email }, 200, email)
  } catch (error) {
    console.error("Login error", error)
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    )
  }
}
