import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  readUsers,
  validateAuthCookie,
  writeUsers,
  type UserRecord,
} from "@/lib/auth"

function sanitize(value?: string) {
  return value?.trim() ?? ""
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)

    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const firstName = sanitize(body?.firstName)
    const lastName = sanitize(body?.lastName)

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Prénom et nom sont requis" },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const userIndex = users.findIndex((u) => u.email === email)

    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 })
    }

    const updated: UserRecord = {
      ...users[userIndex],
      firstName,
      lastName,
    }

    users[userIndex] = updated
    await writeUsers(users)

    return NextResponse.json({
      firstName: updated.firstName,
      lastName: updated.lastName,
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
