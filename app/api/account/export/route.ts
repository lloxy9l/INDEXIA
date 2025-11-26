import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, readUsers, validateAuthCookie } from "@/lib/auth"
import { readChats } from "@/lib/chats"

function csvEscape(value: unknown) {
  const str = String(value ?? "")
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

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
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 })
    }

    const chats = await readChats()
    const userChats = user.id
      ? chats.filter((chat) => chat.userId === user.id)
      : []

    const header = [
      "type",
      "userId",
      "email",
      "admin",
      "userCreatedAt",
      "chatId",
      "chatTitle",
      "chatCreatedAt",
      "chatUpdatedAt",
    ]

    const rows: string[] = []

    rows.push(
      [
        "user",
        csvEscape(user.id ?? ""),
        csvEscape(user.email),
        csvEscape(user.admin ? "true" : "false"),
        csvEscape(user.createdAt),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
      ].join(",")
    )

    for (const chat of userChats) {
      rows.push(
        [
          "chat",
          csvEscape(chat.userId),
          csvEscape(user.email),
          csvEscape(user.admin ? "true" : "false"),
          csvEscape(user.createdAt),
          csvEscape(chat.id),
          csvEscape(chat.title),
          csvEscape(chat.createdAt),
          csvEscape(chat.updatedAt),
        ].join(",")
      )
    }

    const csv = [header.join(","), ...rows].join("\n")

    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="indexia-export-${user.id ?? "user"}.csv"`,
      },
    })

    return response
  } catch (error) {
    console.error("Erreur lors de l'export des données", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
