import fs from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "data", "doc")

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
    const entries = await fs.readdir(uploadDir, { withFileTypes: true })
    const documents = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = path.join(uploadDir, entry.name)
          const stats = await fs.stat(filePath)
          const ext = path.extname(entry.name).replace(".", "").toUpperCase()

          return {
            id: `DOC-FS-${entry.name}`,
            name: entry.name,
            type: ext || "FILE",
            category: "Import",
            size: formatFileSize(stats.size),
            uploadedAt: stats.mtime.toISOString(),
            uploader: "Upload dashboard",
            confidentiality: "Public interne",
            status: "Stocké",
          }
        })
    )

    return NextResponse.json({ documents })
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
    const confidentiality =
      typeof formData.get("confidentiality") === "string"
        ? (formData.get("confidentiality") as string)
        : "Public interne"

    await ensureUploadDir()

    const documents = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const filePath = await buildFilePath(file.name)
        const storedName = path.basename(filePath)
        await fs.writeFile(filePath, buffer)

        return {
          id: `DOC-FS-${storedName}`,
          name: storedName,
          type:
            path.extname(storedName).replace(".", "").toUpperCase() ||
            file.type ||
            "FILE",
          category,
          size: formatFileSize(buffer.length),
          uploadedAt: new Date().toISOString(),
          uploader: "Dashboard",
          confidentiality,
          status: "Stocké",
        }
      })
    )

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Erreur lors de l'upload des documents", error)
    return NextResponse.json(
      { error: "Upload impossible pour le moment" },
      { status: 500 }
    )
  }
}
