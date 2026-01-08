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

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "N/A"
  const KB = 1024
  const MB = KB * 1024
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`
  return `${bytes} B`
}

function sanitizeFilename(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_")
  return safe || `fichier-${Date.now()}`
}

function isSupportedTextFile(fileName: string) {
  return supportedTextExtensions.has(path.extname(fileName).toLowerCase())
}

function isPdfFile(fileName: string) {
  return supportedPdfExtensions.has(path.extname(fileName).toLowerCase())
}

async function extractTextFromBuffer(buffer: Buffer, fileName: string) {
  if (isPdfFile(fileName)) {
    const parser = new PDFParse({ data: buffer, disableWorker: true })
    try {
      const parsed = await parser.getText()
      return parsed.text || ""
    } finally {
      await parser.destroy()
    }
  }
  return buffer.toString("utf8")
}

function toApiDoc(doc: DocumentRecord) {
  return {
    ...doc,
    size: formatFileSize(doc.size),
  }
}

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true })
}

async function buildFilePath(originalName: string) {
  const safeName = sanitizeFilename(originalName)
  const parsed = path.parse(safeName)
  let candidate = safeName
  let index = 1
  while (true) {
    try {
      await fs.access(path.join(uploadDir, candidate))
      candidate = `${parsed.name}-${index}${parsed.ext}`
      index += 1
    } catch {
      return path.join(uploadDir, candidate)
    }
  }
}

export async function GET() {
  try {
    await ensureUploadDir()
    const [entries, storedDocuments] = await Promise.all([
      fs.readdir(uploadDir, { withFileTypes: true }),
      readDocuments(),
    ])

    let documents: DocumentRecord[] = [...storedDocuments]
    let updated = false

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const filePath = path.join(uploadDir, entry.name)
      const stats = await fs.stat(filePath)
      const ext = path.extname(entry.name).replace(".", "").toUpperCase()
      const id = `DOC-FS-${entry.name}`
      const existing = documents.find((doc) => doc.id === id || doc.storedName === entry.name)

      if (!existing) {
        const record: DocumentRecord = {
          id,
          name: entry.name,
          storedName: entry.name,
          type: ext || "FILE",
          category: "Import",
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          uploader: "Upload dashboard",
          confidentiality: "Public interne",
          status: "Stocké",
        }
        documents.push(record)
        updated = true
      } else if (!existing.storedName) {
        documents = upsertDocument(documents, { ...existing, storedName: entry.name })
        updated = true
      }
    }

    const filenames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name))
    const filtered = documents.filter((doc) => filenames.has(doc.storedName || doc.name))
    if (filtered.length !== documents.length) {
      documents = filtered
      updated = true
    }

    if (updated) {
      await writeDocuments(documents)
    }

    const payload = documents.map(toApiDoc)
    return NextResponse.json({ documents: payload })
  } catch (error) {
    console.error("Erreur lors de la lecture des documents", error)
    return NextResponse.json(
      { error: "Impossible de lister les documents" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File)

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }
    if (files.length > 10) {
      return NextResponse.json(
        { error: "Limite de 10 fichiers par requête" },
        { status: 400 }
      )
    }

    const category =
      typeof formData.get("category") === "string"
        ? (formData.get("category") as string)
        : "Non classé"
    const uploader =
      typeof formData.get("uploader") === "string" && formData.get("uploader")
        ? String(formData.get("uploader"))
        : "Dashboard"
    const confidentiality =
      typeof formData.get("confidentiality") === "string"
        ? (formData.get("confidentiality") as string)
        : "Public interne"

    await ensureUploadDir()
    const existingDocuments = await readDocuments()
    let existingChunks = await readChunks()
    let chunksUpdated = false

    const documents = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const filePath = await buildFilePath(file.name)
        const storedName = path.basename(filePath)
        await fs.writeFile(filePath, buffer)

        let status: DocumentRecord["status"] = "Stocké"

        if (isSupportedTextFile(storedName) || isPdfFile(storedName)) {
          try {
            const extracted = await extractTextFromBuffer(buffer, storedName)
            const cleaned = isPdfFile(storedName)
              ? clean_pdf_text(extracted)
              : clean_text(extracted)
            const semanticResult = await chunk_text_with_bert(cleaned)
            const chunks =
              semanticResult.used && semanticResult.chunks
                ? semanticResult.chunks
                : chunk_text(cleaned)
            if (chunks.length > 0) {
              const indexedChunks = prepare_chunks_for_indexing(
                chunks,
                document_id_from_string(`DOC-FS-${storedName}`),
                storedName
              )
              const chunkRecords = indexedChunks.map((chunk) => ({
                ...chunk,
                document_ref: `DOC-FS-${storedName}`,
              }))
              existingChunks = replaceChunksForDocument(
                existingChunks,
                `DOC-FS-${storedName}`,
                chunkRecords
              )
              chunksUpdated = true
              status = "Indexé"
            } else {
              status = "Erreur"
            }
          } catch {
            status = "Erreur"
          }
        }

        const record: DocumentRecord = {
          id: `DOC-FS-${storedName}`,
          name: storedName,
          storedName,
          type:
            path.extname(storedName).replace(".", "").toUpperCase() ||
            file.type ||
            "FILE",
          category,
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
          uploader,
          confidentiality,
          status,
        }

        return record
      })
    )

    const merged = documents.reduce(
      (acc, record) => upsertDocument(acc, record),
      existingDocuments
    )
    await writeDocuments(merged)
    if (chunksUpdated) {
      await writeChunks(existingChunks)
    }

    return NextResponse.json({ documents: documents.map(toApiDoc) })
  } catch (error) {
    console.error("Erreur lors de l'upload des documents", error)
    return NextResponse.json(
      { error: "Upload impossible pour le moment" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const id =
      typeof body?.id === "string" && body.id.trim().length ? body.id.trim() : ""
    const name =
      typeof body?.name === "string" && body.name.trim().length ? body.name.trim() : ""

    if (!id && !name) {
      return NextResponse.json(
        { error: "id ou name requis" },
        { status: 400 }
      )
    }

    await ensureUploadDir()
    const documents = await readDocuments()
    const target =
      documents.find((doc) => doc.id === id) ||
      documents.find((doc) => doc.name === name) ||
      documents.find((doc) => doc.storedName === name)

    if (!target) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 }
      )
    }

    const fileName = target.storedName || target.name
    const filePath = path.join(uploadDir, fileName)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Erreur lors de la suppression du fichier", error)
      }
    }

    const nextDocs = documents.filter((doc) => doc.id !== target.id)
    await writeDocuments(nextDocs)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression du document", error)
    return NextResponse.json(
      { error: "Suppression impossible pour le moment" },
      { status: 500 }
    )
  }
}
