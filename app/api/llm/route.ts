const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"

export async function POST(req: Request) {
  try {
    const { messages, model = "llama3.2" } = await req.json()
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return new Response(
        JSON.stringify({
          error: "Ollama error",
          details: errorText,
          status: res.status,
        }),
        { status: 500 }
      )
    }

    if (!res.body) {
      return new Response(
        JSON.stringify({ error: "Flux Ollama manquant" }),
        { status: 500 }
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
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
