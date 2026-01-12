import { readUsers } from "@/lib/auth"
import { readChatMessages } from "@/lib/chat-messages"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const resolveUserLabel = (user: { firstName?: string; lastName?: string; email?: string }) => {
  const first = user.firstName?.trim()
  const last = user.lastName?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  if (user.email) return user.email.split("@")[0]
  return "Utilisateur"
}

export async function GET() {
  try {
    const [users, messages] = await Promise.all([readUsers(), readChatMessages()])
    const since = Date.now() - 7 * DAY_MS
    const userMap = new Map(
      users.map((user) => [user.id ?? user.email, resolveUserLabel(user)])
    )

    const counts = new Map<string, number>()
    for (const message of messages) {
      if (message.role !== "user") continue
      const ts = new Date(message.createdAt).getTime()
      if (!Number.isFinite(ts) || ts < since) continue
      const key = message.userId
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const data = Array.from(counts.entries())
      .map(([userId, requests]) => ({
        name: userMap.get(userId) ?? userId,
        requests,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
