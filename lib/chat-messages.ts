import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export type ChatMessageRecord = {
  id: string
  chatId: string
  userId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

const CHAT_MESSAGES_PATH = path.join(process.cwd(), "data", "chat-messages.db")

export async function readChatMessages(): Promise<ChatMessageRecord[]> {
  try {
    const raw = await fs.readFile(CHAT_MESSAGES_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as ChatMessageRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

export async function writeChatMessages(messages: ChatMessageRecord[]) {
  const serialized = JSON.stringify(messages, null, 2)
  await fs.mkdir(path.dirname(CHAT_MESSAGES_PATH), { recursive: true })
  await fs.writeFile(CHAT_MESSAGES_PATH, serialized, "utf8")
}

export function createChatMessage(
  chatId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
): ChatMessageRecord {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    chatId,
    userId,
    role,
    content,
    createdAt: now,
  }
}

export function messagesForChat(
  messages: ChatMessageRecord[],
  chatId: string
): ChatMessageRecord[] {
  return messages
    .filter((m) => m.chatId === chatId)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
}
