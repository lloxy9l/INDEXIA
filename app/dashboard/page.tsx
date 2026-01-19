"use client"

import * as React from "react"
import { JetBrains_Mono } from "next/font/google"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { LLM_CATALOG, modelKeyFromName } from "@/lib/llm-catalog"
import { SERVICE_OPTIONS } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type ModelShareItem = {
  key: string
  label: string
  value: number
}

const defaultModelShare: ModelShareItem[] = LLM_CATALOG.map((value) => ({
  key: modelKeyFromName(value),
  label: value,
  value: 0,
}))

const pipelineUsage = [
  { pipeline: "RAG standard", requests: 420 },
  { pipeline: "RAG + re-ranking", requests: 310 },
  { pipeline: "Multi-query", requests: 240 },
  { pipeline: "Agent RAG", requests: 130 },
]

const pipelineConfig = {
  requests: { label: "Requêtes", color: "#7c3aed" }, // violet
} satisfies ChartConfig

const defaultTopUsers: { name: string; requests: number }[] = []

const topUsersConfig = {
  requests: { label: "Requêtes", color: "#0ea5e9" }, // cyan
} satisfies ChartConfig

const topDocs = [
  { title: "Guide RAG interne", hits: 210 },
  { title: "Procédure Support N2", hits: 184 },
  { title: "Playbook Sécurité", hits: 162 },
  { title: "FAQ Produit", hits: 140 },
  { title: "Roadmap 2024", hits: 118 },
]

const topDocsConfig = {
  hits: { label: "Consultations", color: "#f97316" }, // orange vif
} satisfies ChartConfig

type DashboardUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
  active: boolean
  admin: boolean
}

type DashboardDocument = {
  id: string
  name: string
  type: string
  category: string
  services?: string[]
  size: string
  uploadedAt: string
  uploader: string
  confidentiality: string
  status: string
}

type DocumentChunkRow = {
  id: string
  preview: string
  text: string
  dim: number
  quality: string
}

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const defaultUsers: DashboardUser[] = [
  {
    id: "USR-0001",
    firstName: "Alice",
    lastName: "Martin",
    email: "alice.martin@example.com",
    createdAt: "2024-03-12",
    active: true,
    admin: true,
  },
  {
    id: "USR-0002",
    firstName: "Karim",
    lastName: "Benali",
    email: "karim.benali@example.com",
    createdAt: "2024-02-02",
    active: false,
    admin: false,
  },
  {
    id: "USR-0003",
    firstName: "Sofia",
    lastName: "Lopez",
    email: "sofia.lopez@example.com",
    createdAt: "2024-03-28",
    active: true,
    admin: false,
  },
  {
    id: "USR-0004",
    firstName: "Léo",
    lastName: "Durand",
    email: "leo.durand@example.com",
    createdAt: "2024-01-18",
    active: true,
    admin: true,
  },
  {
    id: "USR-0005",
    firstName: "Nina",
    lastName: "Klein",
    email: "nina.klein@example.com",
    createdAt: "2023-12-04",
    active: false,
    admin: false,
  },
]

const documents: DashboardDocument[] = [
  {
    id: "DOC-001",
    name: "Procedure_incident.pdf",
    type: "PDF",
    category: "IT",
    size: "1.2 MB",
    uploadedAt: "2025-11-20",
    uploader: "Maxime",
    confidentiality: "Restreint",
    status: "Indexé",
  },
  {
    id: "DOC-002",
    name: "Charte_RH.docx",
    type: "DOCX",
    category: "RH",
    size: "860 KB",
    uploadedAt: "2025-11-18",
    uploader: "Baptiste",
    confidentiality: "Public",
    status: "En cours",
  },
  {
    id: "DOC-003",
    name: "Budget_2025.xlsx",
    type: "XLSX",
    category: "Finance",
    size: "2.4 MB",
    uploadedAt: "2025-11-10",
    uploader: "Admin",
    confidentiality: "Sensible",
    status: "Erreur",
  },
  {
    id: "DOC-004",
    name: "Roadmap_RAG.md",
    type: "MD",
    category: "R&D",
    size: "540 KB",
    uploadedAt: "2025-11-26",
    uploader: "Maxime",
    confidentiality: "Restreint",
    status: "Indexé",
  },
]

const indexChunks = [
  {
    id: "1253",
    preview: "En cas d’incident majeur…",
    doc: "incident.pdf",
    length: "412 tokens",
    dim: 1536,
  },
  {
    id: "1254",
    preview: "Procédure de reprise après sinistre…",
    doc: "plan_continuite.pdf",
    length: "388 tokens",
    dim: 1536,
  },
  {
    id: "1255",
    preview: "Politique d’accès aux environnements…",
    doc: "charte_it.docx",
    length: "440 tokens",
    dim: 1536,
  },
]

const diagnostics = [
  { label: "Docs non indexés", status: "ok" },
  { label: "Chunks orphelins", status: "warn" },
  { label: "Embeddings manquants", status: "ok" },
  { label: "Index corrompu", status: "ok" },
  { label: "Collisions FAISS", status: "warn" },
]

const indexSettings = {
  dim: 1536,
  type: "HNSW",
  chunkSize: 200,
  chunkOverlap: 30,
  k: 4,
  rerank: "ON",
  embeddingModel: "Llama 3",
}

const requestLogs = [
  {
    date: "26/11/25 13:12",
    user: "Maxime",
    question: "Procédure incident ?",
    model: "Llama 3",
    pipeline: "RAG + rank",
    time: "458 ms",
    status: "success",
  },
  {
    date: "26/11/25 13:08",
    user: "Baptiste",
    question: "Charte IT v3 ?",
    model: "GPT-4o Mini",
    pipeline: "RAG",
    time: "310 ms",
    status: "error",
  },
  {
    date: "26/11/25 12:59",
    user: "Sofia",
    question: "Budget 2025",
    model: "Mistral",
    pipeline: "RAG",
    time: "520 ms",
    status: "warn",
  },
]

const systemLogs = [
  { time: "13:12", type: "INDEX", desc: "Rebuild complet", status: "ok" },
  { time: "13:08", type: "UPLOAD", desc: "Plan_Continuite.pdf ajouté", status: "ok" },
  { time: "12:59", type: "ERROR", desc: "Embedding model introuvable", status: "error" },
  { time: "12:40", type: "PERMISSIONS", desc: "Rôle admin modifié", status: "ok" },
]

const errorLogs = [
  {
    time: "13:09",
    user: "Baptiste",
    type: "LLM",
    desc: "Timeout modèle",
  },
  {
    time: "13:02",
    user: "Maxime",
    type: "Indexation",
    desc: "Embedding échoué (pdf corrompu)",
  },
  {
    time: "12:55",
    user: "Sofia",
    type: "Permission",
    desc: "Accès refusé au doc Finance",
  },
]

const requestDetail = {
  question: "Procédure incident ?",
  user: "Maxime",
  datetime: "26/11/2025 13:12",
  model: "Llama 3",
  pipeline: "RAG + re-ranking",
  params: {
    topK: 4,
    chunkSize: 500,
    overlap: 50,
    rerank: "ON",
    totalTime: "458 ms",
  },
  embedding: {
    text: "Procédure incident ?",
    dim: 1536,
    model: "Llama 3",
    norm: "12.08",
    preview: "[0.12, -0.04, 0.33, ...]",
  },
  retrieval: [
    {
      rank: 1,
      score: 0.92,
      doc: "Procedure_Incident.pdf",
      chunkId: "#152",
      page: "p.3",
      preview: "En cas d’incident critique…",
    },
    {
      rank: 2,
      score: 0.87,
      doc: "Plan_Continuite.pdf",
      chunkId: "#87",
      page: "p.5",
      preview: "Le service IT doit…",
    },
  ],
  reranking: {
    enabled: true,
    before: [
      { chunkId: "#152", rank: 2, score: 0.86 },
      { chunkId: "#87", rank: 1, score: 0.89 },
      { chunkId: "#41", rank: 3, score: 0.81 },
    ],
    after: [
      { chunkId: "#152", rank: 1, score: 0.92 },
      { chunkId: "#87", rank: 2, score: 0.87 },
    ],
    removed: [{ chunkId: "#41", reason: "Pertinence faible" }],
  },
  prompt: [
    "SYSTEM:",
    "Tu es un assistant qui répond uniquement à partir des sources fournies.",
    "",
    "CONTEXT:",
    "[Chunk #152 - Procedure_Incident.pdf p.3]",
    "En cas d’incident critique…",
    "",
    "[Chunk #87 - Plan_Continuite.pdf p.5]",
    "Le service IT doit…",
    "",
    "QUESTION:",
    "Quelle est la procédure en cas d’incident critique ?",
  ].join("\n"),
  answer: {
    text: "Escalader vers N3 en <30min, notifier ITSM, prévenir SecOps.",
    time: "458 ms",
    tokens: 220,
    sources: [
      { doc: "Procedure_Incident.pdf", chunkId: "#152", page: "p.3" },
      { doc: "Plan_Continuite.pdf", chunkId: "#87", page: "p.5" },
    ],
    quality: 4,
  },
}

const activityStats = {
  requestsToday: 248,
  avgResponseMs: 420,
  errors: 6,
}

const benchmarkModelSpeed = [
  { model: "Llama 3", ms: 450 },
  { model: "Mistral", ms: 310 },
  { model: "Qwen", ms: 370 },
  { model: "GPT-4o mini", ms: 290 },
]

