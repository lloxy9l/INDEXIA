import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  createAuthCookieValue,
  createNewUser,
  readUsers,
  writeUsers,
} from "@/lib/auth"
import { normalizeService } from "@/lib/permissions"
import { SERVICE_OPTIONS } from "@/lib/services"

function authResponse(body: unknown, status: number, email: string) {
  const cookieValue = createAuthCookieValue(email)
  const response = NextResponse.json(body, { status })
  response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(cookieValue), {
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
    const service = (body?.service as string | undefined)?.trim()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }
    if (!service) {
      return NextResponse.json(
        { error: "Service requis" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      )
    }

    const normalizedService = normalizeService(service)
    const allowedServices = new Map(
      SERVICE_OPTIONS.map((label) => [normalizeService(label), label] as const).filter(
        (entry): entry is [string, string] => Boolean(entry[0])
      )
    )
    const canonicalService =
      normalizedService ? allowedServices.get(normalizedService) : null
    if (!canonicalService) {
      return NextResponse.json(
        { error: "Service invalide" },
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

    const newUser = createNewUser(email, password, canonicalService)

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
