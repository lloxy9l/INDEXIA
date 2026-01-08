export type ChunkMetadata = Record<string, unknown>

export type TextChunk = {
  chunk_id: string
  text: string
  start_char: number
  end_char: number
  token_count: number
  metadata: ChunkMetadata
}

export type IndexedChunk = TextChunk & {
  document_id: number
  filename: string
  chunk_index: number
  created_at: string
}

type Token = {
  value: string
  start: number
  end: number
  isSentenceEnd: boolean
}

type ParagraphInfo = {
  index: number
  text: string
  start: number
  end: number
  token_count: number
  preview: string
}

type OllamaChunkRange = {
  start: number
  end: number
}

export type OllamaChunkingOptions = {
  model?: string
  host?: string
  timeout_ms?: number
  max_paragraphs?: number
  max_chars?: number
}

export type OllamaChunkingResult = {
  chunks: TextChunk[] | null
  used: boolean
  attempted: boolean
  reason?: string
}

export type SemanticChunkingOptions = {
  model?: string
  timeout_ms?: number
  max_paragraphs?: number
  max_chars?: number
  similarity_threshold?: number
  min_tokens?: number
  target_tokens?: number
  max_tokens?: number
}

export type SemanticChunkingResult = {
  chunks: TextChunk[] | null
  used: boolean
  attempted: boolean
  reason?: string
  model?: string
}

const MIN_TOKENS = 50

let bertExtractor: ((input: string | string[], options?: any) => Promise<any>) | null =
  null
let bertExtractorModel: string | null = null
let bertExtractorPromise: Promise<
  ((input: string | string[], options?: any) => Promise<any>) | null
> | null = null

// Chunking helps keep context windows small, speeds retrieval, and makes RAG more precise.
// chunk_size controls how much context each embedding covers: larger = more context, smaller = more granular matches.
// chunk_overlap keeps shared context between chunks, improving continuity across boundaries for RAG queries.
export function chunk_text(
  text: string,
  chunk_size: number = 200,
  chunk_overlap: number = 30
): TextChunk[] {
  if (!text.trim()) {
    return []
  }

  const tokens = tokenize(text)
  if (tokens.length === 0) {
    return []
  }

  const normalizedChunkSize = Math.max(1, Math.floor(chunk_size))
  const normalizedOverlap = Math.max(0, Math.min(chunk_overlap, normalizedChunkSize - 1))
  const chunks: TextChunk[] = []

  let startTokenIndex = 0
  let chunkIndex = 0

  while (startTokenIndex < tokens.length) {
    const maxEnd = Math.min(tokens.length, startTokenIndex + normalizedChunkSize)
    const preferredMinEnd = Math.min(
      tokens.length,
      startTokenIndex + Math.max(1, Math.floor(normalizedChunkSize * 0.6))
    )

    const endTokenIndex = findSentenceBoundary(tokens, preferredMinEnd, maxEnd) ?? maxEnd
    const startChar = tokens[startTokenIndex].start
    const endChar = tokens[endTokenIndex - 1].end
    const chunkText = text.slice(startChar, endChar)
    const tokenCount = endTokenIndex - startTokenIndex

    if (tokenCount >= MIN_TOKENS) {
      chunks.push({
        chunk_id: buildChunkId(chunkIndex),
        text: chunkText,
        start_char: startChar,
        end_char: endChar,
        token_count: tokenCount,
        metadata: {},
      })
      chunkIndex += 1
    }

    if (endTokenIndex >= tokens.length) {
      break
    }

    startTokenIndex = Math.max(0, endTokenIndex - normalizedOverlap)
  }

  return chunks
}

export function prepare_chunks_for_indexing(
  chunks: TextChunk[],
  document_id: number,
  filename: string
): IndexedChunk[] {
  const createdAt = new Date().toISOString()

  return chunks.map((chunk, index) => ({
    ...chunk,
    document_id,
    filename,
    chunk_index: index,
    created_at: createdAt,
  }))
}

export function document_id_from_string(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return Math.max(1, Math.abs(hash))
}

