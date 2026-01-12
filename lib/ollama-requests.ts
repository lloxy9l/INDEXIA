import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export type OllamaRequestRecord = {
  id: string
  status: "ok" | "error"
  model: string
  durationMs: number
  createdAt: string
  pipeline?: string
}

const OLLAMA_REQUESTS_PATH = path.join(
  process.cwd(),
  "data",
  "ollama-requests.db"
)
const RETENTION_DAYS = 90

export async function readOllamaRequests(): Promise<OllamaRequestRecord[]> {
  try {
    const raw = await fs.readFile(OLLAMA_REQUESTS_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as OllamaRequestRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

async function writeOllamaRequests(records: OllamaRequestRecord[]) {
  const serialized = JSON.stringify(records, null, 2)
  await fs.mkdir(path.dirname(OLLAMA_REQUESTS_PATH), { recursive: true })
  await fs.writeFile(OLLAMA_REQUESTS_PATH, serialized, "utf8")
}

export async function appendOllamaRequest(record: OllamaRequestRecord) {
  const records = await readOllamaRequests()
  records.push(record)
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  const trimmed = records.filter(
    (entry) => new Date(entry.createdAt).getTime() >= cutoff
  )
  await writeOllamaRequests(trimmed)
}

export function createOllamaRequest(input: {
  status: "ok" | "error"
  model: string
  durationMs: number
  pipeline?: string
}): OllamaRequestRecord {
  return {
    id: randomUUID(),
    status: input.status,
    model: input.model,
    durationMs: input.durationMs,
    createdAt: new Date().toISOString(),
    pipeline: input.pipeline,
  }
}
