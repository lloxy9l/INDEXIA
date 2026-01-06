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
import { readChatMessages, writeChatMessages } from "@/lib/chat-messages"
import { projectsForUser, readProjects, writeProjects } from "@/lib/projects"

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

export async function GET(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId") || undefined

  const chats = await readChats()
  const userChats = sortChatsByRecent(
    chatsForUser(chats, authenticated.user.id!, projectId)
  )

  return NextResponse.json({ chats: userChats })
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const projectId =
      typeof body?.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : null
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title
        : undefined

    const [chats, projects, messages] = await Promise.all([
      readChats(),
      readProjects(),
      readChatMessages(),
    ])
    const userProjects = projectsForUser(projects, authenticated.user.id!)
    const targetProjectId = userProjects.find((p) => p.id === projectId)?.id ?? null

    const newChat = createChatForUser(authenticated.user.id!, title, targetProjectId)
    await Promise.all([
      writeChats([...chats, newChat]),
      targetProjectId
        ? writeProjects(
            projects.map((project) =>
              project.id === targetProjectId
                ? { ...project, updatedAt: newChat.updatedAt }
                : project
            )
          )
        : Promise.resolve(),
    ])

    return NextResponse.json({ chat: newChat }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du chat", error)
    return NextResponse.json({ error: "Impossible de créer le chat" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const chatId =
      typeof body?.chatId === "string" && body.chatId.trim().length > 0
        ? body.chatId.trim()
        : ""
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : undefined
    const projectIdValue = body?.projectId
    const hasProjectId = "projectId" in body
    const projectId =
      hasProjectId && typeof projectIdValue === "string" && projectIdValue.trim().length > 0
        ? projectIdValue.trim()
        : hasProjectId
          ? null
          : undefined

    if (!chatId || (!title && projectId === undefined)) {
      return NextResponse.json(
        { error: "chatId et au moins un champ (title ou projectId) sont requis" },
        { status: 400 }
      )
    }

    const [chats, projects, messages] = await Promise.all([
      readChats(),
      readProjects(),
      readChatMessages(),
    ])
    const existing = chats.find((chat) => chat.id === chatId)
    if (!existing || existing.userId !== authenticated.user.id) {
      return NextResponse.json({ error: "Chat introuvable" }, { status: 404 })
    }

    const userProjects = projectsForUser(projects, authenticated.user.id!)
    const resolvedProjectId =
      projectId === undefined
        ? existing.projectId
        : userProjects.find((p) => p.id === projectId)?.id ?? null

    const now = new Date().toISOString()
    const nextChat = {
      ...existing,
      title: title ?? existing.title,
      projectId: resolvedProjectId,
      updatedAt: now,
    }
    const nextChats = chats.map((chat) => (chat.id === chatId ? nextChat : chat))
    const nextProjects =
      resolvedProjectId == null
        ? projects
        : projects.map((project) =>
            project.id === resolvedProjectId ? { ...project, updatedAt: now } : project
          )

    await Promise.all([
      writeChats(nextChats),
      resolvedProjectId ? writeProjects(nextProjects) : Promise.resolve(),
    ])
    return NextResponse.json({ chat: nextChat })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du chat", error)
    return NextResponse.json({ error: "Impossible de mettre à jour le chat" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const chatId =
      typeof body?.chatId === "string" && body.chatId.trim().length > 0
        ? body.chatId.trim()
        : ""
    if (!chatId) {
      return NextResponse.json({ error: "chatId requis" }, { status: 400 })
    }

    const [chats, projects, messages] = await Promise.all([
      readChats(),
      readProjects(),
      readChatMessages(),
    ])
    const target = chats.find((chat) => chat.id === chatId)

    if (!target || target.userId !== authenticated.user.id) {
      return NextResponse.json({ error: "Chat introuvable" }, { status: 404 })
    }

    const nextChats = chats.filter((chat) => chat.id !== chatId)
    const nextMessages = messages.filter((message) => message.chatId !== chatId)
    const now = new Date().toISOString()
    const nextProjects = projects.map((project) =>
      target.projectId && project.id === target.projectId
        ? { ...project, updatedAt: now }
        : project
    )

    await Promise.all([
      writeChats(nextChats),
      writeProjects(nextProjects),
      writeChatMessages(nextMessages),
    ])

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Erreur lors de la suppression du chat", error)
    return NextResponse.json({ error: "Impossible de supprimer le chat" }, { status: 500 })
  }
}
