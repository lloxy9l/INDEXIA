import { readChatMessages } from "@/lib/chat-messages"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const extractSources = (content: string) => {
  const results: string[] = []
  const regex = /\[sources?:\s*([^\]]+)\]/gi
  let match = regex.exec(content)
  while (match) {
    const raw = match[1]
    raw
      .split(/[;,]/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => results.push(item))
    match = regex.exec(content)
  }
  return results
}

export async function GET() {
  try {
    const messages = await readChatMessages()
    const since = Date.now() - 7 * DAY_MS
    const counts = new Map<string, number>()

    for (const message of messages) {
      if (message.role !== "assistant") continue
      const ts = new Date(message.createdAt).getTime()
      if (!Number.isFinite(ts) || ts < since) continue
      const sources = extractSources(message.content)
      sources.forEach((source) => {
        counts.set(source, (counts.get(source) ?? 0) + 1)
      })
    }

    const data = Array.from(counts.entries())
      .map(([title, hits]) => ({ title, hits }))
      .sort((a, b) => b.hits - a.hits)
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