// Optional: paragraph-based chunking to respect structural breaks.
export function chunk_text_by_paragraphs(
  text: string,
  chunk_size: number = 200,
  chunk_overlap: number = 30
): TextChunk[] {
  const paragraphs = split_paragraphs(text)
  if (paragraphs.length === 0) {
    return []
  }

  const tokensPerParagraph = paragraphs.map((paragraph) => tokenize(paragraph).length)
  const normalizedChunkSize = Math.max(1, Math.floor(chunk_size))
  const normalizedOverlap = Math.max(0, Math.min(chunk_overlap, normalizedChunkSize - 1))

  const chunks: TextChunk[] = []
  let startParagraphIndex = 0
  let startTokenOffset = 0
  let chunkIndex = 0

  while (startParagraphIndex < paragraphs.length) {
    let endParagraphIndex = startParagraphIndex
    let tokenCount = 0

    while (endParagraphIndex < paragraphs.length) {
      const nextTokenCount = tokenCount + tokensPerParagraph[endParagraphIndex]
      if (nextTokenCount > normalizedChunkSize && tokenCount > 0) {
        break
      }
      tokenCount = nextTokenCount
      endParagraphIndex += 1
    }

    const selectedParagraphs = paragraphs.slice(startParagraphIndex, endParagraphIndex)
    const chunkText = selectedParagraphs.join("\n\n")
    const tokenizedChunk = tokenize(chunkText)

    if (tokenizedChunk.length >= MIN_TOKENS) {
      const startChar = text.indexOf(selectedParagraphs[0], startTokenOffset)
      const endChar = startChar + chunkText.length

      chunks.push({
        chunk_id: buildChunkId(chunkIndex),
        text: chunkText,
        start_char: startChar,
        end_char: endChar,
        token_count: tokenizedChunk.length,
        metadata: { mode: "paragraph" },
      })
      chunkIndex += 1
      startTokenOffset = endChar
    }

    if (endParagraphIndex >= paragraphs.length) {
      break
    }

    const overlapTokens = Math.max(0, tokenCount - normalizedOverlap)
    let rewindParagraphIndex = endParagraphIndex
    let rewindTokens = tokenCount

    while (rewindParagraphIndex > startParagraphIndex && rewindTokens > overlapTokens) {
      rewindParagraphIndex -= 1
      rewindTokens -= tokensPerParagraph[rewindParagraphIndex]
    }

    startParagraphIndex = rewindParagraphIndex
  }

  return chunks
}

// Optional: normalize whitespace and line breaks before chunking.
export function clean_text(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function clean_pdf_text(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\f/g, "\n")
  const lines = normalized.split("\n")
  const paragraphs: string[] = []
  const recent: string[] = []
  let current = ""

  const pushParagraph = () => {
    const trimmed = current.trim()
    if (trimmed) {
      paragraphs.push(trimmed)
    }
    current = ""
  }

  for (const rawLine of lines) {
    let line = rawLine.trim()
    if (!line) {
      pushParagraph()
      continue
    }

    line = line
      .replace(/[:]{3,}/g, ":")
      .replace(/\s{2,}/g, " ")
      .replace(
        /(\b[\p{L}\p{N}]{2,}\b)(?:\s+\1){2,}/giu,
        "$1"
      )

    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) {
      pushParagraph()
      continue
    }

    if (/^[*\-_]{6,}$/.test(line)) {
      pushParagraph()
      continue
    }

    const separatorMatch = line.match(/(\*{6,}|-{6,}|_{6,})/)
    if (separatorMatch) {
      const parts = line.split(/(\*{6,}|-{6,}|_{6,})/).map((part) => part.trim())
      const before = parts[0]?.replace(/[*\-_]+/g, "").trim() ?? ""
      const after = parts.slice(1).join(" ").replace(/[*\-_]+/g, "").trim()
      if (before) {
        current = current ? `${current} ${before}` : before
      }
      pushParagraph()
      if (after) {
        current = after
      }
      continue
    }

    if (/^(prerequisites|keywords|duration)\s*:/i.test(line)) {
      if (current) {
        pushParagraph()
      }
    } else if (current && line.length <= 80 && /^[A-Z]/.test(line)) {
      pushParagraph()
    }

    const signature = line
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/giu, "")
      .slice(0, 120)
    if (signature) {
      if (recent.includes(signature)) {
        continue
      }
      recent.push(signature)
      if (recent.length > 4) {
        recent.shift()
      }
    }

    const shouldDehyphenate =
      current.endsWith("-") && /^[\p{Ll}]/u.test(line)
    if (shouldDehyphenate) {
      current = current.slice(0, -1) + line
    } else if (current) {
      current += ` ${line}`
    } else {
      current = line
    }
  }

  pushParagraph()

  return clean_text(paragraphs.join("\n\n"))
}

