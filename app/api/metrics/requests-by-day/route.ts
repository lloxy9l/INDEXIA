import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000
const VALID_RANGES = new Set([7, 30, 90])

const getUtcDateKey = (value: Date) => value.toISOString().slice(0, 10)

const normalizePipeline = (value?: string) => {
  if (!value) return "ragStandard"
  const normalized = value.toLowerCase()
  if (normalized.includes("rerank")) return "ragRerank"
  return "ragStandard"
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const rangeParam = url.searchParams.get("days") ?? ""
    const parsed = Number.parseInt(rangeParam, 10)
    const days = VALID_RANGES.has(parsed) ? parsed : 90

    const records = await readOllamaRequests()
    const served = records.filter((entry) => entry.status === "ok")

    const now = new Date()
    const endUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
    const startUtc = endUtc - (days - 1) * DAY_MS
    const dayMap = new Map(
      Array.from({ length: days }, (_, index) => {
        const ts = startUtc + index * DAY_MS
        return [
          getUtcDateKey(new Date(ts)),
          { date: getUtcDateKey(new Date(ts)), ragStandard: 0, ragRerank: 0 },
        ]
      })
    )

    for (const entry of served) {
      const ts = new Date(entry.createdAt).getTime()
      if (!Number.isFinite(ts)) continue
      if (ts < startUtc || ts >= endUtc + DAY_MS) continue
      const key = getUtcDateKey(new Date(ts))
      const bucket = dayMap.get(key)
      if (!bucket) continue
      const pipeline = normalizePipeline(entry.pipeline)
      if (pipeline === "ragRerank") {
        bucket.ragRerank += 1
      } else {
        bucket.ragStandard += 1
      }
    }

    return new Response(JSON.stringify({ data: Array.from(dayMap.values()) }), {
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
