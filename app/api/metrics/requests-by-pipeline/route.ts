import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

const DAY_MS = 24 * 60 * 60 * 1000

const PIPELINE_LABELS = [
  "Standard",
  "Re-ranking",
  "Multi-query",
  "Agent",
] as const

const resolvePipelineLabel = (raw: string | undefined | null) => {
  const normalized = (raw ?? "").toLowerCase()
  if (normalized.includes("rerank")) return "Re-ranking"
  if (normalized.includes("multi")) return "Multi-query"
  if (normalized.includes("agent")) return "Agent"
  return "Standard"
}

export async function GET() {
  try {
    const records = await readOllamaRequests()
    const since = Date.now() - 7 * DAY_MS
    const counts = new Map<string, number>(
      PIPELINE_LABELS.map((label) => [label, 0])
    )

    for (const entry of records) {
      const ts = new Date(entry.createdAt).getTime()
      if (!Number.isFinite(ts) || ts < since) continue
      const label = resolvePipelineLabel(entry.pipeline)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }

    const data = PIPELINE_LABELS.map((label) => ({
      pipeline: label,
      requests: counts.get(label) ?? 0,
    }))

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
