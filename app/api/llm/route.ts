const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"

const jsonHeaders = { "Content-Type": "application/json" }

const normalizeModelName = (name: string) => name.split(":")[0].toLowerCase()
const FIXED_MODELS = ["llama3.2", "qwen3:4b"]

const listLocalModels = async () => {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`)
    if (!res.ok) return null
    const payload = await res.json().catch(() => null)
    if (!payload || !Array.isArray(payload.models)) return null
    return payload.models
      .map((entry: any) => (typeof entry?.name === "string" ? entry.name : ""))
      .filter(Boolean)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await req.json().catch(() => ({}))
    const url = new URL(req.url)
    const modelFromQuery = url.searchParams.get("model")
    const requestedModel =
      (typeof modelFromQuery === "string" && modelFromQuery.trim()) ||
      (typeof parsed?.model === "string" && parsed.model.trim()) ||
      "llama3.2"
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : []

    const availableModels = await listLocalModels()
    const modelAvailable =
      !availableModels ||
      availableModels.some(
        (name: string) => normalizeModelName(name) === normalizeModelName(requestedModel)
      )

    if (!modelAvailable) {
      return new Response(
        JSON.stringify({
          error: `Le modèle "${requestedModel}" n'est pas disponible localement. Téléchargez-le avec "ollama pull ${requestedModel}" puis réessayez.`,
          code: "MODEL_NOT_AVAILABLE",
        }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: requestedModel, messages, stream: true }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      const baseError =
        res.status === 404 || /not found/i.test(errorText)
          ? {
              error: `Le modèle "${requestedModel}" n'est pas disponible localement. Téléchargez-le avec "ollama pull ${requestedModel}" puis réessayez.`,
              code: "MODEL_NOT_AVAILABLE",
            }
          : { error: "Ollama error", details: errorText, status: res.status }
      return new Response(JSON.stringify(baseError), {
        status: baseError.code === "MODEL_NOT_AVAILABLE" ? 400 : 500,
        headers: jsonHeaders,
      })
    }

    if (!res.body) {
      return new Response(
        JSON.stringify({ error: "Flux Ollama manquant" }),
        { status: 500, headers: jsonHeaders }
      )
    }

    // Renvoie le flux NDJSON tel quel pour un rendu temps-réel côté client.
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
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

export async function GET() {
  try {
    const installed = await listLocalModels()
    const catalog = FIXED_MODELS
    return new Response(JSON.stringify({ models: catalog, installed: installed ?? [] }), {
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
