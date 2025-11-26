import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  hashPassword,
  readUsers,
  validateAuthCookie,
  writeUsers,
} from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)

    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const password = body?.password as string | undefined
    const confirm = body?.confirm as string | undefined

    if (!password || !confirm) {
      return NextResponse.json(
        { error: "Mot de passe et confirmation requis" },
        { status: 400 }
      )
    }

    if (password !== confirm) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const userIndex = users.findIndex((u) => u.email === email)

    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 })
    }

    users[userIndex].passwordHash = hashPassword(password)
    await writeUsers(users)

    return NextResponse.json({ message: "Mot de passe mis à jour" })
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
