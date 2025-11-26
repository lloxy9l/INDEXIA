import { randomUUID } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  type UserRecord,
  readUsers,
  validateAuthCookie,
  writeUsers,
} from "@/lib/auth"
import {
  chatsForUser,
  createChatForUser,
  readChats,
  sortChatsByRecent,
  writeChats,
} from "@/lib/chats"

async function getAuthenticatedUser():
  Promise<{ user: UserRecord } | { response: NextResponse }> {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)

    if (!email) {
      return {
        response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      }
    }

    const users = await readUsers()
    const user = users.find((u) => u.email === email)

    if (!user) {
      return {
        response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      }
    }

    if (!user.id) {
      const patchedUser: UserRecord = { ...user, id: randomUUID() }
      const nextUsers = users.map((u) => (u.email === email ? patchedUser : u))
      await writeUsers(nextUsers)
      return { user: patchedUser }
    }

    return { user }
  } catch (error) {
    console.error("Erreur de récupération de l'utilisateur authentifié", error)
    return {
      response: NextResponse.json({ error: "Erreur serveur" }, { status: 500 }),
    }
  }
}

export async function GET() {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  const chats = await readChats()
  const userChats = sortChatsByRecent(chatsForUser(chats, authenticated.user.id!))

  return NextResponse.json({ chats: userChats })
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title
        : undefined

    const chats = await readChats()
    const newChat = createChatForUser(authenticated.user.id!, title)
    await writeChats([...chats, newChat])

    return NextResponse.json({ chat: newChat }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du chat", error)
    return NextResponse.json({ error: "Impossible de créer le chat" }, { status: 500 })
  }
}
