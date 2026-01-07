import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const records = await readOllamaRequests()
    const served = records.filter((entry) => entry.status === "ok")
    const now = Date.now()
    const start24h = now - DAY_MS
    const start48h = now - 2 * DAY_MS
    const start7d = now - 7 * DAY_MS
    const start14d = now - 14 * DAY_MS

    const inRange = (start: number, end: number) =>
      served.filter((entry) => {
        const ts = new Date(entry.createdAt).getTime()
        return ts >= start && ts < end
      })

    const countInRange = (start: number, end: number) =>
      inRange(start, end).length

    const requests24h = countInRange(start24h, now)
    const requests7d = countInRange(start7d, now)
    const requestsPrev7d = countInRange(start14d, start7d)
    const deltaPct =
      requestsPrev7d > 0
        ? ((requests7d - requestsPrev7d) / requestsPrev7d) * 100
        : null

    const durations24h = inRange(start24h, now).map((entry) => entry.durationMs)
    const durationsPrev24h = inRange(start48h, start24h).map(
      (entry) => entry.durationMs
    )

    const avg = (values: number[]) =>
      values.length === 0
        ? null
        : values.reduce((sum, value) => sum + value, 0) / values.length

    const p95 = (values: number[]) => {
      if (values.length === 0) return null
      const sorted = [...values].sort((a, b) => a - b)
      const index = Math.ceil(sorted.length * 0.95) - 1
      return sorted[Math.max(0, index)]
    }

    const avgMs24h = avg(durations24h)
    const avgMsPrev24h = avg(durationsPrev24h)
    const avgMsDeltaPct =
      avgMs24h != null && avgMsPrev24h != null && avgMsPrev24h > 0
        ? ((avgMs24h - avgMsPrev24h) / avgMsPrev24h) * 100
        : null

    return new Response(
      JSON.stringify({
        requests24h,
        requests7d,
        requestsPrev7d,
        deltaPct,
        avgMs24h,
        avgMsPrev24h,
        avgMsDeltaPct,
        p95Ms24h: p95(durations24h),
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
