import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export type ProjectRecord = {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
}

const PROJECT_DB_PATH = path.join(process.cwd(), "data", "projects.db")

export async function readProjects(): Promise<ProjectRecord[]> {
  try {
    const raw = await fs.readFile(PROJECT_DB_PATH, "utf8")
    if (!raw.trim()) return []
    return JSON.parse(raw) as ProjectRecord[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

export async function writeProjects(projects: ProjectRecord[]) {
  const serialized = JSON.stringify(projects, null, 2)
  await fs.mkdir(path.dirname(PROJECT_DB_PATH), { recursive: true })
  await fs.writeFile(PROJECT_DB_PATH, serialized, "utf8")
}

export function createProjectForUser(userId: string, name?: string): ProjectRecord {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    userId,
    name: name?.trim() || "Nouveau projet",
    createdAt: now,
    updatedAt: now,
  }
}

export function sortProjectsByRecent(projects: ProjectRecord[]) {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function projectsForUser(projects: ProjectRecord[], userId: string) {
  return projects.filter((project) => project.userId === userId)
}
