import fs from "fs/promises"
import path from "path"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, readUsers, validateAuthCookie } from "@/lib/auth"
import { readDocuments, type DocumentRecord } from "@/lib/documents"
import { accessContextFromUser, canAccessDocument } from "@/lib/permissions"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "data", "documents")

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

async function getAccessContext() {
  const cookieStore = await cookies()
  const email = validateAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
  if (!email) return null
  const users = await readUsers()
  const user = users.find((entry) => entry.email === email)
  if (!user) return null
  return accessContextFromUser(user)
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
    const access = await getAccessContext()
    if (!access) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const url = new URL(request.url)
    const lastSegment = url.pathname.split("/").filter(Boolean).pop()
    const resolvedParams = await params
    const rawId = resolvedParams?.id ?? lastSegment ?? ""
    const id = decodeURIComponent(rawId)
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }

    const documents = await readDocuments()
    const nameFromQuery = url.searchParams.get("name")
    const document = resolveDocument(documents, id, nameFromQuery)
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }
    if (!canAccessDocument(access, document)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
    }

    const fileName = document.storedName || document.name
    await fs.mkdir(uploadDir, { recursive: true })

    let fileBuffer: Buffer | null = null
    try {
      fileBuffer = await fs.readFile(path.join(uploadDir, fileName))
    } catch {
      fileBuffer = null
    }

    if (!fileBuffer) {
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
