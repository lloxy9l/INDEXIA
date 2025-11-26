import { createHash, createHmac, randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export type UserRecord = {
  id?: string
  email: string
  passwordHash: string
  createdAt: string
  admin?: boolean
}

export const DB_PATH = path.join(process.cwd(), "data", "users.db")
export const AUTH_COOKIE_NAME = "auth_state"
export const AUTH_SECRET =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret"

export async function readUsers(): Promise<UserRecord[]> {
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

export async function writeUsers(users: UserRecord[]) {
  const serialized = JSON.stringify(users, null, 2)
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, serialized, "utf8")
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

function signPayload(email: string, issuedAt: number) {
  return createHmac("sha256", AUTH_SECRET)
    .update(`${email}:${issuedAt}`)
    .digest("hex")
}

export function createAuthCookieValue(email: string) {
  const issuedAt = Date.now()
  const signature = signPayload(email, issuedAt)
  return { email, issuedAt, signature }
}

export function validateAuthCookie(raw?: string) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const email = (parsed?.email as string | undefined)?.trim().toLowerCase()
    const issuedAt = parsed?.issuedAt as number | undefined
    const signature = parsed?.signature as string | undefined
    if (!email || !issuedAt || !signature) return null

    const expected = signPayload(email, issuedAt)
    if (expected !== signature) return null
    return email
  } catch {
    return null
  }
}

export function createNewUser(email: string, password: string): UserRecord {
  return {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    admin: false,
  }
}
