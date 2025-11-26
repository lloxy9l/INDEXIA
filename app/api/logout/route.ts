import { NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "auth_state"

export async function POST() {
  const response = NextResponse.json({ message: "Déconnecté" })
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}