export async function chunk_text_with_ollama(
  text: string,
  chunk_size: number = 200,
  chunk_overlap: number = 30,
  options: OllamaChunkingOptions = {}
): Promise<OllamaChunkingResult> {
  if (!text.trim()) {
    return { chunks: [], used: false, attempted: false, reason: "empty" }
  }

  const normalizedChunkSize = Math.max(1, Math.floor(chunk_size))
  const normalizedOverlap = Math.max(0, Math.min(chunk_overlap, normalizedChunkSize - 1))
  const enabled =
    typeof process !== "undefined" &&
    process.env?.OLLAMA_CHUNKING?.toLowerCase() !== "false" &&
    process.env?.OLLAMA_CHUNKING !== "0"

  if (!enabled) {
    return { chunks: null, used: false, attempted: false, reason: "disabled" }
  }

  const host =
    options.host ??
    (typeof process !== "undefined" ? process.env?.OLLAMA_HOST : undefined) ??
    "http://127.0.0.1:11434"
  const model =
    options.model ??
    (typeof process !== "undefined" ? process.env?.OLLAMA_CHUNKING_MODEL : undefined) ??
    "llama3.2"
  const timeoutMs = normalize_number(
    options.timeout_ms ??
      (typeof process !== "undefined" ? Number(process.env?.OLLAMA_CHUNKING_TIMEOUT_MS) : NaN),
    8000
  )
  const maxParagraphs = normalize_number(
    options.max_paragraphs ??
      (typeof process !== "undefined"
        ? Number(process.env?.OLLAMA_CHUNKING_MAX_PARAGRAPHS)
        : NaN),
    120
  )
  const maxChars = normalize_number(
    options.max_chars ??
      (typeof process !== "undefined"
        ? Number(process.env?.OLLAMA_CHUNKING_MAX_CHARS)
        : NaN),
    12000
  )

  if (text.length > maxChars) {
    return { chunks: null, used: false, attempted: false, reason: "too_long" }
  }

  const paragraphInfos = build_paragraph_infos(text)
  if (paragraphInfos.length === 0) {
    return { chunks: [], used: false, attempted: false, reason: "empty" }
  }

  if (paragraphInfos.length < 2) {
    return {
      chunks: null,
      used: false,
      attempted: false,
      reason: "insufficient_paragraphs",
    }
  }

  if (paragraphInfos.length > maxParagraphs) {
    return {
      chunks: null,
      used: false,
      attempted: false,
      reason: "too_many_paragraphs",
    }
  }

  const maxTokens = Math.max(normalizedChunkSize, Math.round(normalizedChunkSize * 1.2))
  const { system, user } = build_ollama_prompt(paragraphInfos, normalizedChunkSize, maxTokens)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0, num_predict: 256 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      return { chunks: null, used: false, attempted: true, reason: "ollama_error" }
    }

    const payload = await res.json().catch(() => null)
    const content =
      typeof payload?.message?.content === "string" ? payload.message.content : ""
    const ranges = parse_chunk_ranges(content, paragraphInfos.length)

    if (!ranges) {
      return {
        chunks: null,
        used: false,
        attempted: true,
        reason: "invalid_response",
      }
    }

    const withOverlap = apply_paragraph_overlap(ranges, paragraphInfos, normalizedOverlap)
    const chunks = build_chunks_from_ranges(text, paragraphInfos, withOverlap, {
      mode: "ollama",
      model,
    })

    if (chunks.length === 0) {
      return {
        chunks: null,
        used: false,
        attempted: true,
        reason: "empty_chunks",
      }
    }

    return { chunks, used: true, attempted: true }
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError" ? "timeout" : "error"
    return { chunks: null, used: false, attempted: true, reason }
  } finally {
    clearTimeout(timeout)
  }
}

