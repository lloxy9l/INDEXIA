import { promises as fs } from "fs"
import Image from "next/image"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import path from "path"

import { LoginForm } from "@/components/login-form"

type UserRecord = {
  email: string
  passwordHash: string
  createdAt: string
}

const DB_PATH = path.join(process.cwd(), "data", "auth.db")

async function userExists(email: string) {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8")
    if (!raw.trim()) return false
    const users = JSON.parse(raw) as UserRecord[]
    return users.some((user) => user.email === email)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false
    }
    console.error("Erreur lors de la lecture de la base auth.db", error)
    return false
  }
}

function parseAuthEmail(cookieValue?: string) {
  if (!cookieValue) return null
  try {
    const parsed = JSON.parse(cookieValue)
    const email = (parsed?.email as string | undefined)?.trim().toLowerCase()
    return email ?? null
  } catch {
    return null
  }
}

export default async function LoginPage() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("auth_state")
  const authEmail = parseAuthEmail(authCookie?.value)

  if (authEmail && (await userExists(authEmail))) {
    redirect("/chat")
  }

  const logoSrc = "/logo.png"

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="mb-6 flex items-center justify-center">
        <Image
          src={logoSrc}
          alt="Logo"
          width={180}
          height={180}
          priority
          unoptimized
        />
      </div>
      <br />
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
