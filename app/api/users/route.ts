import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  readUsers,
  validateAuthCookie,
  writeUsers,
} from "@/lib/auth"
import { readChats } from "@/lib/chats"

type PublicUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  admin: boolean
  active: boolean
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const users = await readUsers()
    const currentUser = users.find((user) => user.email === email)
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    if (!currentUser.admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const chats = await readChats()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const sanitized: PublicUser[] = users.map((user) => {
      const userChats = chats.filter((chat) => chat.userId === user.id)
      const lastChatAt = userChats
        .map((chat) => new Date(chat.createdAt).getTime())
        .filter((ts) => !Number.isNaN(ts))
        .sort((a, b) => b - a)[0]
      const active = typeof lastChatAt === "number" && now - lastChatAt <= THIRTY_DAYS_MS

      return {
        id: user.id ?? user.email,
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        createdAt: user.createdAt,
        admin: user.admin ?? false,
        active: active ?? false,
      }
    })

    return NextResponse.json({ users: sanitized })
  } catch (error) {
    console.error("Erreur lors de la lecture des utilisateurs", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const users = await readUsers()
    const currentUser = users.find((user) => user.email === email)
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    if (!currentUser.admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userId =
      typeof body?.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : ""
    const adminValue =
      typeof body?.admin === "boolean" ? body.admin : null

    if (!userId || adminValue === null) {
      return NextResponse.json({ error: "userId et admin requis" }, { status: 400 })
    }

    const target = users.find((user) => (user.id ?? user.email) === userId)
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const updated = users.map((user) =>
      (user.id ?? user.email) === userId ? { ...user, admin: adminValue } : user
    )

    await writeUsers(updated)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du rôle admin", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const users = await readUsers()
    const currentUser = users.find((user) => user.email === email)
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    if (!currentUser.admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userId =
      typeof body?.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : ""

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 })
    }

    const target = users.find((user) => (user.id ?? user.email) === userId)
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const remaining = users.filter((user) => (user.id ?? user.email) !== userId)
    await writeUsers(remaining)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