export async function chunk_text_with_bert(
  text: string,
  chunk_size: number = 200,
  chunk_overlap: number = 30,
  options: SemanticChunkingOptions = {}
): Promise<SemanticChunkingResult> {
  if (!text.trim()) {
    return { chunks: [], used: false, attempted: false, reason: "empty" }
  }

  const normalizedChunkSize = Math.max(1, Math.floor(chunk_size))
  const normalizedOverlap = Math.max(0, Math.min(chunk_overlap, normalizedChunkSize - 1))
  const enabled =
    typeof process !== "undefined" &&
    process.env?.SEMANTIC_CHUNKING?.toLowerCase() !== "false" &&
    process.env?.SEMANTIC_CHUNKING !== "0"

  if (!enabled) {
    return { chunks: null, used: false, attempted: false, reason: "disabled" }
  }

  const model =
    options.model ??
    (typeof process !== "undefined" ? process.env?.BERT_CHUNKING_MODEL : undefined) ??
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  const timeoutMs = normalize_number(
    options.timeout_ms ??
      (typeof process !== "undefined" ? Number(process.env?.BERT_CHUNKING_TIMEOUT_MS) : NaN),
    8000
  )
  const maxParagraphs = normalize_number(
    options.max_paragraphs ??
      (typeof process !== "undefined"
        ? Number(process.env?.BERT_CHUNKING_MAX_PARAGRAPHS)
        : NaN),
    80
  )
  const maxChars = normalize_number(
    options.max_chars ??
      (typeof process !== "undefined"
        ? Number(process.env?.BERT_CHUNKING_MAX_CHARS)
        : NaN),
    12000
  )
  const similarityThreshold =
    typeof options.similarity_threshold === "number"
      ? options.similarity_threshold
      : typeof process !== "undefined" && process.env?.BERT_CHUNKING_SIM_THRESHOLD
        ? Number(process.env?.BERT_CHUNKING_SIM_THRESHOLD)
        : 0.62
  const minTokens = Math.max(
    MIN_TOKENS,
    normalize_number(
      options.min_tokens ??
        (typeof process !== "undefined" ? Number(process.env?.BERT_CHUNKING_MIN_TOKENS) : NaN),
      Math.round(normalizedChunkSize * 0.3)
    )
  )
  const targetTokens = Math.max(
    minTokens,
    normalize_number(
      options.target_tokens ??
        (typeof process !== "undefined"
          ? Number(process.env?.BERT_CHUNKING_TARGET_TOKENS)
          : NaN),
      normalizedChunkSize
    )
  )
  const maxTokens = Math.max(
    targetTokens,
    normalize_number(
      options.max_tokens ??
        (typeof process !== "undefined" ? Number(process.env?.BERT_CHUNKING_MAX_TOKENS) : NaN),
      Math.round(normalizedChunkSize * 1.4)
    )
  )

  if (text.length > maxChars) {
    return { chunks: null, used: false, attempted: false, reason: "too_long" }
  }

  const paragraphInfos = build_paragraph_infos(text)
  if (paragraphInfos.length === 0) {
    return { chunks: [], used: false, attempted: false, reason: "empty" }
  }

  if (paragraphInfos.length > maxParagraphs) {
    return {
      chunks: null,
      used: false,
      attempted: false,
      reason: "too_many_paragraphs",
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const extractor = await get_bert_extractor(model)
    if (!extractor) {
      return { chunks: null, used: false, attempted: true, reason: "model_load_failed" }
    }

    const texts = paragraphInfos.map((paragraph) => paragraph.text)
    const rawEmbeddings = await extractor(texts, {
      pooling: "mean",
      normalize: true,
      signal: controller.signal,
    })
    const embeddings = normalize_embedding_output(rawEmbeddings)

    if (!embeddings || embeddings.length !== paragraphInfos.length) {
      return { chunks: null, used: false, attempted: true, reason: "embedding_failed" }
    }

    const ranges = build_semantic_ranges(
      paragraphInfos,
      embeddings,
      similarityThreshold,
      minTokens,
      targetTokens,
      maxTokens
    )

    if (ranges.length === 0) {
      return { chunks: null, used: false, attempted: true, reason: "empty_ranges" }
    }

    const withOverlap = apply_paragraph_overlap(ranges, paragraphInfos, normalizedOverlap)
    const chunks = build_chunks_from_ranges(text, paragraphInfos, withOverlap, {
      mode: "semantic-bert",
      model,
      similarity_threshold: similarityThreshold,
    })

    if (chunks.length === 0) {
      return { chunks: null, used: false, attempted: true, reason: "empty_chunks" }
    }

    return { chunks, used: true, attempted: true, model }
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError" ? "timeout" : "error"
    return { chunks: null, used: false, attempted: true, reason }
  } finally {
    clearTimeout(timeout)
  }
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const wordRegex = /\S+/g
  let match: RegExpExecArray | null

  while ((match = wordRegex.exec(text)) !== null) {
    const value = match[0]
    const start = match.index
    const end = match.index + value.length
    tokens.push({
      value,
      start,
      end,
      isSentenceEnd: /[.!?]$/.test(value),
    })
  }

  return tokens
}

function findSentenceBoundary(tokens: Token[], minEnd: number, maxEnd: number): number | null {
  for (let i = maxEnd - 1; i >= minEnd; i -= 1) {
    if (tokens[i].isSentenceEnd) {
      return i + 1
    }
  }
  return null
}

function buildChunkId(index: number): string {
  const randomId =
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : null

  return randomId ?? `chunk-${index + 1}`
}

function split_paragraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return []
  }
  return trimmed.split(/\n\s*\n/)
}

