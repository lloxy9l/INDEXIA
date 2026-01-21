import { IndexFlatIP } from "faiss-node"
import { promises as fs } from "fs"
import path from "path"

import { readChunks } from "@/lib/chunks"
import { readDocuments } from "@/lib/documents"
import { canAccessDocument, type AccessContext } from "@/lib/permissions"
import type { RagSource } from "@/lib/rag"

const INDEX_PATH = path.join(process.cwd(), "data", "faiss.index")
const META_PATH = path.join(process.cwd(), "data", "faiss.meta.json")
const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2"
const BATCH_SIZE = 16

type IndexMeta = {
  model: string
  dim: number
  chunkCount: number
  chunksMtimeMs: number
  createdAt: string
  chunks: Array<{
    id: string
    documentId: string
    documentName: string
    text: string
  }>
}

let cachedIndex: IndexFlatIP | null = null
let cachedMeta: IndexMeta | null = null
let indexPromise: Promise<IndexFlatIP | null> | null = null
let embedderPromise: Promise<any> | null = null
let embedderModel = ""

async function getEmbedder(model: string) {
  if (embedderPromise && embedderModel === model) return embedderPromise
  embedderModel = model
  embedderPromise = (async () => {
    try {
      const transformers = await import("@xenova/transformers")
      if (transformers?.env) {
        transformers.env.allowLocalModels = true
        transformers.env.allowRemoteModels = true
      }
      return transformers.pipeline("feature-extraction", model)
    } catch {
      return null
    }
  })()
  return embedderPromise
}

function normalizeEmbeddingOutput(raw: any): number[][] | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []
    if (Array.isArray(raw[0])) return raw as number[][]
    if (raw[0] instanceof Float32Array) {
      return (raw as Float32Array[]).map((row) => Array.from(row))
    }
  }
  if (raw && typeof raw.tolist === "function") {
    const list = raw.tolist()
    if (Array.isArray(list) && Array.isArray(list[0])) {
      return list as number[][]
    }
  }
  return null
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder(EMBED_MODEL)
  if (!embedder) return []
  const raw = await embedder(texts, { pooling: "mean", normalize: true })
  const normalized = normalizeEmbeddingOutput(raw)
  return normalized ?? []
}

async function readMeta(): Promise<IndexMeta | null> {
  try {
    const raw = await fs.readFile(META_PATH, "utf8")
    if (!raw.trim()) return null
    return JSON.parse(raw) as IndexMeta
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    return null
  }
}

async function loadIndexFromDisk(): Promise<IndexFlatIP | null> {
  const [meta, chunksStat] = await Promise.all([
    readMeta(),
    fs.stat(path.join(process.cwd(), "data", "chunks.db")).catch(() => null),
  ])
  if (!meta || !chunksStat) return null
  if (meta.model !== EMBED_MODEL) return null
  if (meta.chunksMtimeMs !== chunksStat.mtimeMs) return null

  try {
    const index = IndexFlatIP.read(INDEX_PATH)
    cachedMeta = meta
    cachedIndex = index
    return index
  } catch {
    return null
  }
}

async function buildIndex(): Promise<IndexFlatIP | null> {
  const chunks = await readChunks()
  if (chunks.length === 0) return null

  const metaChunks = chunks.map((chunk) => ({
    id: chunk.chunk_id,
    documentId: chunk.document_ref,
    documentName: chunk.filename,
    text: chunk.text,
  }))

  let index: IndexFlatIP | null = null
  let dim = 0
  for (let start = 0; start < metaChunks.length; start += BATCH_SIZE) {
    const slice = metaChunks.slice(start, start + BATCH_SIZE)
    const embeddings = await embedTexts(slice.map((item) => item.text))
    if (embeddings.length === 0) continue
    if (!index) {
      dim = embeddings[0]?.length ?? 0
      if (!dim) return null
      index = new IndexFlatIP(dim)
    }
    const flat = embeddings.flat()
    index.add(flat)
  }

  if (!index || !dim) return null

  const chunksStat = await fs
    .stat(path.join(process.cwd(), "data", "chunks.db"))
    .catch(() => null)
  const meta: IndexMeta = {
    model: EMBED_MODEL,
    dim,
    chunkCount: metaChunks.length,
    chunksMtimeMs: chunksStat?.mtimeMs ?? Date.now(),
    createdAt: new Date().toISOString(),
    chunks: metaChunks,
  }

  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true })
  index.write(INDEX_PATH)
  await fs.writeFile(META_PATH, JSON.stringify(meta, null, 2), "utf8")

  cachedIndex = index
  cachedMeta = meta
  return index
}

async function ensureIndex(): Promise<IndexFlatIP | null> {
  if (cachedIndex && cachedMeta) {
    const chunksStat = await fs
      .stat(path.join(process.cwd(), "data", "chunks.db"))
      .catch(() => null)
    if (chunksStat && cachedMeta.chunksMtimeMs === chunksStat.mtimeMs) {
      return cachedIndex
    }
    cachedIndex = null
    cachedMeta = null
  }
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    const loaded = await loadIndexFromDisk()
    if (loaded) return loaded
    return buildIndex()
  })()
  const resolved = await indexPromise
  indexPromise = null
  return resolved
}

function trimContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trim()}…`
}

export async function searchVectorStore(
  query: string,
  {
    limit = 4,
    maxChars = 1200,
    access,
  }: { limit?: number; maxChars?: number; access?: AccessContext } = {}
): Promise<RagSource[]> {
  if (!access) return []
  const index = await ensureIndex()
  if (!index || !cachedMeta) return []

  const queryEmbedding = await embedTexts([query])
  if (queryEmbedding.length === 0) return []

  const k = Math.max(limit * 4, limit)
  const result = index.search(queryEmbedding.flat(), k)

  const documents = await readDocuments()
  const docMap = new Map(documents.map((doc) => [doc.id, doc]))

  const sources: RagSource[] = []
  result.labels.forEach((label, idx) => {
    if (label < 0) return
    const metaChunk = cachedMeta?.chunks[label]
    if (!metaChunk) return
    if (access.role !== "admin") {
      const doc = docMap.get(metaChunk.documentId)
      if (!doc || !canAccessDocument(access, doc)) return
    }
    sources.push({
      id: metaChunk.id,
      documentId: metaChunk.documentId,
      documentName: metaChunk.documentName,
      text: trimContext(metaChunk.text, maxChars),
      score: result.distances[idx] ?? 0,
    })
  })

  return sources.slice(0, limit)
}
