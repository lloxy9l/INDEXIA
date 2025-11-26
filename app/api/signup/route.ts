import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { NextResponse } from "next/server"

type UserRecord = {
  email: string
  passwordHash: string
  createdAt: string
}

const DB_PATH = path.join(process.cwd(), "data", "auth.db")
const AUTH_COOKIE_NAME = "auth_state"

async function readUsers(): Promise<UserRecord[]> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as UserRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

async function writeUsers(users: UserRecord[]) {
  const serialized = JSON.stringify(users, null, 2)
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, serialized, "utf8")
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

function authResponse(body: unknown, status: number, email: string) {
  const response = NextResponse.json(body, { status })
  response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify({ email, loggedIn: true }), {
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const existing = users.find((u) => u.email === email)

    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      )
    }

    const newUser: UserRecord = {
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    await writeUsers(users)

    return authResponse({ message: "Compte créé avec succès", email }, 201, email)
  } catch (error) {
    console.error("Signup error", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
