import { readUsers } from "@/lib/auth"
import { readChatMessages } from "@/lib/chat-messages"
import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const REQUEST_MATCH_WINDOW_MS = 5 * 60 * 1000
const REQUEST_EARLY_TOLERANCE_MS = 30 * 1000
const MAX_LOGS = 200

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
    const [users, messages, ollamaRequests] = await Promise.all([
      readUsers(),
      readChatMessages(),
      readOllamaRequests(),
    ])

    const userLabels = new Map(
      users.map((user) => [user.id ?? user.email, resolveUserLabel(user)])
    )

    const requestMessages = messages
      .filter((message) => message.role === "user")
      .map((message) => {
        const ts = new Date(message.createdAt).getTime()
        return { message, ts }
      })
      .filter((entry) => Number.isFinite(entry.ts))
      .sort((a, b) => a.ts - b.ts)

    const sortedRequests = [...ollamaRequests]
      .map((request) => ({
        request,
        ts: new Date(request.createdAt).getTime(),
      }))
      .filter((entry) => Number.isFinite(entry.ts))
      .sort((a, b) => a.ts - b.ts)

    let requestIndex = 0
    const logs = requestMessages.map(({ message, ts }) => {
      while (
        requestIndex < sortedRequests.length &&
        sortedRequests[requestIndex].ts < ts - REQUEST_EARLY_TOLERANCE_MS
      ) {
        requestIndex += 1
      }

      const candidate = sortedRequests[requestIndex]
      let matchedRequest:
        | (typeof sortedRequests)[number]["request"]
        | undefined

      if (candidate && Math.abs(candidate.ts - ts) <= REQUEST_MATCH_WINDOW_MS) {
        matchedRequest = candidate.request
        requestIndex += 1
      }

      const status =
        matchedRequest?.status === "ok"
          ? "success"
          : matchedRequest?.status === "error"
          ? "error"
          : "warn"

      return {
        id: message.id,
        createdAt: message.createdAt,
        user: userLabels.get(message.userId) ?? message.userId,
        question: message.content,
        model: matchedRequest?.model ?? null,
        pipeline: matchedRequest?.pipeline ?? null,
        durationMs:
          typeof matchedRequest?.durationMs === "number"
            ? matchedRequest.durationMs
            : null,
        status,
      }
    })

    const latestLogs = logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_LOGS)

    return new Response(JSON.stringify({ data: latestLogs }), {
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
