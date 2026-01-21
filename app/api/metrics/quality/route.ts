import { readChatMessages } from "@/lib/chat-messages"
import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const hasCitation = (content: string) =>
  /\[sources?:[^\]]+\]/i.test(content)

const isNoResult = (content: string) =>
  /je ne peux pas r(?:e|\u00e9)pondre (avec les documents disponibles|sans question pr(?:e|\u00e9)cise)/i.test(
    content
  )

const inRange = <T,>(
  entries: T[],
  start: number,
  end: number,
  getTime: (entry: T) => number
) => entries.filter((entry) => {
    const ts = getTime(entry)
    return ts >= start && ts < end
  })

export async function GET() {
  try {
    const [messages, requests] = await Promise.all([
      readChatMessages(),
      readOllamaRequests(),
    ])
    const now = Date.now()
    const start7d = now - 7 * DAY_MS
    const start14d = now - 14 * DAY_MS

    const assistantMessages = messages.filter(
      (entry) => entry.role === "assistant"
    )
    const messages7d = inRange(
      assistantMessages,
      start7d,
      now,
      (entry) => new Date(entry.createdAt).getTime()
    )
    const messagesPrev7d = inRange(
      assistantMessages,
      start14d,
      start7d,
      (entry) => new Date(entry.createdAt).getTime()
    )

    const noResult7d = messages7d.filter((entry) =>
      isNoResult(entry.content)
    ).length
    const noResultPrev7d = messagesPrev7d.filter((entry) =>
      isNoResult(entry.content)
    ).length

    const responseMessages7d = messages7d.filter(
      (entry) => !isNoResult(entry.content)
    )
    const responseMessagesPrev7d = messagesPrev7d.filter(
      (entry) => !isNoResult(entry.content)
    )

    const cited7d = responseMessages7d.filter((entry) =>
      hasCitation(entry.content)
    ).length
    const citedPrev7d = responseMessagesPrev7d.filter((entry) =>
      hasCitation(entry.content)
    ).length

    const coverageTotal7d = responseMessages7d.length
    const coverageTotalPrev7d = responseMessagesPrev7d.length
    const coveragePct =
      coverageTotal7d > 0 ? (cited7d / coverageTotal7d) * 100 : null
    const coveragePrevPct =
      coverageTotalPrev7d > 0 ? (citedPrev7d / coverageTotalPrev7d) * 100 : null
    const coverageDeltaPct =
      coveragePct != null && coveragePrevPct != null
        ? coveragePct - coveragePrevPct
        : null

    const requests7d = inRange(
      requests,
      start7d,
      now,
      (entry) => new Date(entry.createdAt).getTime()
    )
    const requestsPrev7d = inRange(
      requests,
      start14d,
      start7d,
      (entry) => new Date(entry.createdAt).getTime()
    )

    const errors7d = requests7d.filter((entry) => entry.status === "error")
      .length
    const errorsPrev7d = requestsPrev7d.filter(
      (entry) => entry.status === "error"
    ).length

    const totalRequests7d = requests7d.length + noResult7d
    const totalRequestsPrev7d = requestsPrev7d.length + noResultPrev7d

    const errorPct =
      totalRequests7d > 0
        ? ((errors7d + noResult7d) / totalRequests7d) * 100
        : null
    const errorPrevPct =
      totalRequestsPrev7d > 0
        ? ((errorsPrev7d + noResultPrev7d) / totalRequestsPrev7d) * 100
        : null
    const errorDeltaPct =
      errorPct != null && errorPrevPct != null ? errorPct - errorPrevPct : null

    return new Response(
      JSON.stringify({
        coveragePct,
        coverageDeltaPct,
        errorPct,
        errorDeltaPct,
        totalResponses7d: coverageTotal7d,
        totalRequests7d,
        updatedAt: new Date(now).toISOString(),
      }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