const benchmarkHallucination = [
  { model: "GPT-4o mini", percent: 3 },
  { model: "Mistral", percent: 7 },
  { model: "Llama 3", percent: 10 },
  { model: "Qwen", percent: 12 },
]

const benchmarkPipelineRelevance = [
  { day: "J-6", standard: 0.72, rerank: 0.81, multi: 0.78, agent: 0.75 },
  { day: "J-5", standard: 0.73, rerank: 0.82, multi: 0.79, agent: 0.76 },
  { day: "J-4", standard: 0.74, rerank: 0.83, multi: 0.8, agent: 0.77 },
  { day: "J-3", standard: 0.71, rerank: 0.8, multi: 0.78, agent: 0.75 },
  { day: "J-2", standard: 0.73, rerank: 0.82, multi: 0.79, agent: 0.76 },
  { day: "J-1", standard: 0.74, rerank: 0.83, multi: 0.8, agent: 0.77 },
]

const benchmarkPipelineTime = [
  { pipeline: "RAG standard", ms: 320 },
  { pipeline: "RAG + re-ranking", ms: 410 },
  { pipeline: "RAG multi-query", ms: 520 },
  { pipeline: "RAG agent", ms: 580 },
]

const benchmarkPipelineQuality = [
  { pipeline: "RAG standard", excellent: 20, bon: 40, moyen: 25, mauvais: 10, nul: 5 },
  { pipeline: "RAG + re-ranking", excellent: 32, bon: 45, moyen: 15, mauvais: 6, nul: 2 },
  { pipeline: "RAG multi-query", excellent: 28, bon: 44, moyen: 18, mauvais: 7, nul: 3 },
  { pipeline: "RAG agent", excellent: 30, bon: 42, moyen: 18, mauvais: 7, nul: 3 },
]

const benchmarkHeatmap = [
  { model: "Llama 3", pipelines: { standard: 0.72, rerank: 0.81, multi: 0.78 } },
  { model: "Mistral", pipelines: { standard: 0.75, rerank: 0.84, multi: 0.8 } },
  { model: "Qwen", pipelines: { standard: 0.7, rerank: 0.79, multi: 0.76 } },
  { model: "GPT-4o mini", pipelines: { standard: 0.78, rerank: 0.86, multi: 0.82 } },
]

const usageRequestsByModel = [
  { day: "Lun", llama: 42, mistral: 38, qwen: 22, gpt4o: 48 },
  { day: "Mar", llama: 40, mistral: 42, qwen: 24, gpt4o: 52 },
  { day: "Mer", llama: 44, mistral: 39, qwen: 25, gpt4o: 55 },
  { day: "Jeu", llama: 43, mistral: 41, qwen: 23, gpt4o: 57 },
  { day: "Ven", llama: 41, mistral: 40, qwen: 22, gpt4o: 50 },
  { day: "Sam", llama: 35, mistral: 30, qwen: 20, gpt4o: 40 },
  { day: "Dim", llama: 30, mistral: 28, qwen: 18, gpt4o: 35 },
]

const usageResponseTime = [
  { day: "Lun", standard: 430, rerank: 510, multi: 620 },
  { day: "Mar", standard: 420, rerank: 500, multi: 610 },
  { day: "Mer", standard: 440, rerank: 520, multi: 630 },
  { day: "Jeu", standard: 410, rerank: 495, multi: 605 },
  { day: "Ven", standard: 415, rerank: 505, multi: 615 },
  { day: "Sam", standard: 450, rerank: 540, multi: 660 },
  { day: "Dim", standard: 470, rerank: 560, multi: 680 },
]

const usagePipelinePie = [
  { key: "standard", label: "RAG standard", value: 42 },
  { key: "rerank", label: "RAG + re-ranking", value: 35 },
  { key: "multi", label: "RAG multi-query", value: 15 },
  { key: "agent", label: "RAG agent", value: 8 },
]

const costPerRequest = [
  { pipeline: "RAG standard", cost: 0.0002 },
  { pipeline: "RAG multi-query", cost: 0.0009 },
]

const costMonthly = [
  { day: 1, cost: 0.8 },
  { day: 2, cost: 1.2 },
  { day: 3, cost: 1.1 },
  { day: 4, cost: 1.4 },
  { day: 5, cost: 1.6 },
  { day: 6, cost: 1.9 },
  { day: 7, cost: 2.2 },
]

const chartColors = {
  llama: "#2563eb",
  mistral: "#0ea5e9",
  qwen: "#a855f7",
  gpt4o: "#f97316",
  standard: "#4f46e5",
  rerank: "#0ea5e9",
  multi: "#f59e0b",
  agent: "#ec4899",
  ms: "#6366f1",
  percent: "#f97316",
  cost: "#22c55e",
  costCumul: "#0ea5e9",
  excellent: "#22c55e",
  bon: "#10b981",
  moyen: "#f59e0b",
  mauvais: "#f97316",
  nul: "#ef4444",
  pipeline: {
    standard: "#4f46e5",
    rerank: "#0ea5e9",
    multi: "#f59e0b",
    agent: "#ec4899",
  },
}

function formatFileSize(bytes: number | string) {
  if (typeof bytes === "string") return bytes
  if (!Number.isFinite(bytes)) return "N/A"
  const KB = 1024
  const MB = KB * 1024
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`
  return `${bytes} B`
}

function parseFileSizeToBytes(value: string) {
  const match = value.match(/([\d.,]+)\s*(B|KB|MB|GB)/i)
  if (!match) return null
  const amount = Number.parseFloat(match[1].replace(",", "."))
  if (!Number.isFinite(amount)) return null
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }
  return amount * (multipliers[unit] ?? 1)
}

function estimateChunksFromSize(size: string) {
  const bytes = parseFileSizeToBytes(size)
  if (!bytes) return null
  const bytesPerChunk = 12 * 1024
  return Math.max(1, Math.round(bytes / bytesPerChunk))
}

function estimateEmbeddingsSize(chunks: number | null, dim: number) {
  if (!chunks) return null
  return formatFileSize(chunks * dim * 4)
}

function formatRagField(
  status: string,
  value: string | number | null,
  fallback = "N/A"
) {
  if (status === "Indexé") return value ?? fallback
  if (status === "En cours") return "En cours"
  if (status === "Erreur") return "Erreur"
  return fallback
}

function formatDashboardDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${day}/${month}/${year} - ${hours}h${minutes}`
}

function toDashboardDocument(
  doc: any,
  fallbackCategory: string,
  fallbackConfidentiality: string,
  fallbackUploader = "Upload"
): DashboardDocument {
  const services =
    Array.isArray(doc?.services) && doc.services.length > 0
      ? doc.services.filter((service: any) => typeof service === "string")
      : []
  const categoryLabel =
    services.length > 0
      ? services.join(", ")
      : typeof doc?.service === "string" && doc.service
        ? doc.service
        : typeof doc?.category === "string" && doc.category
          ? doc.category
          : fallbackCategory || "Non classé"
  const size =
    typeof doc?.size === "number"
      ? formatFileSize(doc.size)
      : typeof doc?.size === "string"
        ? doc.size
        : "N/A"
  const uploadedAt =
    typeof doc?.uploadedAt === "string" && doc.uploadedAt
      ? doc.uploadedAt
      : new Date().toISOString()

  return {
    id:
      typeof doc?.id === "string" && doc.id
        ? doc.id
        : `DOC-${Math.random().toString(16).slice(2)}`,
    name:
      typeof doc?.name === "string" && doc.name ? doc.name : "Sans nom",
    type: typeof doc?.type === "string" && doc.type ? doc.type : "FILE",
    category: categoryLabel,
    services,
    size,
    uploadedAt,
    uploader:
      typeof doc?.uploader === "string" && doc.uploader
        ? doc.uploader
        : fallbackUploader,
    confidentiality:
      typeof doc?.confidentiality === "string" && doc.confidentiality
        ? doc.confidentiality
        : fallbackConfidentiality || "Public interne",
    status:
      typeof doc?.status === "string" && doc.status
        ? doc.status
        : "Stocké",
  }
}

