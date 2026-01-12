import { LLM_CATALOG, modelKeyFromName, normalizeModelName } from "@/lib/llm-catalog"
import { readOllamaRequests } from "@/lib/ollama-requests"

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export async function GET() {
  try {
    const catalog = LLM_CATALOG.map((value) => ({
      value,
      label: value,
      key: modelKeyFromName(value),
    }))
    const catalogMap = new Map(
      catalog.map((entry) => [normalizeModelName(entry.value), entry])
    )
    const records = await readOllamaRequests()
    const served = records.filter((entry) => entry.status === "ok")
    const counts: Record<string, number> = Object.fromEntries(
      catalog.map((entry) => [entry.key, 0])
    )

    for (const entry of served) {
      const normalized = normalizeModelName(entry.model)
      const catalogEntry = catalogMap.get(normalized)
      if (!catalogEntry) continue
      counts[catalogEntry.key] += 1
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    const values = catalog.map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: total > 0 ? Math.round((counts[entry.key] / total) * 100) : 0,
    }))

    if (total > 0) {
      const sum = values.reduce((acc, entry) => acc + entry.value, 0)
      const diff = 100 - sum
      if (diff !== 0) {
        const maxIndex = values.reduce(
          (best, entry, index) =>
            entry.value > values[best].value ? index : best,
          0
        )
        values[maxIndex].value += diff
      }
    }

    return new Response(JSON.stringify({ data: values }), {
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