function build_paragraph_infos(text: string): ParagraphInfo[] {
  const paragraphs = split_paragraphs(text)
  if (paragraphs.length === 0) {
    return []
  }

  const infos: ParagraphInfo[] = []
  let cursor = 0

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    let start = text.indexOf(paragraph, cursor)
    if (start === -1) {
      start = text.indexOf(paragraph)
    }
    if (start === -1) {
      start = cursor
    }
    const end = start + paragraph.length
    cursor = Math.max(cursor, end)

    infos.push({
      index,
      text: paragraph,
      start,
      end,
      token_count: tokenize(paragraph).length,
      preview: normalize_preview(paragraph),
    })
  }

  return infos
}

function normalize_preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 180)
}

function build_ollama_prompt(
  paragraphs: ParagraphInfo[],
  targetTokens: number,
  maxTokens: number
) {
  const totalTokens = paragraphs.reduce((acc, paragraph) => acc + paragraph.token_count, 0)
  const lines = paragraphs.map(
    (paragraph) => `${paragraph.index} | ${paragraph.token_count} | ${paragraph.preview}`
  )

  return {
    system:
      "You split documents into retrieval chunks using paragraph boundaries. " +
      "Return JSON only: an array of objects with start/end paragraph indices.",
    user:
      `Rules:\n` +
      `- Use contiguous paragraph ranges (0-based indices).\n` +
      `- Cover all paragraphs with no gaps or overlaps.\n` +
      `- Aim for about ${targetTokens} tokens per chunk (max ${maxTokens}).\n` +
      `- Avoid tiny chunks; merge short paragraphs with neighbors when possible.\n` +
      `- Keep headings with the following content, not alone.\n` +
      `- Prefer coherent topic boundaries over strict size.\n` +
      `- Keep topics coherent when choosing boundaries.\n` +
      `Return only JSON, no extra text.\n\n` +
      `Paragraphs (index | tokens | preview):\n` +
      lines.join("\n") +
      `\n\nTotal tokens: ${totalTokens}\n`,
  }
}

function parse_chunk_ranges(
  content: string,
  paragraphCount: number
): OllamaChunkRange[] | null {
  const parsed = parse_json_array(content)
  if (!parsed) {
    return null
  }

  const ranges: OllamaChunkRange[] = []

  for (const entry of parsed) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const start = Number(entry[0])
      const end = Number(entry[1])
      if (Number.isFinite(start) && Number.isFinite(end)) {
        ranges.push({ start, end })
      }
      continue
    }
    if (entry && typeof entry === "object") {
      const start = Number((entry as { start?: unknown }).start)
      const end = Number((entry as { end?: unknown }).end)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        ranges.push({ start, end })
      }
    }
  }

  if (ranges.length === 0) {
    return null
  }

  const ordered = [...ranges].sort((a, b) => a.start - b.start)

  if (ordered[0].start !== 0) {
    return null
  }

  for (let i = 0; i < ordered.length; i += 1) {
    const range = ordered[i]
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end)) {
      return null
    }
    if (range.start < 0 || range.end < range.start || range.end >= paragraphCount) {
      return null
    }
    if (i > 0 && range.start !== ordered[i - 1].end + 1) {
      return null
    }
  }

  if (ordered[ordered.length - 1].end !== paragraphCount - 1) {
    return null
  }

  return ordered
}

function parse_json_array(content: string): unknown[] | null {
  const trimmed = content.trim()
  const direct = safe_json_parse(trimmed)
  if (Array.isArray(direct)) {
    return direct
  }
  const start = trimmed.indexOf("[")
  const end = trimmed.lastIndexOf("]")
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  const extracted = trimmed.slice(start, end + 1)
  const parsed = safe_json_parse(extracted)
  return Array.isArray(parsed) ? parsed : null
}

