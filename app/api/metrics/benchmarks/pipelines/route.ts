import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const PIPELINE_LABELS = ["standard", "rerank", "multi", "agent"] as const
const PIPELINE_LABEL_MAP: Record<(typeof PIPELINE_LABELS)[number], string> = {
  standard: "Standard",
  rerank: "Re-ranking",
  multi: "Multi-query",
  agent: "Agent",
}

const resolvePipelineKey = (raw: string | undefined | null) => {
  const normalized = (raw ?? "").toLowerCase()
  if (normalized.includes("rerank")) return "rerank"
  if (normalized.includes("multi")) return "multi"
  if (normalized.includes("agent")) return "agent"
  return "standard"
}

const startOfUtcDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setUTCHours(0, 0, 0, 0)
  return date.getTime()
}

export async function GET() {
  try {
    const records = await readOllamaRequests()
    const now = Date.now()
    const baseDay = startOfUtcDay(now)
    const dayOffsets = Array.from({ length: 7 }, (_, index) => 6 - index)

    const relevance = dayOffsets.map((offset) => {
      const dayStart = baseDay - offset * DAY_MS
      const dayEnd = dayStart + DAY_MS
      const totals = new Map<string, number>(
        PIPELINE_LABELS.map((key) => [key, 0])
      )
      const oks = new Map<string, number>(
        PIPELINE_LABELS.map((key) => [key, 0])
      )

      for (const entry of records) {
        const ts = new Date(entry.createdAt).getTime()
        if (!Number.isFinite(ts) || ts < dayStart || ts >= dayEnd) continue
        const key = resolvePipelineKey(entry.pipeline)
        totals.set(key, (totals.get(key) ?? 0) + 1)
        if (entry.status === "ok") {
          oks.set(key, (oks.get(key) ?? 0) + 1)
        }
      }

      const point: Record<string, number | null> = {
        day: `J-${offset}`,
      }
      PIPELINE_LABELS.forEach((key) => {
        const total = totals.get(key) ?? 0
        const ok = oks.get(key) ?? 0
        point[key] =
          total > 0 ? Math.round((ok / total) * 1000) / 1000 : null
      })

      return point
    })

    const totals = new Map<string, number>(
      PIPELINE_LABELS.map((key) => [key, 0])
    )
    const counts = new Map<string, number>(
      PIPELINE_LABELS.map((key) => [key, 0])
    )
    const since = now - 7 * DAY_MS

    for (const entry of records) {
      const ts = new Date(entry.createdAt).getTime()
      if (!Number.isFinite(ts) || ts < since) continue
      if (entry.status !== "ok") continue
      const key = resolvePipelineKey(entry.pipeline)
      totals.set(key, (totals.get(key) ?? 0) + entry.durationMs)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const time = PIPELINE_LABELS.map((key) => {
      const total = totals.get(key) ?? 0
      const count = counts.get(key) ?? 0
      const avg = count > 0 ? Math.round(total / count) : 0
      return {
        pipeline: PIPELINE_LABEL_MAP[key],
        ms: avg,
      }
    })

    return new Response(JSON.stringify({ relevance, time }), {
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
