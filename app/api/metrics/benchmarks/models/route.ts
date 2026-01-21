import { LLM_CATALOG, normalizeModelName } from "@/lib/llm-catalog"
import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const prettyModelLabel = (value: string) => {
  const normalized = normalizeModelName(value)
  if (normalized.includes("llama")) return "Llama 3"
  if (normalized.includes("qwen")) return "Qwen"
  return value
}

export async function GET() {
  try {
    const catalog = LLM_CATALOG.map((value) => ({
      value,
      label: prettyModelLabel(value),
      key: normalizeModelName(value),
    }))
    const catalogMap = new Map(catalog.map((entry) => [entry.key, entry]))
    const records = await readOllamaRequests()
    const since = Date.now() - 7 * DAY_MS

    const totals = new Map<string, number>()
    const errors = new Map<string, number>()
    const durations = new Map<string, number[]>()

    for (const entry of records) {
      const ts = new Date(entry.createdAt).getTime()
      if (!Number.isFinite(ts) || ts < since) continue
      const normalized = normalizeModelName(entry.model)
      const catalogEntry = catalogMap.get(normalized)
      if (!catalogEntry) continue

      totals.set(normalized, (totals.get(normalized) ?? 0) + 1)
      if (entry.status === "error") {
        errors.set(normalized, (errors.get(normalized) ?? 0) + 1)
      }
      if (entry.status === "ok") {
        const list = durations.get(normalized) ?? []
        list.push(entry.durationMs)
        durations.set(normalized, list)
      }
    }

    const speed = catalog.map((entry) => {
      const list = durations.get(entry.key) ?? []
      const avg =
        list.length === 0
          ? 0
          : Math.round(list.reduce((sum, value) => sum + value, 0) / list.length)
      return { model: entry.label, ms: avg }
    })

    const hallucination = catalog.map((entry) => {
      const total = totals.get(entry.key) ?? 0
      const errorCount = errors.get(entry.key) ?? 0
      const percent = total > 0 ? (errorCount / total) * 100 : 0
      return { model: entry.label, percent: Math.round(percent * 10) / 10 }
    })

    return new Response(JSON.stringify({ speed, hallucination }), {
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
