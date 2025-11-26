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
import { chatsForUser, readChats, sortChatsByRecent, writeChats } from "@/lib/chats"
import {
  createProjectForUser,
  projectsForUser,
  readProjects,
  sortProjectsByRecent,
  writeProjects,
} from "@/lib/projects"

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

  try {
    const [projects, chats] = await Promise.all([readProjects(), readChats()])
    const userId = authenticated.user.id!
    const orderedProjects = sortProjectsByRecent(projectsForUser(projects, userId))
    const orderedChats = sortChatsByRecent(chatsForUser(chats, userId))

    return NextResponse.json({ projects: orderedProjects, chats: orderedChats })
  } catch (error) {
    console.error("Erreur lors du chargement des projets", error)
    return NextResponse.json(
      { error: "Impossible de charger les projets" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const name =
      typeof body?.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : "Nouveau projet"

    const projects = await readProjects()
    const newProject = createProjectForUser(authenticated.user.id!, name)
    await writeProjects([...projects, newProject])

    return NextResponse.json({ project: newProject }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du projet", error)
    return NextResponse.json({ error: "Impossible de créer le projet" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const projectId =
      typeof body?.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : ""
    const name =
      typeof body?.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : ""

    if (!projectId || !name) {
      return NextResponse.json(
        { error: "projectId et name sont requis" },
        { status: 400 }
      )
    }

    const projects = await readProjects()
    const target = projects.find((p) => p.id === projectId)
    if (!target || target.userId !== authenticated.user.id) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updatedProject = { ...target, name, updatedAt: now }
    const nextProjects = projects.map((p) => (p.id === projectId ? updatedProject : p))
    await writeProjects(nextProjects)

    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    console.error("Erreur lors du renommage du projet", error)
    return NextResponse.json(
      { error: "Impossible de renommer le projet" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const authenticated = await getAuthenticatedUser()
  if ("response" in authenticated) return authenticated.response

  try {
    const body = await request.json().catch(() => ({}))
    const projectId =
      typeof body?.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : ""

    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 })
    }

    const [projects, chats] = await Promise.all([readProjects(), readChats()])
    const target = projects.find((p) => p.id === projectId)
    if (!target || target.userId !== authenticated.user.id) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }

    const nextProjects = projects.filter((p) => p.id !== projectId)
    const nextChats = chats.map((chat) =>
      chat.projectId === projectId ? { ...chat, projectId: null } : chat
    )

    await Promise.all([writeProjects(nextProjects), writeChats(nextChats)])

    const orderedProjects = sortProjectsByRecent(
      projectsForUser(nextProjects, authenticated.user.id!)
    )
    const orderedChats = sortChatsByRecent(
      chatsForUser(nextChats, authenticated.user.id!)
    )

    return NextResponse.json({ projects: orderedProjects, chats: orderedChats })
  } catch (error) {
    console.error("Erreur lors de la suppression du projet", error)
    return NextResponse.json(
      { error: "Impossible de supprimer le projet" },
      { status: 500 }
    )
  }
}
