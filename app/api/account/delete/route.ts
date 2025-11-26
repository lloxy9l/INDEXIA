import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  readUsers,
  validateAuthCookie,
  writeUsers,
} from "@/lib/auth"
import { readChats, writeChats } from "@/lib/chats"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)

    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const users = await readUsers()
    const user = users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 })
    }

    const remainingUsers = users.filter((u) => u.email !== email)
    await writeUsers(remainingUsers)

    const chats = await readChats()
    const remainingChats = user.id
      ? chats.filter((chat) => chat.userId !== user.id)
      : chats
    await writeChats(remainingChats)

    const response = NextResponse.json({ message: "Compte supprimé" })
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Erreur lors de la suppression du compte", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