function safe_json_parse(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function apply_paragraph_overlap(
  ranges: OllamaChunkRange[],
  paragraphs: ParagraphInfo[],
  overlapTokens: number
): OllamaChunkRange[] {
  if (!Number.isFinite(overlapTokens) || overlapTokens <= 0) {
    return ranges
  }

  return ranges.map((range, index) => {
    if (index === 0) {
      return range
    }
    let start = range.start
    let tokens = 0
    while (start > 0 && tokens < overlapTokens) {
      start -= 1
      tokens += paragraphs[start].token_count
    }
    return { start, end: range.end }
  })
}

function build_chunks_from_ranges(
  text: string,
  paragraphs: ParagraphInfo[],
  ranges: OllamaChunkRange[],
  metadata: ChunkMetadata
): TextChunk[] {
  const chunks: TextChunk[] = []
  let chunkIndex = 0

  for (const range of ranges) {
    const startParagraph = paragraphs[range.start]
    const endParagraph = paragraphs[range.end]
    if (!startParagraph || !endParagraph) {
      continue
    }

    const startChar = startParagraph.start
    const endChar = endParagraph.end
    const chunkText = text.slice(startChar, endChar)
    const tokenCount = tokenize(chunkText).length

    if (tokenCount >= MIN_TOKENS) {
      chunks.push({
        chunk_id: buildChunkId(chunkIndex),
        text: chunkText,
        start_char: startChar,
        end_char: endChar,
        token_count: tokenCount,
        metadata,
      })
      chunkIndex += 1
    }
  }

  return chunks
}

function normalize_number(value: number, fallback: number): number {
  if (Number.isFinite(value) && value > 0) {
    return value
  }
  return fallback
}

async function get_bert_extractor(model: string) {
  if (bertExtractor && bertExtractorModel === model) {
    return bertExtractor
  }
  if (bertExtractorPromise && bertExtractorModel === model) {
    return bertExtractorPromise
  }

  bertExtractorModel = model
  bertExtractorPromise = (async () => {
    try {
      const transformers = await import("@xenova/transformers")
      if (transformers?.env) {
        transformers.env.allowLocalModels = true
        transformers.env.allowRemoteModels = true
      }
      const extractor = await transformers.pipeline("feature-extraction", model)
      bertExtractor = extractor
      return extractor
    } catch {
      bertExtractor = null
      return null
    } finally {
      bertExtractorPromise = null
    }
  })()

  return bertExtractorPromise
}

function normalize_embedding_output(raw: any): number[][] | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []
    if (Array.isArray(raw[0])) {
      return raw as number[][]
    }
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

function build_semantic_ranges(
  paragraphs: ParagraphInfo[],
  embeddings: number[][],
  threshold: number,
  minTokens: number,
  targetTokens: number,
  maxTokens: number
): OllamaChunkRange[] {
  const ranges: OllamaChunkRange[] = []
  let startIndex = 0
  let tokenCount = 0

  for (let i = 0; i < paragraphs.length; i += 1) {
    tokenCount += paragraphs[i].token_count
    const nextSim =
      i < paragraphs.length - 1
        ? cosine_similarity(embeddings[i], embeddings[i + 1])
        : null
    const shouldSplitBySimilarity =
      nextSim !== null && nextSim < threshold && tokenCount >= minTokens
    const shouldSplitBySize = tokenCount >= maxTokens
    const shouldSplit =
      shouldSplitBySize ||
      (tokenCount >= targetTokens && shouldSplitBySimilarity)

    if (shouldSplit || i === paragraphs.length - 1) {
      ranges.push({ start: startIndex, end: i })
      startIndex = i + 1
      tokenCount = 0
    }
  }

  return ranges
}

function cosine_similarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return dot / Math.sqrt(normA * normB)
}

/*
Example usage:

const rawText = `
Chunking splits a document into coherent blocks to improve retrieval quality.
It helps surface the most relevant passages for a RAG pipeline.

We avoid cutting in the middle of a sentence when possible.
`.trim()

const cleaned = clean_text(rawText)
const chunks = chunk_text(cleaned, 120, 20)
const indexedChunks = prepare_chunks_for_indexing(chunks, 42, "guide-rag.txt")

console.log(indexedChunks.slice(0, 3))
*/
