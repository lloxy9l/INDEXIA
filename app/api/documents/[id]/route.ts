import fs from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

import { readDocuments } from "@/lib/documents"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "data", "documents")

function normalizeName(value: string | null) {
  if (!value) return null
  const withoutPrefix = value.replace(/^DOC-FS-/, "")
  return path.basename(withoutPrefix)
}

function guessMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case ".txt":
      return "text/plain"
    case ".pdf":
      return "application/pdf"
    case ".doc":
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case ".xls":
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    case ".csv":
      return "text/csv"
    case ".json":
      return "application/json"
    default:
      return "application/octet-stream"
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url)
    const lastSegment = url.pathname.split("/").filter(Boolean).pop()
    const resolvedParams = await params
    const rawId = resolvedParams?.id ?? lastSegment ?? ""
    const id = decodeURIComponent(rawId)
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }

    const nameFromQuery = url.searchParams.get("name")
    const fromId = normalizeName(id)
    const fromQuery = normalizeName(nameFromQuery)

    const documents = await readDocuments()
    const fromDb = documents.find(
      (doc) =>
        doc.id === id ||
        doc.name === nameFromQuery ||
        doc.storedName === nameFromQuery ||
        doc.name === fromId ||
        doc.storedName === fromId
    )
    const dbCandidates = fromDb
      ? [
          normalizeName(fromDb.storedName),
          normalizeName(fromDb.name),
        ]
      : []

    const candidates = [fromId, fromQuery, ...dbCandidates].filter(Boolean) as string[]
    await fs.mkdir(uploadDir, { recursive: true })

    let fileBuffer: Buffer | null = null
    let fileName = ""

    for (const candidate of candidates) {
      const filePath = path.join(uploadDir, candidate)
      try {
        fileBuffer = await fs.readFile(filePath)
        fileName = candidate
        break
      } catch {
        // try next candidate
      }
    }

    if (!fileBuffer || !fileName) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": guessMimeType(fileName),
        "Content-Length": fileBuffer.byteLength.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error("Erreur lors du téléchargement du fichier", error)
    return NextResponse.json(
      { error: "Fichier introuvable" },
      { status: 404 }
    )
  }
}
