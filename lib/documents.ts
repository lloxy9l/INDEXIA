import { promises as fs } from "fs"
import path from "path"

export type DocumentRecord = {
  id: string
  name: string
  storedName: string
  type: string
  category: string
  size: number
  uploadedAt: string
  uploader: string
  confidentiality: string
  status: string
}

const DOCUMENT_DB_PATH = path.join(process.cwd(), "data", "documents.db")

export async function readDocuments(): Promise<DocumentRecord[]> {
  try {
    const raw = await fs.readFile(DOCUMENT_DB_PATH, "utf8")
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw) as DocumentRecord[]
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

export async function writeDocuments(documents: DocumentRecord[]) {
  const serialized = JSON.stringify(documents, null, 2)
  await fs.mkdir(path.dirname(DOCUMENT_DB_PATH), { recursive: true })
  await fs.writeFile(DOCUMENT_DB_PATH, serialized, "utf8")
}

export function upsertDocument(
  documents: DocumentRecord[],
  record: DocumentRecord
) {
  const existingIndex = documents.findIndex((doc) => doc.id === record.id)
  if (existingIndex === -1) return [...documents, record]
  const next = [...documents]
  next[existingIndex] = record
  return next
}
