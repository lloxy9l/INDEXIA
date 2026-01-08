import fs from "fs/promises"
import path from "path"
import { pathToFileURL } from "url"
import { NextResponse } from "next/server"

import {
  readDocuments,
  upsertDocument,
  writeDocuments,
  type DocumentRecord,
} from "@/lib/documents"
import {
  chunk_text,
  clean_text,
  document_id_from_string,
  prepare_chunks_for_indexing,
  clean_pdf_text,
  chunk_text_with_bert,
} from "@/lib/chunking"
import { readChunks, replaceChunksForDocument, writeChunks } from "@/lib/chunks"
import { PDFParse } from "pdf-parse"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "data", "documents")
const pdfWorkerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
).href

PDFParse.setWorker(pdfWorkerSrc)
const supportedTextExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".log",
])
const supportedPdfExtensions = new Set([".pdf"])

function normalizeName(value: string | null) {
  if (!value) return null
  const withoutPrefix = value.replace(/^DOC-FS-/, "")
  return path.basename(withoutPrefix)
}

function resolveDocument(
  documents: DocumentRecord[],
  id: string,
  nameFromQuery: string | null
): DocumentRecord | null {
  const fromId = normalizeName(id)
  const fromQuery = normalizeName(nameFromQuery)

  return (
    documents.find(
      (doc) =>
        doc.id === id ||
        doc.name === nameFromQuery ||
        doc.storedName === nameFromQuery ||
        doc.name === fromId ||
        doc.storedName === fromId ||
        doc.name === fromQuery ||
        doc.storedName === fromQuery
    ) || null
  )
}

function isSupportedTextFile(fileName: string) {
  return supportedTextExtensions.has(path.extname(fileName).toLowerCase())
}

function isPdfFile(fileName: string) {
  return supportedPdfExtensions.has(path.extname(fileName).toLowerCase())
}

async function extractTextFromFile(filePath: string, fileName: string) {
  if (isPdfFile(fileName)) {
    const buffer = await fs.readFile(filePath)
    const parser = new PDFParse({ data: buffer, disableWorker: true })
    try {
      const parsed = await parser.getText()
      return parsed.text || ""
    } finally {
      await parser.destroy()
    }
  }
  return fs.readFile(filePath, "utf8")
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url)
    const resolvedParams = await params
    const rawId =
      resolvedParams?.id ?? url.pathname.split("/").filter(Boolean).pop() ?? ""
    const id = decodeURIComponent(rawId)

    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }

    const documents = await readDocuments()
    const document = resolveDocument(documents, id, url.searchParams.get("name"))

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const allChunks = await readChunks()
    const chunks = allChunks.filter((chunk) => chunk.document_ref === document.id)

    return NextResponse.json({
      documentId: document.id,
      chunks: chunks.map((chunk) => ({
        id: chunk.chunk_id,
        preview: chunk.text.slice(0, 160),
        text: chunk.text,
        token_count: chunk.token_count,
        created_at: chunk.created_at,
      })),
    })
  } catch (error) {
    console.error("Erreur lors de la lecture des chunks", error)
    return NextResponse.json(
      { error: "Impossible de charger les chunks" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url)
    const resolvedParams = await params
    const rawId =
      resolvedParams?.id ?? url.pathname.split("/").filter(Boolean).pop() ?? ""
    const id = decodeURIComponent(rawId)

    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const chunkSize = Number.isFinite(body?.chunkSize) ? Number(body.chunkSize) : 500
    const chunkOverlap = Number.isFinite(body?.chunkOverlap)
      ? Number(body.chunkOverlap)
      : 50

    const documents = await readDocuments()
    const document = resolveDocument(documents, id, url.searchParams.get("name"))

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const storedName = document.storedName || document.name
    if (!isSupportedTextFile(storedName) && !isPdfFile(storedName)) {
      return NextResponse.json(
        { error: "Type de fichier non supporte (texte/PDF uniquement)" },
        { status: 400 }
      )
    }

    const filePath = path.join(uploadDir, storedName)
    const rawText = await extractTextFromFile(filePath, storedName)
    const cleaned = isPdfFile(storedName)
      ? clean_pdf_text(rawText)
      : clean_text(rawText)
    const semanticResult = await chunk_text_with_bert(
      cleaned,
      chunkSize,
      chunkOverlap
    )
    const chunks =
      semanticResult.used && semanticResult.chunks
        ? semanticResult.chunks
        : chunk_text(cleaned, chunkSize, chunkOverlap)

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Document trop court pour le chunking" },
        { status: 400 }
      )
    }

    const indexedChunks = prepare_chunks_for_indexing(
      chunks,
      document_id_from_string(document.id),
      storedName
    )
    const chunkRecords = indexedChunks.map((chunk) => ({
      ...chunk,
      document_ref: document.id,
    }))

    const existingChunks = await readChunks()
    const nextChunks = replaceChunksForDocument(
      existingChunks,
      document.id,
      chunkRecords
    )
    await writeChunks(nextChunks)

    const updated: DocumentRecord = {
      ...document,
      status: "Indexé",
    }
    await writeDocuments(upsertDocument(documents, updated))

    return NextResponse.json({
      documentId: document.id,
      chunks: chunkRecords.length,
      chunkSize,
      chunkOverlap,
      semantic: {
        used: semanticResult.used,
        attempted: semanticResult.attempted,
        reason: semanticResult.reason ?? null,
        model: semanticResult.model ?? null,
      },
    })
  } catch (error) {
    console.error("Erreur lors du chunking", error)
    return NextResponse.json(
      { error: "Chunking impossible pour le moment" },
      { status: 500 }
    )
  }
}
