import { readChunks, type ChunkRecord } from "@/lib/chunks"
import { readDocuments } from "@/lib/documents"
import { canAccessDocument, type AccessContext } from "@/lib/permissions"
import { searchVectorStore } from "@/lib/vector-store"

export type RagSource = {
  id: string
  documentId: string
  documentName: string
  text: string
  score: number
}

export type RagPipeline = "standard" | "rerank" | "multi" | "agent"

type RagOptions = {
  limit?: number
  minScore?: number
  maxChars?: number
  access?: AccessContext
  pipeline?: RagPipeline
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
  const lower = normalizeForSearch(chunkText)
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

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "avec",
  "au",
  "aux",
  "ce",
  "ces",
  "dans",
  "de",
  "des",
  "du",
  "en",
  "et",
  "for",
  "from",
  "is",
  "la",
  "le",
  "les",
  "of",
  "ou",
  "par",
  "pour",
  "sur",
  "the",
  "to",
  "un",
  "une",
  "with",
])

function buildMultiQueries(query: string): string[] {
  const tokens = tokenizeForSearch(query)
  if (tokens.length === 0) return []
  const longTokens = tokens.filter((token) => token.length >= 4)
  const keywords = longTokens.filter((token) => !STOPWORDS.has(token)).slice(0, 6)
  const variants = new Set<string>([query])
  if (keywords.length >= 2) variants.add(keywords.join(" "))
  if (tokens.length >= 3) variants.add(tokens.slice(0, 5).join(" "))
  return Array.from(variants).filter((value) => value.trim().length > 0)
}

function rerankSources(sources: RagSource[], query: string): RagSource[] {
  const queryTokens = tokenizeForSearch(query)
  const normalizedQuery = normalizeForSearch(query)
  const reranked = sources.map((source) => {
    const normalizedText = normalizeForSearch(source.text)
    const tokenHits = queryTokens.filter((token) => normalizedText.includes(token)).length
    const exactBoost = normalizedText.includes(normalizedQuery) ? 6 : 0
    return {
      ...source,
      score: source.score + tokenHits * 2 + exactBoost,
    }
  })
  reranked.sort(sortByScoreDesc)
  return reranked
}

export async function retrieveRagSources(
  query: string,
  options: RagOptions = {}
): Promise<RagSource[]> {
  const pipeline = options.pipeline ?? "standard"
  const limit = Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT))
  const baseOptions = { ...options, limit }

  const retrieveBase = async (input: string) => {
    const vector = await searchVectorStore(input, {
      limit,
      maxChars: options.maxChars ?? DEFAULT_MAX_CHARS,
      access: options.access,
    })
    if (vector.length > 0) return vector
    return retrieveRelevantChunks(input, baseOptions)
  }

  if (pipeline === "standard") {
    return retrieveBase(query)
  }

  if (pipeline === "rerank") {
    const candidates = await retrieveBase(query)
    const expanded = candidates.length >= limit
      ? candidates
      : await retrieveRelevantChunks(query, {
        ...options,
        limit: Math.max(limit * 3, limit),
        minScore: Math.max(1, Math.floor(options.minScore ?? DEFAULT_MIN_SCORE)),
      })
    return rerankSources(expanded, query).slice(0, limit)
  }

  if (pipeline === "multi") {
    const queries = buildMultiQueries(query)
    const results = await Promise.all(
      queries.map((variant) =>
        retrieveBase(variant)
      )
    )
    const merged = new Map<string, RagSource>()
    results.flat().forEach((source) => {
      const existing = merged.get(source.id)
      if (!existing || source.score > existing.score) {
        merged.set(source.id, source)
      }
    })
    return rerankSources(Array.from(merged.values()), query).slice(0, limit)
  }

  const initial = await retrieveBase(query)
  if (initial.length >= limit) {
    return rerankSources(initial, query).slice(0, limit)
  }

  const followUpQuery = [
    query,
    ...initial.map((source) => source.documentName.split(".")[0]),
  ]
    .join(" ")
    .trim()
  const followUp = await retrieveRelevantChunks(followUpQuery, {
    ...options,
    limit: Math.max(limit * 2, limit),
    minScore: 1,
  })
  const combined = new Map<string, RagSource>()
  ;[...initial, ...followUp].forEach((source) => {
    const existing = combined.get(source.id)
    if (!existing || source.score > existing.score) {
      combined.set(source.id, source)
    }
  })
  return rerankSources(Array.from(combined.values()), query).slice(0, limit)
}
