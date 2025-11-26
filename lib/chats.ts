import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export type ChatRecord = {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

const CHAT_DB_PATH = path.join(process.cwd(), "data", "chats.db")

export async function readChats(): Promise<ChatRecord[]> {
  try {
    const raw = await fs.readFile(CHAT_DB_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as ChatRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

export async function writeChats(chats: ChatRecord[]) {
  const serialized = JSON.stringify(chats, null, 2)
  await fs.mkdir(path.dirname(CHAT_DB_PATH), { recursive: true })
  await fs.writeFile(CHAT_DB_PATH, serialized, "utf8")
}

export function createChatForUser(userId: string, title?: string): ChatRecord {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    userId,
    title: title?.trim() || "Nouveau chat",
    createdAt: now,
    updatedAt: now,
  }
}

export function sortChatsByRecent(chats: ChatRecord[]) {
  return [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function chatsForUser(chats: ChatRecord[], userId: string) {
  return chats.filter((chat) => chat.userId === userId)
}
