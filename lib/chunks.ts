import { promises as fs } from "fs"
import path from "path"

import type { IndexedChunk } from "@/lib/chunking"

export type ChunkRecord = IndexedChunk & {
  document_ref: string
}

const CHUNKS_DB_PATH = path.join(process.cwd(), "data", "chunks.db")

export async function readChunks(): Promise<ChunkRecord[]> {
  try {
    const raw = await fs.readFile(CHUNKS_DB_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as ChunkRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

export async function writeChunks(chunks: ChunkRecord[]) {
  const serialized = JSON.stringify(chunks, null, 2)
  await fs.mkdir(path.dirname(CHUNKS_DB_PATH), { recursive: true })
  await fs.writeFile(CHUNKS_DB_PATH, serialized, "utf8")
}

export function replaceChunksForDocument(
  chunks: ChunkRecord[],
  documentRef: string,
  nextChunks: ChunkRecord[]
): ChunkRecord[] {
  const filtered = chunks.filter((chunk) => chunk.document_ref !== documentRef)
  return [...filtered, ...nextChunks]
}
