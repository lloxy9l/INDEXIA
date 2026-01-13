import type { DocumentRecord } from "@/lib/documents"

export type AccessRole = "admin" | "user"
export type ConfidentialityLevel = "public" | "restricted" | "confidential"

export type AccessContext = {
  role: AccessRole
  service: string | null
}

const normalizeBase = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const normalizeCompact = (value: string) => normalizeBase(value).replace(/\s+/g, "")

export function normalizeService(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const compact = normalizeCompact(value)
  return compact ? compact : null
}

export function normalizeConfidentiality(
  value?: string | null
): ConfidentialityLevel {
  if (typeof value !== "string") return "confidential"
  const compact = normalizeCompact(value)
  if (!compact) return "confidential"

  if (compact.startsWith("public") || compact === "interne") {
    return "public"
  }
  if (
    compact.includes("restreint") ||
    compact.includes("restricted") ||
    compact.includes("limite")
  ) {
    return "restricted"
  }
  if (
    compact.includes("confident") ||
    compact.includes("sensible") ||
    compact.includes("secret") ||
    compact.includes("private")
  ) {
    return "confidential"
  }

  return "confidential"
}

export function accessContextFromUser(user: {
  admin?: boolean
  service?: string | null
}): AccessContext {
  return {
    role: user.admin ? "admin" : "user",
    service: normalizeService(user.service),
  }
}

function resolveDocumentService(document: DocumentRecord): string | null {
  const rawService =
    typeof document.service === "string" && document.service.trim()
      ? document.service
      : document.category
  return normalizeService(rawService)
}

export function canAccessDocument(
  access: AccessContext,
  document: DocumentRecord
): boolean {
  if (access.role === "admin") return true
  const confidentiality = normalizeConfidentiality(document.confidentiality)
  if (confidentiality === "confidential") return false
  const documentService = resolveDocumentService(document)
  if (!documentService || !access.service) return false
  return documentService === access.service
}

export function filterDocumentsForAccess(
  documents: DocumentRecord[],
  access: AccessContext
): DocumentRecord[] {
  if (access.role === "admin") return documents
  return documents.filter((doc) => canAccessDocument(access, doc))
}
