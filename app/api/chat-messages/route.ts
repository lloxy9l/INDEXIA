import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  type UserRecord,
  readUsers,
  validateAuthCookie,
} from "@/lib/auth"
import {
  createChatMessage,
  messagesForChat,
  readChatMessages,
  writeChatMessages,
} from "@/lib/chat-messages"
import { readChats } from "@/lib/chats"
import { cookies } from "next/headers"

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

    if (!user || !user.id) {
      return {
        response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      }
    }

    return { user }
  } catch (error) {
    console.error("Erreur d'authentification messages", error)
    return {
      response: NextResponse.json({ error: "Erreur serveur" }, { status: 500 }),
    }
  }
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser()
  if ("response" in auth) return auth.response

  const url = new URL(request.url)
  const chatId = url.searchParams.get("chatId")

  if (!chatId) {
    return NextResponse.json({ error: "chatId requis" }, { status: 400 })
  }

  const [chats, messages] = await Promise.all([readChats(), readChatMessages()])
  const chat = chats.find((c) => c.id === chatId && c.userId === auth.user.id)

  if (!chat) {
    return NextResponse.json({ error: "Chat introuvable" }, { status: 404 })
  }

  return NextResponse.json({
    messages: messagesForChat(messages, chatId),
  })
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser()
  if ("response" in auth) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const chatId =
      typeof body?.chatId === "string" && body.chatId.trim().length > 0
        ? body.chatId.trim()
        : ""
    const role = body?.role === "assistant" ? "assistant" : "user"
    const content =
      typeof body?.content === "string" && body.content.trim().length > 0
        ? body.content
        : ""

    if (!chatId || !content) {
      return NextResponse.json(
        { error: "chatId et content sont requis" },
        { status: 400 }
      )
    }

    const chats = await readChats()
    const chat = chats.find((c) => c.id === chatId && c.userId === auth.user.id)
    if (!chat) {
      return NextResponse.json({ error: "Chat introuvable" }, { status: 404 })
    }

    const messages = await readChatMessages()
    const newMessage = createChatMessage(chatId, auth.user.id, role, content)
    await writeChatMessages([...messages, newMessage])

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du message", error)
    return NextResponse.json(
      { error: "Impossible d'enregistrer le message" },
      { status: 500 }
    )
  }
}
