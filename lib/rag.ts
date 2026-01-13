import { readChunks, type ChunkRecord } from "@/lib/chunks"
import { readDocuments } from "@/lib/documents"
import { canAccessDocument, type AccessContext } from "@/lib/permissions"

export type RagSource = {
  id: string
  documentId: string
  documentName: string
  text: string
  score: number
}

type RagOptions = {
  limit?: number
  minScore?: number
  maxChars?: number
  access?: AccessContext
}

const DEFAULT_LIMIT = 4
const DEFAULT_MIN_SCORE = 1
const DEFAULT_MAX_CHARS = 1200

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function tokenizeForSearch(value: string): string[] {
  const normalized = normalizeForSearch(value)
  if (!normalized) return []
  const tokens = normalized.split(" ").filter((token) => token.length > 1)
  return Array.from(new Set(tokens))
}

function scoreChunk(chunkText: string, queryTokens: string[], queryText: string): number {
  if (queryTokens.length === 0) return 0
  const lower = chunkText.toLowerCase()
  let score = 0

  for (const token of queryTokens) {
    let index = 0
    while (true) {
      const found = lower.indexOf(token, index)
      if (found === -1) break
      score += token.length >= 6 ? 2 : 1
      index = found + token.length
      if (score > 100) break
    }
  }

  if (queryText && lower.includes(queryText)) {
    score += 4
  }

  return score
}

function trimContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trim()}…`
}

function sortByScoreDesc(a: RagSource, b: RagSource): number {
  if (b.score !== a.score) return b.score - a.score
  return a.text.length - b.text.length
}

function chunkToSource(
  chunk: ChunkRecord,
  score: number,
  maxChars: number
): RagSource {
  return {
    id: chunk.chunk_id,
    documentId: chunk.document_ref,
    documentName: chunk.filename,
    text: trimContext(chunk.text, maxChars),
    score,
  }
}

export async function retrieveRelevantChunks(
  query: string,
  options: RagOptions = {}
): Promise<RagSource[]> {
  const queryTokens = tokenizeForSearch(query)
  const normalizedQuery = normalizeForSearch(query)
  if (queryTokens.length === 0) return []

  const access = options.access
  if (!access) return []

  const [chunks, documents] = await Promise.all([readChunks(), readDocuments()])
  if (chunks.length === 0) return []

  let scopedChunks: ChunkRecord[] = []
  if (access.role === "admin") {
    if (documents.length === 0) {
      scopedChunks = chunks
    } else {
      const allowedDocumentIds = new Set(documents.map((doc) => doc.id))
      scopedChunks = chunks.filter((chunk) => allowedDocumentIds.has(chunk.document_ref))
      if (scopedChunks.length === 0) scopedChunks = chunks
    }
  } else {
    if (documents.length === 0) return []
    const allowedDocumentIds = new Set(
      documents.filter((doc) => canAccessDocument(access, doc)).map((doc) => doc.id)
    )
    if (allowedDocumentIds.size === 0) return []
    scopedChunks = chunks.filter((chunk) => allowedDocumentIds.has(chunk.document_ref))
  }
  if (scopedChunks.length === 0) return []

  const limit = Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT))
  const minScore = Math.max(1, Math.floor(options.minScore ?? DEFAULT_MIN_SCORE))
  const maxChars = Math.max(200, Math.floor(options.maxChars ?? DEFAULT_MAX_CHARS))

  const scored = scopedChunks
    .map((chunk) => {
      const score = scoreChunk(chunk.text, queryTokens, normalizedQuery)
      return score >= minScore ? chunkToSource(chunk, score, maxChars) : null
    })
    .filter((entry): entry is RagSource => Boolean(entry))

  scored.sort(sortByScoreDesc)
  return scored.slice(0, limit)
}