function mergeDocumentsLists(
  base: DashboardDocument[],
  incoming: DashboardDocument[]
) {
  const seen = new Set<string>()
  return [...base, ...incoming].filter((doc) => {
    const key = doc.id || `${doc.name}-${doc.uploadedAt}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function Page() {
  const pieGradientBase = React.useId().replace(/:/g, "")
  const pipelineGradientId = `${React.useId().replace(/:/g, "")}-pipeline`
  const topUsersGradientId = `${React.useId().replace(/:/g, "")}-users`
  const topDocsGradientId = `${React.useId().replace(/:/g, "")}-docs`
  const benchmarkGradBase = React.useId().replace(/:/g, "")
  const [modelShare, setModelShare] = React.useState<ModelShareItem[]>(defaultModelShare)
  const [topUsers, setTopUsers] = React.useState(defaultTopUsers)
  const modelShareConfig = React.useMemo(() => {
    const palette = ["#2563eb", "#ef4444", "#22c55e", "#f59e0b", "#0ea5e9", "#a855f7"]
    const config: ChartConfig = {}
    modelShare.forEach((item, index) => {
      config[item.key] = {
        label: item.label,
        color: palette[index % palette.length],
      }
    })
    return config
  }, [modelShare])
  const [session, setSession] = React.useState<{
    firstName?: string | null
    lastName?: string | null
    email?: string
  } | null>(null)
  const [activeSection, setActiveSection] = React.useState("Dashboard Admin")
  const [usersState, setUsersState] = React.useState<DashboardUser[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(true)
  const [usersError, setUsersError] = React.useState("")
  const [deletingUserId, setDeletingUserId] = React.useState("")
  const [adminUpdatingId, setAdminUpdatingId] = React.useState("")
  const [confirmDeleteUser, setConfirmDeleteUser] = React.useState<DashboardUser | null>(null)
  const [pendingAdminToggle, setPendingAdminToggle] = React.useState<{
    user: DashboardUser
    nextIsAdmin: boolean
  } | null>(null)
  const [documentsState, setDocumentsState] = React.useState<DashboardDocument[]>(documents)
  const [documentChunksState, setDocumentChunksState] = React.useState<DocumentChunkRow[]>([])
  const [documentChunksError, setDocumentChunksError] = React.useState("")
  const [documentChunksLoading, setDocumentChunksLoading] = React.useState(false)
  const [chunkCounts, setChunkCounts] = React.useState<Record<string, number>>({})
  const [expandedChunkId, setExpandedChunkId] = React.useState<string | null>(null)
  const documentsFs = React.useMemo(
    () => documentsState.filter((doc) => doc.id.startsWith("DOC-FS-")),
    [documentsState]
  )
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([])
  const [uploadServices, setUploadServices] = React.useState<string[]>([])
  const [uploadTags, setUploadTags] = React.useState("")
  const [uploadConfidentiality, setUploadConfidentiality] = React.useState("Public interne")
  const [uploadingDocs, setUploadingDocs] = React.useState(false)
  const [uploadMessage, setUploadMessage] = React.useState("")
  const [uploadError, setUploadError] = React.useState("")
  const [editServices, setEditServices] = React.useState<string[]>([])
  const [updateDocError, setUpdateDocError] = React.useState("")
  const [updateDocMessage, setUpdateDocMessage] = React.useState("")
  const [updatingDoc, setUpdatingDoc] = React.useState(false)
  const [deleteDocError, setDeleteDocError] = React.useState("")
  const [deletingDocumentId, setDeletingDocumentId] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [docsTab, setDocsTab] = React.useState("list")
  const [selectedDocId, setSelectedDocId] = React.useState("")
  const uploaderName = React.useMemo(() => {
    const first = session?.firstName?.trim()
    if (first) return first
    const emailPrefix = session?.email?.split("@")?.[0]
    if (emailPrefix) return emailPrefix
    return "Upload"
  }, [session])

  const toggleUploadService = React.useCallback((service: string) => {
    setUploadServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    )
  }, [])

  const toggleEditService = React.useCallback((service: string) => {
    setEditServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    )
  }, [])

  React.useEffect(() => {
    let active = true
    const loadSession = async () => {
      try {
        const res = await fetch("/api/session")
        const payload = await res.json().catch(() => null)
        if (!active || !res.ok || !payload?.email) return
        setSession({
          email: payload.email,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
        })
      } catch (error) {
        console.error("Erreur lors du chargement de la session", error)
      }
    }
    loadSession()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    let active = true
    const loadModelShare = async () => {
      try {
        const res = await fetch("/api/metrics/requests-by-model", {
          cache: "no-store",
        })
        const payload = await res.json().catch(() => null)
        if (!active || !res.ok) return
        if (Array.isArray(payload?.data)) {
          setModelShare(payload.data as ModelShareItem[])
        }
      } catch {
        if (active) setModelShare(defaultModelShare)
      }
    }
    loadModelShare()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    let active = true
    const loadTopUsers = async () => {
      try {
        const res = await fetch("/api/metrics/top-users", { cache: "no-store" })
        const payload = await res.json().catch(() => null)
        if (!active || !res.ok) return
        if (Array.isArray(payload?.data)) {
          setTopUsers(payload.data)
        }
      } catch {
        if (active) setTopUsers(defaultTopUsers)
      }
    }
    loadTopUsers()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      setLoadingUsers(true)
      setUsersError("")
      try {
        const res = await fetch("/api/users")
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`)
        }
        const payload = await res.json()
        const incoming = Array.isArray(payload?.users) ? payload.users : []
        const normalized: DashboardUser[] = incoming.map((user: any) => ({
          id: user.id || user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email,
          createdAt: user.createdAt ?? "",
          admin: Boolean(user.admin),
          active: user.active ?? true,
        }))

        if (!isMounted) return
        setUsersState(normalized)
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs", error)
        if (!isMounted) return
        setUsersError("Impossible de charger les utilisateurs")
        setUsersState(defaultUsers)
      } finally {
        if (isMounted) setLoadingUsers(false)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

  const fetchDocumentsFromApi = React.useCallback(async () => {
    try {
      const res = await fetch("/api/documents")
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || `Erreur ${res.status}`)
      }
      const incoming = Array.isArray(payload?.documents) ? payload.documents : []
      const mapped = incoming.map((doc: any) =>
        toDashboardDocument(doc, "", "Public interne", uploaderName)
      )
      setDocumentsState((prev) => mergeDocumentsLists(prev, mapped))
    } catch (error) {
      console.error("Erreur lors du chargement des documents", error)
    }
  }, [uploaderName])

  React.useEffect(() => {
    fetchDocumentsFromApi()
  }, [fetchDocumentsFromApi])

  React.useEffect(() => {
    let isActive = true
    if (!selectedDocId || !selectedDocId.startsWith("DOC-FS-")) {
      setDocumentChunksState([])
      setDocumentChunksError("")
      setDocumentChunksLoading(false)
      return () => {
        isActive = false
      }
    }

    setDocumentChunksLoading(true)
    setDocumentChunksError("")

    fetch(`/api/documents/${encodeURIComponent(selectedDocId)}/chunks`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(payload?.error || `Erreur ${res.status}`)
        }
        const incoming = Array.isArray(payload?.chunks) ? payload.chunks : []
        const mapped = incoming.map((chunk: any, index: number) => {
          const tokenCount =
            Number.isFinite(chunk?.token_count) ? Number(chunk.token_count) : 0

          return {
            id: typeof chunk?.id === "string" ? chunk.id : `chunk-${index + 1}`,
            preview: typeof chunk?.preview === "string" ? chunk.preview : "",
            text: typeof chunk?.text === "string" ? chunk.text : "",
            dim: indexSettings.dim,
            quality: tokenCount >= 120 ? "ok" : tokenCount > 0 ? "warning" : "N/A",
          }
        })

        if (isActive) {
          setDocumentChunksState(mapped)
          setChunkCounts((prev) => ({
            ...prev,
            [selectedDocId]: mapped.length,
          }))
        }
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des chunks", error)
        if (isActive) {
          setDocumentChunksError(
            error instanceof Error ? error.message : "Impossible de charger les chunks"
          )
          setDocumentChunksState([])
        }
      })
      .finally(() => {
        if (isActive) {
          setDocumentChunksLoading(false)
          setExpandedChunkId(null)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedDocId])

  const thirtyDaysAgo = React.useMemo(() => {
    const now = Date.now()
    const days30 = 30 * 24 * 60 * 60 * 1000
    return now - days30
  }, [])

  React.useEffect(() => {
    if (!documentsFs.length) return
    const exists = documentsFs.some((doc) => doc.id === selectedDocId)
    if (!exists) {
      setSelectedDocId(documentsFs[0].id)
    }
  }, [documentsFs, selectedDocId])

  const activeUsers = usersState.filter((u) => u.active).length
  const totalUsers = usersState.length
  const adminUsers = usersState.filter((u) => u.admin).length
  const recentUsers = usersState.filter((u) => {
    const created = new Date(u.createdAt).getTime()
    return !Number.isNaN(created) && created >= thirtyDaysAgo
  }).length
  const selectedDoc = documentsState.find((doc) => doc.id === selectedDocId)

  React.useEffect(() => {
    if (!selectedDoc) {
      setEditServices([])
      setUpdateDocError("")
      setUpdateDocMessage("")
      return
    }
    const services =
      Array.isArray(selectedDoc.services) && selectedDoc.services.length > 0
        ? selectedDoc.services
        : []
    setEditServices(services)
    setUpdateDocError("")
    setUpdateDocMessage("")
  }, [selectedDoc])
  const indexDocs = React.useMemo(
    () =>
      documentsFs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        chunks:
          doc.status === "Indexé"
            ? chunkCounts[doc.id] ?? estimateChunksFromSize(doc.size) ?? "N/A"
            : "N/A",
        indexedAt: formatDashboardDate(doc.uploadedAt),
        embedding:
          doc.status === "Indexé"
            ? "OK"
            : doc.status === "En cours"
              ? "En cours"
              : doc.status === "Erreur"
                ? "Erreur"
                : "N/A",
        size: doc.size,
      })),
    [documentsFs, chunkCounts]
  )
  const indexedDocs = documentsFs.filter((d) => d.status === "Indexé").length
  const inProgressDocs = documentsFs.filter((d) => d.status === "En cours").length
  const errorDocs = documentsFs.filter((d) => d.status === "Erreur").length
  const indexStats = React.useMemo(() => {
    const indexedList = documentsFs.filter((doc) => doc.status === "Indexé")
    const totalChunks = indexedList.reduce((acc, doc) => {
      const chunks = estimateChunksFromSize(doc.size)
      return typeof chunks === "number" ? acc + chunks : acc
    }, 0)
    const totalBytes = indexedList.reduce((acc, doc) => {
      const bytes = parseFileSizeToBytes(doc.size)
      return typeof bytes === "number" ? acc + bytes : acc
    }, 0)
    const lastAutoIndexDate = indexedList.reduce<Date | null>((latest, doc) => {
      const date = new Date(doc.uploadedAt)
      if (Number.isNaN(date.getTime())) return latest
      if (!latest || date > latest) return date
      return latest
    }, null)

    return {
      documents: indexedList.length,
      chunks: totalChunks,
      size: formatFileSize(totalBytes),
      lastAutoIndex: lastAutoIndexDate
        ? formatDashboardDate(lastAutoIndexDate.toISOString())
        : "—",
      embeddingDim: indexSettings.dim,
      rebuilds: inProgressDocs + errorDocs,
    }
  }, [documentsFs, inProgressDocs, errorDocs])
  const ragMetadata = React.useMemo(() => {
    if (!selectedDoc) {
      return {
        chunks: "N/A",
        embeddingsSize: "N/A",
        vectorStore: "N/A",
        indexedAt: "—",
      }
    }

    const status = selectedDoc.status
    const chunkCount =
      documentChunksState.length > 0 ? documentChunksState.length : null
    const chunks = chunkCount ?? estimateChunksFromSize(selectedDoc.size)
    const embeddingsSize = estimateEmbeddingsSize(
      typeof chunks === "number" ? chunks : null,
      indexSettings.dim
    )

    return {
      chunks: formatRagField(
        status,
        typeof chunks === "number" ? chunks.toString() : null
      ),
      embeddingsSize: formatRagField(status, embeddingsSize),
      vectorStore: formatRagField(status, "FAISS"),
      indexedAt: formatRagField(
        status,
        formatDashboardDate(selectedDoc.uploadedAt),
        "—"
      ),
    }
  }, [selectedDoc, documentChunksState])

  const applyAdminToggle = React.useCallback((id: string, nextIsAdmin: boolean) => {
    setUsersState((prev) =>
      prev.map((u) => (u.id === id ? { ...u, admin: nextIsAdmin } : u))
    )
  }, [])

  const requestAdminToggle = React.useCallback(
    (userId: string) => {
      const user = usersState.find((u) => u.id === userId)
      if (!user) return
      setPendingAdminToggle({ user, nextIsAdmin: !user.admin })
    },
    [usersState]
  )

  const confirmAdminToggle = React.useCallback(async () => {
    if (!pendingAdminToggle) return
    setUsersError("")
    setAdminUpdatingId(pendingAdminToggle.user.id)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingAdminToggle.user.id,
          admin: pendingAdminToggle.nextIsAdmin,
        }),
      })
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`)
      }
      applyAdminToggle(pendingAdminToggle.user.id, pendingAdminToggle.nextIsAdmin)
      setPendingAdminToggle(null)
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle admin", error)
      setUsersError("Impossible de mettre à jour le rôle")
    } finally {
      setAdminUpdatingId("")
    }
  }, [pendingAdminToggle, applyAdminToggle])

  const cancelAdminToggle = React.useCallback(() => {
    setPendingAdminToggle(null)
  }, [])

  const requestDeleteUser = React.useCallback((user: DashboardUser) => {
    setConfirmDeleteUser(user)
  }, [])

  const handleDeleteUser = React.useCallback(async () => {
    if (!confirmDeleteUser) return
    setUsersError("")
    setDeletingUserId(confirmDeleteUser.id)
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: confirmDeleteUser.id }),
      })

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`)
      }

      setUsersState((prev) => prev.filter((user) => user.id !== confirmDeleteUser.id))
      setConfirmDeleteUser(null)
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur", error)
      setUsersError("Impossible de supprimer l'utilisateur")
    } finally {
      setDeletingUserId("")
    }
  }, [confirmDeleteUser])

  const handleDocumentsUpload = React.useCallback(async () => {
    if (uploadFiles.length === 0) {
      setUploadError("Ajoutez au moins un fichier")
      return
    }
    if (uploadServices.length === 0) {
      setUploadError("Choisissez au moins un service")
      return
    }
    setUploadingDocs(true)
    setUploadError("")
    setUploadMessage("")

    const formData = new FormData()
    uploadFiles.slice(0, 10).forEach((file) => formData.append("files", file))
    formData.append("services", JSON.stringify(uploadServices))
    if (uploadTags) formData.append("tags", uploadTags)
    if (uploadConfidentiality) {
      formData.append("confidentiality", uploadConfidentiality)
    }
    formData.append("uploader", uploaderName)

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || "Upload échoué")
      }
      const incoming = Array.isArray(payload?.documents) ? payload.documents : []
      const mapped = incoming.map((doc: any) =>
        toDashboardDocument(
          doc,
          uploadServices.join(", "),
          uploadConfidentiality,
          uploaderName
        )
      )

      setDocumentsState((prev) => mergeDocumentsLists(prev, mapped))
      setUploadMessage(
        mapped.length > 0
          ? `Upload réussi (${mapped.length} fichier${mapped.length > 1 ? "s" : ""})`
          : "Upload réussi"
      )
      setUploadFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      if (mapped[0]) {
        setSelectedDocId(mapped[0].id)
      }
      setDocsTab("list")
    } catch (error) {
      console.error("Erreur lors de l'upload des documents", error)
      setUploadError(error instanceof Error ? error.message : "Upload échoué")
    } finally {
      setUploadingDocs(false)
    }
  }, [
    uploadFiles,
    uploadServices,
    uploadTags,
    uploadConfidentiality,
    selectedDocId,
    uploaderName,
  ])

  const handleUpdateDocumentServices = React.useCallback(async () => {
    if (!selectedDoc) return
    if (editServices.length === 0) {
      setUpdateDocError("Choisissez au moins un service")
      return
    }

    setUpdatingDoc(true)
    setUpdateDocError("")
    setUpdateDocMessage("")

    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDoc.id, services: editServices }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || "Mise a jour echouee")
      }

      const updated = payload?.document
      if (updated) {
        const mapped = toDashboardDocument(
          updated,
          editServices.join(", "),
          selectedDoc.confidentiality,
          selectedDoc.uploader
        )
        setDocumentsState((prev) =>
          prev.map((doc) => (doc.id === mapped.id ? { ...doc, ...mapped } : doc))
        )
      }
      setUpdateDocMessage("Services mis a jour")
    } catch (error) {
      console.error("Erreur lors de la mise a jour du document", error)
      setUpdateDocError(
        error instanceof Error ? error.message : "Mise a jour echouee"
      )
    } finally {
      setUpdatingDoc(false)
    }
  }, [selectedDoc, editServices])

  const handleDeleteDocument = React.useCallback(
    async (docId: string, docName: string) => {
      setDeleteDocError("")
      setDeletingDocumentId(docId)
      try {
        const res = await fetch("/api/documents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: docId, name: docName }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(payload?.error || `Erreur ${res.status}`)
        }

        setDocumentsState((prev) => {
          const next = prev.filter((doc) => doc.id !== docId)
          if (selectedDocId === docId) {
            setSelectedDocId(next[0]?.id ?? "")
          }
          return next
        })
      } catch (error) {
        console.error("Erreur lors de la suppression du document", error)
        const message =
          error instanceof Error ? error.message : "Impossible de supprimer le document"
        setDeleteDocError(message)
      } finally {
        setDeletingDocumentId("")
      }
    },
    [selectedDocId]
  )
  const focusDocument = React.useCallback(
    (docId: string) => {
      setSelectedDocId(docId)
      setDocsTab("details")
      setActiveSection("Documents")
    },
    [setDocsTab, setActiveSection]
  )

  const handleReindexDocument = React.useCallback(
    async (docId: string) => {
      setDocumentsState((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, status: "En cours" } : doc
        )
      )

      try {
        const res = await fetch(
          `/api/documents/${encodeURIComponent(docId)}/chunks`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chunkSize: indexSettings.chunkSize,
              chunkOverlap: indexSettings.chunkOverlap,
            }),
          }
        )
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(payload?.error || `Erreur ${res.status}`)
        }
        if (payload?.semantic?.attempted && payload?.semantic?.used === false) {
          toast.warning(
            "Découpage sémantique BERT indisponible, chunking standard utilisé."
          )
        }
        if (Number.isFinite(payload?.chunks)) {
          setChunkCounts((prev) => ({
            ...prev,
            [docId]: Number(payload.chunks),
          }))
        }

        setDocumentsState((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, status: "Indexé" } : doc
          )
        )
      } catch (error) {
        console.error("Erreur lors du chunking", error)
        setDocumentsState((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, status: "Erreur" } : doc
          )
        )
      }
    },
    [setDocumentsState]
  )

  const handleClearEmbeddings = React.useCallback(
    (docId: string) => {
      setDocumentsState((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, status: "Stocké" } : doc
        )
      )
    },
    [setDocumentsState]
  )

  const indexView = (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3 @5xl/main:grid-cols-6">
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Docs indexés</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.documents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Total chunks</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.chunks.toLocaleString("fr-FR")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Dim embeddings</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.embeddingDim}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Taille index</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.size}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Dernière indexation auto</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.lastAutoIndex}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardDescription>Rebuilds</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {indexStats.rebuilds}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Détails par document</CardTitle>
          <CardDescription>Contribution à l’index</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Date indexation</TableHead>
                <TableHead>Embeddings</TableHead>
                <TableHead>Taille estimée</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indexDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.chunks}</TableCell>
                  <TableCell>{doc.indexedAt}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
                    >
                      {doc.embedding}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => focusDocument(doc.id)}
                    >
                      Voir chunks
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                      disabled={doc.status === "En cours"}
                      onClick={() => handleReindexDocument(doc.id)}
                    >
                      {doc.status === "En cours" ? "Re-indexation..." : "Re-indexer"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-100 text-red-800 hover:bg-red-200"
                      onClick={() => handleClearEmbeddings(doc.id)}
                    >
                      Supprimer embeddings
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a
                        href={`/api/documents/${encodeURIComponent(
                          doc.id
                        )}?name=${encodeURIComponent(doc.name)}`}
                        download
                      >
                        Voir texte
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Liste des chunks</CardTitle>
          <CardDescription>Vue avancée</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chunk ID</TableHead>
                <TableHead>Aperçu</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Longueur</TableHead>
                <TableHead>Dim</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indexChunks.map((chunk) => (
                <TableRow key={chunk.id}>
                  <TableCell>{chunk.id}</TableCell>
                  <TableCell className="max-w-sm truncate">
                    {chunk.preview}
                  </TableCell>
                  <TableCell>{chunk.doc}</TableCell>
                  <TableCell>{chunk.length}</TableCell>
                  <TableCell>{chunk.dim}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardTitle>Intégrité & Diagnostics</CardTitle>
            <CardDescription>Surveillance du vector store</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {diagnostics.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <Badge
                  variant="outline"
                  className={cn(
                    item.status === "ok" &&
                      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
                    item.status === "warn" &&
                      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
                    item.status === "error" &&
                      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                  )}
                >
                  {item.status === "ok"
                    ? "OK"
                    : item.status === "warn"
                    ? "A vérifier"
                    : "Problème"}
                </Badge>
                <span>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
          <CardHeader>
            <CardTitle>Actions administratives</CardTitle>
            <CardDescription>Maintenance de l’index</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="default">Rebuild complet</Button>
            <Button className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Re-indexer un document
            </Button>
            <Button className="bg-red-100 text-red-800 hover:bg-red-200">
              Purger les chunks
            </Button>
            <Button className="bg-teal-100 text-teal-800 hover:bg-teal-200">
              Exporter (.faiss)
            </Button>
            <Button className="bg-amber-100 text-amber-800 hover:bg-amber-200">
              Exporter (.json)
            </Button>
            <Button className="bg-purple-100 text-purple-800 hover:bg-purple-200">
              Exporter (.chroma)
            </Button>
            <Button className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
              Importer un index
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Paramètres de l’index</CardTitle>
          <CardDescription>Réglages FAISS/Chroma</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="font-medium">Dimension embeddings</div>
          <div>{indexSettings.dim}</div>
          <div className="font-medium">Type d’index</div>
          <div>{indexSettings.type}</div>
          <div className="font-medium">Chunk size</div>
          <div>{indexSettings.chunkSize} tokens</div>
          <div className="font-medium">Chunk overlap</div>
          <div>{indexSettings.chunkOverlap} tokens</div>
          <div className="font-medium">k (retrieval)</div>
          <div>{indexSettings.k}</div>
          <div className="font-medium">Re-ranking</div>
          <div>{indexSettings.rerank}</div>
          <div className="font-medium">Moteur embeddings</div>
          <div>{indexSettings.embeddingModel}</div>
        </CardContent>
      </Card>
    </div>
  )

  const benchmarkView = (
    <div className="space-y-6">
      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Benchmarks modèles LLM</CardTitle>
          <CardDescription>Temps de réponse et hallucinations</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <ChartContainer
            config={{ ms: { label: "Temps (ms)", color: chartColors.ms } }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <BarChart data={benchmarkModelSpeed} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="model" type="category" width={110} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="ms" fill="var(--color-ms)" radius={6} />
            </BarChart>
          </ChartContainer>
          <ChartContainer
            config={{ percent: { label: "Hallucination (%)", color: chartColors.percent } }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <BarChart data={benchmarkHallucination} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="model" type="category" width={110} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="percent" fill="var(--color-percent)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Benchmarks pipelines RAG</CardTitle>
          <CardDescription>Pertinence et temps par pipeline</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <ChartContainer
            config={{
              standard: { label: "Standard", color: chartColors.standard },
              rerank: { label: "Re-ranking", color: chartColors.rerank },
              multi: { label: "Multi-query", color: chartColors.multi },
              agent: { label: "Agent", color: chartColors.agent },
            }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <LineChart data={benchmarkPipelineRelevance} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id={`${benchmarkGradBase}-standard`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.standard} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.standard} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-rerank`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.rerank} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.rerank} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-multi`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.multi} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.multi} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-agent`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.agent} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.agent} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis domain={[0.6, 0.9]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="standard" stroke={`url(#${benchmarkGradBase}-standard)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rerank" stroke={`url(#${benchmarkGradBase}-rerank)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="multi" stroke={`url(#${benchmarkGradBase}-multi)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="agent" stroke={`url(#${benchmarkGradBase}-agent)`} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
          <ChartContainer
            config={{ ms: { label: "Temps (ms)", color: chartColors.ms } }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <BarChart data={benchmarkPipelineTime} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="pipeline" type="category" width={160} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="ms" fill="var(--color-ms)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardContent>
          <ChartContainer
            config={{
              excellent: { label: "Excellent", color: chartColors.excellent },
              bon: { label: "Bon", color: chartColors.bon },
              moyen: { label: "Moyen", color: chartColors.moyen },
              mauvais: { label: "Mauvais", color: chartColors.mauvais },
              nul: { label: "Inutilisable", color: chartColors.nul },
            }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <BarChart data={benchmarkPipelineQuality} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="pipeline" tickLine={false} axisLine={false} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="excellent" stackId="a" fill="var(--color-excellent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="bon" stackId="a" fill="var(--color-bon)" />
              <Bar dataKey="moyen" stackId="a" fill="var(--color-moyen)" />
              <Bar dataKey="mauvais" stackId="a" fill="var(--color-mauvais)" />
              <Bar dataKey="nul" stackId="a" fill="var(--color-nul)" radius={[0, 0, 6, 6]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Heatmap modèles × pipelines</CardTitle>
          <CardDescription>Score qualité (mock)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modèle</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Re-ranking</TableHead>
                <TableHead>Multi-query</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarkHeatmap.map((row) => (
                <TableRow key={row.model}>
                  <TableCell className="font-medium">{row.model}</TableCell>
                  {["standard", "rerank", "multi"].map((key) => (
                    <TableCell key={key}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "tabular-nums",
                          row.pipelines[key as keyof typeof row.pipelines] >= 0.82 &&
                            "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
                          row.pipelines[key as keyof typeof row.pipelines] < 0.76 &&
                            "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                        )}
                      >
                        {row.pipelines[key as keyof typeof row.pipelines]}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Statistiques d’usage</CardTitle>
          <CardDescription>Requêtes par modèle et temps de réponse</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
          <ChartContainer
            config={{
              llama: { label: "Llama 3", color: chartColors.llama },
              mistral: { label: "Mistral", color: chartColors.mistral },
              qwen: { label: "Qwen", color: chartColors.qwen },
              gpt4o: { label: "GPT-4o mini", color: chartColors.gpt4o },
            }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <LineChart data={usageRequestsByModel} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id={`${benchmarkGradBase}-llama`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.llama} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.llama} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-mistral`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.mistral} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.mistral} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-qwen`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.qwen} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.qwen} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-gpt4o`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.gpt4o} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.gpt4o} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="llama" stroke={`url(#${benchmarkGradBase}-llama)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mistral" stroke={`url(#${benchmarkGradBase}-mistral)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="qwen" stroke={`url(#${benchmarkGradBase}-qwen)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gpt4o" stroke={`url(#${benchmarkGradBase}-gpt4o)`} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
          <ChartContainer
            config={{
              standard: { label: "Standard", color: chartColors.standard },
              rerank: { label: "Re-ranking", color: chartColors.rerank },
              multi: { label: "Multi-query", color: chartColors.multi },
            }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <LineChart data={usageResponseTime} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id={`${benchmarkGradBase}-rt-standard`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.standard} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.standard} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-rt-rerank`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.rerank} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.rerank} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id={`${benchmarkGradBase}-rt-multi`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.multi} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.multi} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="standard" stroke={`url(#${benchmarkGradBase}-rt-standard)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rerank" stroke={`url(#${benchmarkGradBase}-rt-rerank)`} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="multi" stroke={`url(#${benchmarkGradBase}-rt-multi)`} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
          <ChartContainer
            config={{
              standard: { label: "Standard", color: chartColors.standard },
              rerank: { label: "Re-ranking", color: chartColors.rerank },
              multi: { label: "Multi-query", color: chartColors.multi },
              agent: { label: "Agent", color: chartColors.agent },
            }}
            className="aspect-video rounded-lg bg-white/70 dark:bg-card border border-primary/15"
          >
            <PieChart>
              <Pie
                data={usagePipelinePie}
                dataKey="value"
                nameKey="label"
                innerRadius={48}
                strokeWidth={0}
                labelLine={false}
                label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
              >
                {usagePipelinePie.map((item) => (
                  <Cell key={item.key} fill={`var(--color-${item.key})`} />
                ))}
              </Pie>
              <Legend />
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
        <CardHeader>
          <CardTitle>Coût</CardTitle>
          <CardDescription>Coût moyen par requête et cumul 30 jours (GPT-4o mini)</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <ChartContainer
            config={{ cost: { label: "Coût (€)", color: chartColors.cost } }}
            className="aspect-video rounded-lg bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:bg-card border border-primary/15"
          >
            <BarChart data={costPerRequest} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="pipeline" type="category" width={160} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="cost" fill="var(--color-cost)" radius={6} />
            </BarChart>
          </ChartContainer>
          <ChartContainer
            config={{ cost: { label: "Cumul (€)", color: chartColors.costCumul } }}
            className="aspect-video rounded-lg bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:bg-card border border-primary/15"
          >
            <LineChart data={costMonthly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id={`${benchmarkGradBase}-cost-cumul`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.costCumul} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.costCumul} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="cost" stroke={`url(#${benchmarkGradBase}-cost-cumul)`} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          onNavSelect={setActiveSection}
          activeItem={activeSection}
        />
        <SidebarInset>
          <SiteHeader title={activeSection} />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {activeSection === "Utilisateurs" ? (
                <>
                  <div className="px-4 lg:px-6 grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Total utilisateurs</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {totalUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Utilisateurs actifs (30 jours)</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {activeUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Nouveaux (30 jours)</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {recentUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Taux d’activité</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {totalUsers === 0
                            ? 0
                            : Math.round((activeUsers / totalUsers) * 100)}
                          %
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                  <div className="px-4 lg:px-6">
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardTitle>Liste des utilisateurs</CardTitle>
                        <CardDescription>Nom, email, date de création, ID</CardDescription>
                        {usersError && (
                          <p className="text-sm text-destructive">
                            {usersError}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Date de création</TableHead>
                              <TableHead>ID</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingUsers ? (
                              <TableRow>
                                <TableCell colSpan={5}>Chargement des utilisateurs…</TableCell>
                              </TableRow>
                            ) : usersState.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5}>Aucun utilisateur trouvé</TableCell>
                              </TableRow>
                            ) : (
                              usersState.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className={`font-medium ${jetBrainsMono.className}`}>
                                    {user.firstName} {user.lastName}
                                  </TableCell>
                                  <TableCell className={jetBrainsMono.className}>
                                    {user.email}
                                  </TableCell>
                                  <TableCell className={jetBrainsMono.className}>
                                    {formatDashboardDate(user.createdAt)}
                                  </TableCell>
                                  <TableCell className={jetBrainsMono.className}>{user.id}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive/50 hover:bg-red-50"
                                      onClick={() => requestDeleteUser(user)}
                                      disabled={deletingUserId === user.id}
                                      aria-label={`Supprimer ${user.firstName} ${user.lastName}`}
                                    >
                                      Supprimer
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : activeSection === "Permissions" ? (
                <>
                  <div className="px-4 lg:px-6 grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Total utilisateurs</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {totalUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Admins</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {adminUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Actifs</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {activeUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardDescription>Non actifs</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {totalUsers - activeUsers}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                  <div className="px-4 lg:px-6">
                    <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                      <CardHeader>
                        <CardTitle>Permissions par utilisateur</CardTitle>
                        <CardDescription>Activer/désactiver le rôle administrateur</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Admin</TableHead>
                              <TableHead>ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usersState.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.firstName} {user.lastName}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={user.admin}
                                      onCheckedChange={() => requestAdminToggle(user.id)}
                                      disabled={adminUpdatingId === user.id}
                                      aria-label={`Toggle admin for ${user.firstName} ${user.lastName}`}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {user.admin ? "Admin" : "Utilisateur"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{user.id}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : activeSection === "Documents" ? (
                <>
                  <div className="px-4 lg:px-6">
                    <Tabs value={docsTab} onValueChange={setDocsTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="list">Liste</TabsTrigger>
                        <TabsTrigger value="details">Détails</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                      </TabsList>
                      <TabsContent value="list" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardDescription>Total documents</CardDescription>
                              <CardTitle className="text-2xl font-semibold tabular-nums">
                                {documentsFs.length}
                              </CardTitle>
                            </CardHeader>
                          </Card>
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardDescription>Indexés</CardDescription>
                              <CardTitle className="text-2xl font-semibold tabular-nums">
                                {indexedDocs}
                              </CardTitle>
                            </CardHeader>
                          </Card>
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardDescription>En cours</CardDescription>
                              <CardTitle className="text-2xl font-semibold tabular-nums">
                                {inProgressDocs}
                              </CardTitle>
                            </CardHeader>
                          </Card>
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardDescription>Erreurs</CardDescription>
                              <CardTitle className="text-2xl font-semibold tabular-nums">
                                {errorDocs}
                              </CardTitle>
                            </CardHeader>
                          </Card>
                        </div>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Documents</CardTitle>
                            <CardDescription>
                              Vue principale des fichiers indexés ou en attente
                            </CardDescription>
                            {deleteDocError ? (
                              <p className="text-sm text-destructive">{deleteDocError}</p>
                            ) : null}
                          </CardHeader>
                          <CardContent className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nom</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Services</TableHead>
                                  <TableHead>Taille</TableHead>
                                  <TableHead>Uploadé le</TableHead>
                                  <TableHead>Par</TableHead>
                                  <TableHead>Confidentialité</TableHead>
                                  <TableHead>Statut</TableHead>
                                  <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documentsFs.map((doc) => (
                                  <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                      {doc.name}
                                    </TableCell>
                                    <TableCell>{doc.type}</TableCell>
                                    <TableCell>{doc.category}</TableCell>
                                    <TableCell>{doc.size}</TableCell>
                                    <TableCell>
                                      {formatDashboardDate(doc.uploadedAt)}
                                    </TableCell>
                                    <TableCell>
                                      {doc.uploader && doc.uploader !== "Dashboard"
                                        ? doc.uploader
                                        : uploaderName}
                                    </TableCell>
                                    <TableCell>{doc.confidentiality}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "capitalize",
                                          doc.status === "Indexé" &&
                                            "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
                                          doc.status === "En cours" &&
                                            "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
                                          doc.status === "Erreur" &&
                                            "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                                        )}
                                      >
                                        {doc.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="space-x-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedDocId(doc.id)
                                          setDocsTab("details")
                                        }}
                                      >
                                        Voir détails
                                      </Button>
                                      <Button
                                        asChild
                                        size="sm"
                                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                                      >
                                        <a
                                          href={`/api/documents/${encodeURIComponent(
                                            doc.id
                                          )}?name=${encodeURIComponent(doc.name)}`}
                                          download
                                        >
                                          Télécharger
                                        </a>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={deletingDocumentId === doc.id}
                                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                                      >
                                        {deletingDocumentId === doc.id ? "Suppression..." : "Supprimer"}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardTitle>Infos générales</CardTitle>
                              <CardDescription>Document sélectionné</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                              <div className="font-medium">Nom</div>
                              <div>{selectedDoc?.name}</div>
                              <div className="font-medium">Auteur</div>
                              <div>{selectedDoc?.uploader}</div>
                              <div className="font-medium">Date / heure</div>
                              <div>
                                {selectedDoc
                                  ? formatDashboardDate(selectedDoc.uploadedAt)
                                  : ""}
                              </div>
                              <div className="font-medium">Poids</div>
                              <div>{selectedDoc?.size}</div>
                              <div className="font-medium">Type</div>
                              <div>{selectedDoc?.type}</div>
                              <div className="font-medium">Services</div>
                              <div>{selectedDoc?.category}</div>
                              <div className="font-medium">Confidentialité</div>
                              <div>{selectedDoc?.confidentiality}</div>
                              <div className="font-medium">Statut</div>
                              <div>{selectedDoc?.status}</div>
                            </CardContent>
                          </Card>
                          <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                            <CardHeader>
                              <CardTitle>Métadonnées RAG</CardTitle>
                              <CardDescription>Indexation & embeddings</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                              <div className="font-medium">Chunks générés</div>
                              <div>{ragMetadata.chunks}</div>
                              <div className="font-medium">Taille embeddings</div>
                              <div>{ragMetadata.embeddingsSize}</div>
                              <div className="font-medium">Vector store</div>
                              <div>{ragMetadata.vectorStore}</div>
                              <div className="font-medium">Dernière indexation</div>
                              <div>{ragMetadata.indexedAt}</div>
                            </CardContent>
                          </Card>
                        </div>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Services autorisés</CardTitle>
                            <CardDescription>
                              Mettre à jour l’accès par service
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              {SERVICE_OPTIONS.map((service) => (
                                <label
                                  key={service}
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  <Checkbox
                                    checked={editServices.includes(service)}
                                    onCheckedChange={() => toggleEditService(service)}
                                    disabled={!selectedDoc}
                                  />
                                  <span>{service}</span>
                                </label>
                              ))}
                            </div>
                            {updateDocError && (
                              <div className="text-sm text-destructive">
                                {updateDocError}
                              </div>
                            )}
                            {updateDocMessage && !updateDocError && (
                              <div className="text-sm text-emerald-600">
                                {updateDocMessage}
                              </div>
                            )}
                            <Button
                              onClick={handleUpdateDocumentServices}
                              disabled={!selectedDoc || updatingDoc}
                            >
                              {updatingDoc ? "Mise à jour..." : "Mettre à jour"}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Chunks</CardTitle>
                            <CardDescription>Extraits indexés</CardDescription>
                          </CardHeader>
                          <CardContent className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Chunk</TableHead>
                                  <TableHead>Aperçu</TableHead>
                                  <TableHead>Embedding (dim)</TableHead>
                                  <TableHead>Score qualité</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {documentChunksLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={5}>Chargement des chunks...</TableCell>
                                  </TableRow>
                                ) : documentChunksError ? (
                                  <TableRow>
                                    <TableCell colSpan={5}>{documentChunksError}</TableCell>
                                  </TableRow>
                                ) : documentChunksState.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5}>
                                      Aucun chunk disponible pour ce document.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  documentChunksState.map((chunk) => {
                                    const isExpanded = expandedChunkId === chunk.id

                                    return (
                                      <React.Fragment key={chunk.id}>
                                        <TableRow>
                                          <TableCell>{chunk.id}</TableCell>
                                          <TableCell className="max-w-xs truncate">
                                            {chunk.preview}
                                          </TableCell>
                                          <TableCell>{chunk.dim}</TableCell>
                                          <TableCell>{chunk.quality}</TableCell>
                                          <TableCell>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                setExpandedChunkId(
                                                  isExpanded ? null : chunk.id
                                                )
                                              }
                                            >
                                              {isExpanded ? "Masquer" : "Voir"}
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                        {isExpanded ? (
                                          <TableRow>
                                            <TableCell colSpan={5} className="bg-muted/40">
                                              <div className="text-sm whitespace-pre-wrap">
                                                {chunk.text || "Contenu indisponible."}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ) : null}
                                      </React.Fragment>
                                    )
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Permissions</CardTitle>
                            <CardDescription>Accès par utilisateur</CardDescription>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-2 text-sm">
                            <div>Maxime : 🔓 lecture</div>
                            <div>Baptiste : 🔓 lecture</div>
                            <div>Admin : 🔑 total</div>
                            <div>Support : 🔓 lecture</div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="upload" className="space-y-4">
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Uploader un document</CardTitle>
                            <CardDescription>
                              Ajoutez un fichier et ses métadonnées pour indexation
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">
                                Fichiers (jusqu’à 10)
                              </label>
                              <Input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={(event) => {
                                  const files = Array.from(event.target.files ?? []).slice(0, 10)
                                  setUploadFiles(files)
                                  setUploadError("")
                                  setUploadMessage("")
                                }}
                              />
                              <div className="text-xs text-muted-foreground">
                                Formats : PDF, DOCX, TXT, Markdown · Limite 10 fichiers par lot (stockés dans data/doc)
                              </div>
                              {uploadFiles.length > 0 && (
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {uploadFiles.map((file) => (
                                    <li key={file.name} className="flex items-center justify-between gap-2">
                                      <span className="truncate">{file.name}</span>
                                      <span className="whitespace-nowrap">
                                        {formatFileSize(file.size)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">
                                Services autorisés
                              </label>
                              <div className="grid gap-2 md:grid-cols-2">
                                {SERVICE_OPTIONS.map((service) => (
                                  <label
                                    key={service}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <Checkbox
                                      checked={uploadServices.includes(service)}
                                      onCheckedChange={() => toggleUploadService(service)}
                                    />
                                    <span>{service}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Les utilisateurs rattachés à ces services pourront consulter le document.
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Tags</label>
                              <Input
                                placeholder="incident, sécurité, process..."
                                value={uploadTags}
                                onChange={(event) => setUploadTags(event.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Confidentialité</label>
                              <div className="flex gap-3 text-sm">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="confidentiality"
                                    value="Public interne"
                                    checked={uploadConfidentiality === "Public interne"}
                                    onChange={(event) => setUploadConfidentiality(event.target.value)}
                                  />
                                  Public interne
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="confidentiality"
                                    value="Restreint"
                                    checked={uploadConfidentiality === "Restreint"}
                                    onChange={(event) => setUploadConfidentiality(event.target.value)}
                                  />
                                  Restreint
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="confidentiality"
                                    value="Très sensible"
                                    checked={uploadConfidentiality === "Très sensible"}
                                    onChange={(event) => setUploadConfidentiality(event.target.value)}
                                  />
                                  Très sensible
                                </label>
                              </div>
                            </div>
                            <div className="grid gap-1 text-sm text-muted-foreground">
                              <div>Extraction texte · Chunking · Embeddings · Indexation FAISS/Chroma</div>
                              <div>Attribution permissions</div>
                            </div>
                            {uploadError && (
                              <div className="text-sm text-destructive">{uploadError}</div>
                            )}
                            {uploadMessage && !uploadError && (
                              <div className="text-sm text-emerald-600">{uploadMessage}</div>
                            )}
                            <Button
                              onClick={handleDocumentsUpload}
                              disabled={uploadingDocs || uploadFiles.length === 0}
                            >
                              {uploadingDocs ? "Upload en cours..." : "Indexer les documents"}
                            </Button>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              ) : activeSection === "Index vectoriel" ? (
                <div className="px-4 lg:px-6">{indexView}</div>
              ) : activeSection === "Benchmarks LLM / RAG" ? (
                <div className="px-4 lg:px-6">{benchmarkView}</div>
              ) : activeSection === "Logs & Activité" ? (
                <div className="px-4 lg:px-6 space-y-4">
                  <Tabs defaultValue="requetes" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="requetes">Historique requêtes</TabsTrigger>
                      <TabsTrigger value="systeme">Activité système</TabsTrigger>
                      <TabsTrigger value="erreurs">Erreurs & alertes</TabsTrigger>
                      <TabsTrigger value="detail">Détail requête</TabsTrigger>
                      <TabsTrigger value="stats">Stats activité</TabsTrigger>
                    </TabsList>

                    <TabsContent value="requetes" className="space-y-4">
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Requêtes utilisateur (historique global)</CardTitle>
                          <CardDescription>Journal central des appels RAG</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead>Modèle</TableHead>
                                <TableHead>Pipeline</TableHead>
                                <TableHead>Temps</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {requestLogs.map((log) => (
                                <TableRow key={`${log.date}-${log.user}`}>
                                  <TableCell>{log.date}</TableCell>
                                  <TableCell>{log.user}</TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {log.question}
                                  </TableCell>
                                  <TableCell>{log.model}</TableCell>
                                  <TableCell>{log.pipeline}</TableCell>
                                  <TableCell>{log.time}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        log.status === "success" &&
                                          "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
                                        log.status === "error" &&
                                          "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
                                        log.status === "warn" &&
                                          "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                                      )}
                                    >
                                      {log.status === "success"
                                        ? "Succès"
                                        : log.status === "error"
                                        ? "Erreur"
                                        : "À vérifier"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" variant="outline">
                                      Voir détails
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="systeme" className="space-y-4">
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Activité système</CardTitle>
                          <CardDescription>Backend / index / uploads</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Heure</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Statut</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {systemLogs.map((log) => (
                                <TableRow key={`${log.time}-${log.desc}`}>
                                  <TableCell>{log.time}</TableCell>
                                  <TableCell>{log.type}</TableCell>
                                  <TableCell>{log.desc}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        log.status === "ok" &&
                                          "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
                                        log.status === "error" &&
                                          "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                                      )}
                                    >
                                      {log.status === "ok" ? "OK" : "Erreur"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="erreurs" className="space-y-4">
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Erreurs & alertes</CardTitle>
                          <CardDescription>LLM, indexation, permissions, backend</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Heure</TableHead>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {errorLogs.map((log) => (
                                <TableRow key={`${log.time}-${log.user}-${log.type}`}>
                                  <TableCell>{log.time}</TableCell>
                                  <TableCell>{log.user}</TableCell>
                                  <TableCell>{log.type}</TableCell>
                                  <TableCell className="max-w-md truncate">
                                    {log.desc}
                                  </TableCell>
                                  <TableCell className="space-x-2">
                                    <Button size="sm" variant="outline">
                                      Corriger
                                    </Button>
                                    <Button size="sm" variant="ghost">
                                      Relancer
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="detail" className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Informations générales</CardTitle>
                            <CardDescription>Contexte de la requête</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-2 text-sm">
                            <div>
                              <span className="font-medium">Question :</span>{" "}
                              {requestDetail.question}
                            </div>
                            <div>
                              <span className="font-medium">Utilisateur :</span>{" "}
                              {requestDetail.user}
                            </div>
                            <div>
                              <span className="font-medium">Date / heure :</span>{" "}
                              {requestDetail.datetime}
                            </div>
                            <div>
                              <span className="font-medium">Modèle LLM :</span>{" "}
                              {requestDetail.model}
                            </div>
                            <div>
                              <span className="font-medium">Pipeline :</span>{" "}
                              {requestDetail.pipeline}
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 text-muted-foreground">
                              <div>top_k : {requestDetail.params.topK}</div>
                              <div>chunk_size : {requestDetail.params.chunkSize}</div>
                              <div>overlap : {requestDetail.params.overlap}</div>
                              <div>re-ranking : {requestDetail.params.rerank}</div>
                              <div>Temps total : {requestDetail.params.totalTime}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Embedding de la question</CardTitle>
                            <CardDescription>Compréhension sémantique</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-2 text-sm">
                            <div>
                              <span className="font-medium">Texte :</span>{" "}
                              {requestDetail.embedding.text}
                            </div>
                            <div>
                              <span className="font-medium">Dimension :</span>{" "}
                              {requestDetail.embedding.dim}
                            </div>
                            <div>
                              <span className="font-medium">Modèle :</span>{" "}
                              {requestDetail.embedding.model}
                            </div>
                            <div>
                              <span className="font-medium">Norme :</span>{" "}
                              {requestDetail.embedding.norm}
                            </div>
                            <div className="break-words text-xs text-muted-foreground">
                              Aperçu : {requestDetail.embedding.preview}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Résultats du retrieval</CardTitle>
                          <CardDescription>Chunks récupérés avant génération</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rang</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Document</TableHead>
                                <TableHead>Chunk ID</TableHead>
                                <TableHead>Page</TableHead>
                                <TableHead>Aperçu</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {requestDetail.retrieval.map((chunk) => (
                                <TableRow key={chunk.chunkId}>
                                  <TableCell>{chunk.rank}</TableCell>
                                  <TableCell>{chunk.score}</TableCell>
                                  <TableCell>{chunk.doc}</TableCell>
                                  <TableCell>{chunk.chunkId}</TableCell>
                                  <TableCell>{chunk.page}</TableCell>
                                  <TableCell className="max-w-md truncate">
                                    {chunk.preview}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                      {requestDetail.reranking.enabled ? (
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardTitle>Re-ranking</CardTitle>
                            <CardDescription>Comparaison avant / après</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4 @xl/main:grid-cols-3">
                            <div className="rounded-md border border-primary/10 bg-background p-3 text-sm">
                              <div className="font-medium">Ordre avant</div>
                              <div className="mt-2 space-y-1 text-muted-foreground">
                                {requestDetail.reranking.before.map((item) => (
                                  <div key={item.chunkId}>
                                    {item.chunkId} · rang {item.rank} · score {item.score}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-md border border-primary/10 bg-background p-3 text-sm">
                              <div className="font-medium">Ordre après</div>
                              <div className="mt-2 space-y-1 text-muted-foreground">
                                {requestDetail.reranking.after.map((item) => (
                                  <div key={item.chunkId}>
                                    {item.chunkId} · rang {item.rank} · score {item.score}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-md border border-primary/10 bg-background p-3 text-sm">
                              <div className="font-medium">Chunks supprimés</div>
                              <div className="mt-2 space-y-1 text-muted-foreground">
                                {requestDetail.reranking.removed.length
                                  ? requestDetail.reranking.removed.map((item) => (
                                      <div key={item.chunkId}>
                                        {item.chunkId} · {item.reason}
                                      </div>
                                    ))
                                  : "Aucun"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Prompt final envoyé au LLM</CardTitle>
                          <CardDescription>Contexte + règles système</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                            {requestDetail.prompt}
                          </pre>
                        </CardContent>
                      </Card>
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Réponse générée + sources</CardTitle>
                          <CardDescription>Résultat final du modèle</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <div>{requestDetail.answer.text}</div>
                          <div className="text-muted-foreground">
                            Temps : {requestDetail.answer.time} · Tokens :{" "}
                            {requestDetail.answer.tokens}
                          </div>
                          <div className="text-muted-foreground">
                            Note qualité : {requestDetail.answer.quality}/5
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Marquer comme bonne
                            </Button>
                            <Button size="sm" variant="outline">
                              Marquer comme mauvaise
                            </Button>
                          </div>
                          <div className="overflow-x-auto pt-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Document</TableHead>
                                  <TableHead>Chunk ID</TableHead>
                                  <TableHead>Page</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {requestDetail.answer.sources.map((source) => (
                                  <TableRow key={`${source.doc}-${source.chunkId}`}>
                                    <TableCell>{source.doc}</TableCell>
                                    <TableCell>{source.chunkId}</TableCell>
                                    <TableCell>{source.page}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="stats" className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-4">
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardDescription>Requêtes (24h)</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums">
                              {activityStats.requestsToday}
                            </CardTitle>
                          </CardHeader>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardDescription>Temps moyen</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums">
                              {activityStats.avgResponseMs} ms
                            </CardTitle>
                          </CardHeader>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardDescription>Erreurs (24h)</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums">
                              {activityStats.errors}
                            </CardTitle>
                          </CardHeader>
                        </Card>
                        <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                          <CardHeader>
                            <CardDescription>Top utilisateurs</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums">
                              {topUsers.length}
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </div>
                      <Card className="shadow-none bg-white/80 dark:bg-card border border-primary/15">
                        <CardHeader>
                          <CardTitle>Top utilisateurs actifs</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2 text-sm">
                          {topUsers.map((u) => (
                            <Badge
                              key={u.name}
                              variant="outline"
                              className="bg-primary/10 text-foreground"
                            >
                              {u.name}
                            </Badge>
                          ))}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <>
                  <SectionCards />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  <div className="px-4 lg:px-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="shadow-none  dark:bg-primary/15 border border-primary/15">
                      <CardHeader>
                        <CardTitle>Répartition des requêtes par modèle</CardTitle>
                        <CardDescription>Basé sur les modèles disponibles dans le chat</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={modelShareConfig}
                          className="aspect-video rounded-lg  bg-white/70 dark:bg-card"
                        >
                          <PieChart>
                            <defs>
                              {modelShare
                                .filter((item) => item.value > 0)
                                .map((item) => (
                                <linearGradient
                                  key={item.key}
                                  id={`${pieGradientBase}-${item.key}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor={`var(--color-${item.key})`}
                                    stopOpacity={0.95}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor={`var(--color-${item.key})`}
                                    stopOpacity={0.65}
                                  />
                                </linearGradient>
                              ))}
                            </defs>
                            <Pie
                              data={modelShare.filter((item) => item.value > 0)}
                              dataKey="value"
                              nameKey="label"
                              innerRadius={48}
                              strokeWidth={0}
                              labelLine={false}
                              label={({ percent }) =>
                                Number.isFinite(percent)
                                  ? `${Math.round(percent * 100)}%`
                                  : "0%"
                              }
                            >
                              {modelShare
                                .filter((item) => item.value > 0)
                                .map((item) => (
                                <Cell
                                  key={item.key}
                                  fill={`url(#${pieGradientBase}-${item.key})`}
                                />
                              ))}
                            </Pie>
                            <Legend
                              verticalAlign="bottom"
                              align="center"
                              iconType="circle"
                              formatter={(value) => (
                                <span className="text-sm text-foreground">{value}</span>
                              )}
                              payload={modelShare
                                .filter((item) => item.value > 0)
                                .map((item) => ({
                                  value: item.label,
                                  type: "circle",
                                  color: `var(--color-${item.key})`,
                                }))}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) => {
                                    const parsed =
                                      typeof value === "number"
                                        ? value
                                        : Number.parseFloat(String(value))
                                    const label = Number.isFinite(parsed)
                                      ? `${parsed}%`
                                      : `${value}`
                                    return [label, name]
                                  }}
                                />
                              }
                            />
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none  dark:bg-primary/15 border border-primary/15">
                      <CardHeader>
                        <CardTitle>Pipelines RAG utilisés</CardTitle>
                        <CardDescription>Standard, re-ranking, multi-query, agent</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={pipelineConfig}
                          className="aspect-video rounded-lg bg-white/70 dark:bg-card"
                        >
                          <BarChart data={pipelineUsage} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="pipeline" tickLine={false} axisLine={false} interval={0} angle={-10} height={60} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <defs>
                              <linearGradient id={pipelineGradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="var(--color-requests)" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <Bar
                              dataKey="requests"
                              fill={`url(#${pipelineGradientId})`}
                              radius={6}
                              maxBarSize={48}
                            />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none  dark:bg-primary/15 border border-primary/15">
                      <CardHeader>
                        <CardTitle>Top utilisateurs actifs</CardTitle>
                        <CardDescription>Classement sur 7 jours</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={topUsersConfig}
                          className="aspect-video rounded-lg bg-white/70 dark:bg-card"
                        >
                          <BarChart
                            data={topUsers}
                            layout="vertical"
                            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={90}
                              tickLine={false}
                              axisLine={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <defs>
                              <linearGradient id={topUsersGradientId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.85} />
                                <stop offset="100%" stopColor="var(--color-requests)" stopOpacity={0.55} />
                              </linearGradient>
                            </defs>
                            <Bar
                              dataKey="requests"
                              fill={`url(#${topUsersGradientId})`}
                              radius={6}
                              barSize={18}
                            />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none  dark:bg-primary/15 border border-primary/15">
                      <CardHeader>
                        <CardTitle>Top documents consultés</CardTitle>
                        <CardDescription>Volume et impact métier</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={topDocsConfig}
                          className="aspect-video rounded-lg   bg-white/70 dark:bg-card"
                        >
                          <BarChart
                            data={topDocs}
                            layout="vertical"
                            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="title"
                              type="category"
                              width={130}
                              tickLine={false}
                              axisLine={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <defs>
                              <linearGradient id={topDocsGradientId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--color-hits)" stopOpacity={0.85} />
                                <stop offset="100%" stopColor="var(--color-hits)" stopOpacity={0.55} />
                              </linearGradient>
                            </defs>
                            <Bar
                              dataKey="hits"
                              fill={`url(#${topDocsGradientId})`}
                              radius={6}
                              barSize={18}
                            />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-md shadow-lg border border-primary/20">
            <CardHeader>
              <CardTitle>Supprimer l’utilisateur ?</CardTitle>
              <CardDescription>
                {confirmDeleteUser.firstName} {confirmDeleteUser.lastName} (
                {confirmDeleteUser.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Cette action est irréversible et retirera l’accès à l’espace.</p>
            </CardContent>
            <CardContent className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={deletingUserId === confirmDeleteUser.id}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deletingUserId === confirmDeleteUser.id}
              >
                {deletingUserId === confirmDeleteUser.id ? "Suppression..." : "Supprimer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {pendingAdminToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-lg border border-primary/20">
            <CardHeader>
              <CardTitle>Confirmer la modification</CardTitle>
              <CardDescription>
                {pendingAdminToggle.nextIsAdmin
                  ? "Attribuer le rôle admin"
                  : "Retirer le rôle admin"}{" "}
                pour {pendingAdminToggle.user.firstName}{" "}
                {pendingAdminToggle.user.lastName} (
                {pendingAdminToggle.user.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelAdminToggle}>
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={confirmAdminToggle}
                disabled={
                  !!pendingAdminToggle &&
                  adminUpdatingId === pendingAdminToggle.user.id
                }
              >
                {!!pendingAdminToggle && adminUpdatingId === pendingAdminToggle.user.id
                  ? "Mise à jour…"
                  : "Confirmer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </SidebarProvider>
    </>
  )
}
