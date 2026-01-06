"use client"

import type React from "react"
import { Fragment, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import type { ChatRecord } from "@/lib/chats"
import type { ProjectRecord } from "@/lib/projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: Array<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  start: () => void
  stop: () => void
}

const renderInlineMarkdown = (text: string) => {
  const elements: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  const patterns = [
    { type: "bold", regex: /\*\*(.+?)\*\*/ },
    { type: "code", regex: /`([^`]+?)`/ },
    { type: "italic", regex: /\*(?!\s)([^*]+?)\*(?!\s)/ },
    { type: "link", regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
  ] as const

  while (remaining.length > 0) {
    let earliest:
      | { type: (typeof patterns)[number]["type"]; match: RegExpMatchArray }
      | null = null

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex)
      if (!match || match.index === undefined) continue
      if (!earliest || match.index < earliest.match.index) {
        earliest = { type: pattern.type, match }
      }
    }

    if (!earliest) {
      elements.push(remaining)
      break
    }

    if (earliest.match.index > 0) {
      elements.push(remaining.slice(0, earliest.match.index))
    }

    const [fullMatch, partOne, partTwo] = earliest.match
    if (earliest.type === "bold") {
      elements.push(<strong key={`bold-${keyIndex++}`}>{partOne}</strong>)
    } else if (earliest.type === "italic") {
      elements.push(<em key={`italic-${keyIndex++}`}>{partOne}</em>)
    } else if (earliest.type === "code") {
      elements.push(
        <code key={`code-${keyIndex++}`} className="chat-inline-code">
          {partOne}
        </code>
      )
    } else if (earliest.type === "link") {
      elements.push(
        <a
          key={`link-${keyIndex++}`}
          href={partTwo}
          target="_blank"
          rel="noreferrer"
          className="chat-link"
        >
          {partOne}
        </a>
      )
    }

    remaining = remaining.slice(earliest.match.index + fullMatch.length)
  }

  return elements
}

const renderMarkdown = (content: string) => {
  const blocks = content.split(/\n{2,}/)
  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n")
    const isList = lines.every((line) => line.trim().startsWith("- "))

    if (isList) {
      return (
        <ul key={`list-${blockIndex}`} className="chat-list">
          {lines.map((line, lineIndex) => (
            <li key={`list-item-${blockIndex}-${lineIndex}`}>
              {renderInlineMarkdown(line.replace(/^\s*-\s*/, ""))}
            </li>
          ))}
        </ul>
      )
    }

    return (
      <p key={`para-${blockIndex}`} className="chat-paragraph">
        {lines.map((line, lineIndex) => (
          <Fragment key={`line-${blockIndex}-${lineIndex}`}>
            {renderInlineMarkdown(line)}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>
    )
  })
}

export default function ChatPage() {
  const router = useRouter()
  const logoSrc = "/logo.png"
  const models = [
    { value: "llama3.2", label: "Llama 3.2", icon: "/icon-meta.jpg" },
    { value: "llama3", label: "Llama 3", icon: "/icon-meta.jpg" },
    { value: "mistral", label: "Mistral", icon: "/icon-mistral.png" },
    { value: "qwen2.5", label: "Qwen 2.5", icon: "/icon-deepseek.jpg" },
    { value: "gemma2", label: "Gemma 2", icon: "/icon-gemini-ai.jpg" },
  ]
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<
    {
      id: string
      role: "user" | "assistant"
      content: string
      status?: "loading" | "typing" | "done"
    }[]
  >([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; size: number }[]
  >([])
  const [fileNotice, setFileNotice] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [chats, setChats] = useState<ChatRecord[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [chatError, setChatError] = useState("")
  const [projectError, setProjectError] = useState("")
  const [projectNameInput, setProjectNameInput] = useState("")
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [movingChatId, setMovingChatId] = useState<string | null>(null)
  const [actionMenuChatId, setActionMenuChatId] = useState<string | null>(null)
  const [projectPickerChatId, setProjectPickerChatId] = useState<string | null>(null)
  const [chatTitleInput, setChatTitleInput] = useState("")
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
  const [projectRenameInput, setProjectRenameInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [session, setSession] = useState<{
    email: string
    admin: boolean
    firstName?: string | null
    lastName?: string | null
  } | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [emailEditMode, setEmailEditMode] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [emailUpdating, setEmailUpdating] = useState(false)
  const [emailUpdateError, setEmailUpdateError] = useState("")
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState("")
  const [nameEditMode, setNameEditMode] = useState(false)
  const [firstNameInput, setFirstNameInput] = useState("")
  const [lastNameInput, setLastNameInput] = useState("")
  const [nameUpdating, setNameUpdating] = useState(false)
  const [nameUpdateError, setNameUpdateError] = useState("")
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState("")
  const [passwordEditMode, setPasswordEditMode] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordUpdateError, setPasswordUpdateError] = useState("")
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState("")
  const [exportingData, setExportingData] = useState(false)
  const [exportError, setExportError] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [feedbackById, setFeedbackById] = useState<
    Record<string, "up" | "down" | null>
  >({})
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(0)
  const typingTimeoutsRef = useRef<number[]>([])
  const skipNextLoadForChatId = useRef<string | null>(null)

  const clearTypingTimeouts = () => {
    typingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    typingTimeoutsRef.current = []
  }

  const mapToOllamaMessages = (
    entries: { role: "user" | "assistant"; content: string }[]
  ) =>
    entries
      .filter((entry) => entry.content && entry.content.trim().length > 0)
      .map((entry) => ({ role: entry.role, content: entry.content }))

  const persistMessage = async (
    chatId: string,
    role: "user" | "assistant",
    content: string
  ) => {
    try {
      await fetch("/api/chat-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, role, content }),
      })
    } catch (error) {
      console.error("Impossible d'enregistrer le message", error)
    }
  }

  const requestAssistantReply = async (
    messages: { role: "user" | "assistant"; content: string }[],
    assistantId: string,
    chatId: string
  ) => {
    type SimpleEntry = {
      id: string
      role: "user" | "assistant"
      content: string
      status?: "loading" | "typing" | "done"
    }

    const updateAssistant = (updater: (entry: SimpleEntry) => SimpleEntry) => {
      setChatHistory((prev) =>
        prev.map((entry) =>
          entry.id === assistantId ? updater(entry) : entry
        )
      )
    }

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel.value || "llama3.2",
          messages,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        const detail =
          (text && text.trim()) ||
          `Impossible d'obtenir la réponse (statut ${res.status})`
        throw new Error(detail)
      }

      if (!res.body) {
        throw new Error("Flux de réponse vide")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let acc = ""

      while (true) {
        const { value, done } = await reader.read()
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done })
        buffer += chunk
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const raw of lines) {
          const line = raw.trim()
          if (!line) continue
          try {
            const data = JSON.parse(line)
            const delta =
              typeof data?.message?.content === "string"
                ? data.message.content
                : ""
            if (delta) {
              acc += delta
              updateAssistant((entry) => ({
                ...entry,
                content: acc,
                status: data?.done ? "done" : "typing",
              }))
            }
            if (data?.done) {
              updateAssistant((entry) => ({ ...entry, status: "done" }))
            }
          } catch {
            // ignore malformed lines
          }
        }

        if (done) break
      }

      // Safeguard: ensure final status/content are set
      const finalContent = acc || "Pas de réponse"
      updateAssistant((entry) => ({
        ...entry,
        content: finalContent,
        status: "done",
      }))
      await persistMessage(chatId, "assistant", finalContent)
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Réponse indisponible"
      const fallback = /fetch failed/i.test(rawMessage)
        ? "Impossible de joindre le modèle. Vérifiez qu'il est bien lancé localement."
        : rawMessage
      setChatHistory((prev) =>
        prev.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                content: fallback,
                status: "done",
              }
            : entry
        )
      )
      try {
        await persistMessage(chatId, "assistant", fallback)
      } catch (persistError) {
        console.error("Impossible d'enregistrer le message d'erreur", persistError)
      }
      setChatError(fallback)
    }
  }

  const startAssistantResponse = (assistantId: string, chatId?: string | null) => {
    if (!chatId) {
      setChatError("Sélectionnez ou créez un chat avant d'envoyer un message.")
      return
    }
    clearTypingTimeouts()
    setChatHistory((prev) =>
      prev.map((entry) =>
        entry.id === assistantId
          ? { ...entry, content: "", status: "loading" }
          : entry
      )
    )
    const messages = mapToOllamaMessages(
      chatHistory.filter((entry) => entry.id !== assistantId)
    )
    requestAssistantReply(messages, assistantId, chatId)
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error("Impossible de copier le message", error)
    }
  }

  const handleShare = async (content: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: content })
      } else {
        await handleCopy(content)
      }
    } catch (error) {
      console.error("Impossible de partager le message", error)
    }
  }

  const handleFeedback = (id: string, value: "up" | "down") => {
    setFeedbackById((prev) => ({
      ...prev,
      [id]: prev[id] === value ? null : value,
    }))
  }

  const createChat = async (
    options: { title?: string; projectId?: string | null; silent?: boolean } = {}
  ) => {
    const { title, projectId, silent } = options
    if (!silent && isCreatingChat) return null
    if (!silent) setIsCreatingChat(true)
    setChatError("")

    const trimmedTitle = title?.trim()
    const unassignedCount = chats.filter((chat) => !chat.projectId).length
    const fallbackTitle =
      trimmedTitle && trimmedTitle.length > 0
        ? trimmedTitle
        : `Nouveau chat ${unassignedCount + 1}`
    const targetProjectId = projectId ?? selectedProjectId ?? null

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: fallbackTitle, projectId: targetProjectId }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return null
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de créer le chat")
      }

      const created = payload?.chat as ChatRecord | undefined

      if (created) {
        skipNextLoadForChatId.current = created.id
        setChats((prev) => {
          const next = [created, ...prev.filter((chat) => chat.id !== created.id)]
          return next.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        })
        setProjects((prev) =>
          prev.map((project) =>
            project.id === created.projectId
              ? { ...project, updatedAt: created.updatedAt }
              : project
          )
        )
        setSelectedProjectId(created.projectId)
        setSelectedChatId(created.id)
      }

      return created ?? null
    } catch (error) {
      console.error("Erreur lors de la création du chat", error)
      const message =
        error instanceof Error ? error.message : "Impossible de créer un nouveau chat"
      setChatError(message)
      return null
    } finally {
      if (!silent) {
        setIsCreatingChat(false)
      }
    }
  }

  const handleNewChat = async () => {
    if (isCreatingChat) return
    await createChat({ projectId: selectedProjectId })
  }

  const openProjectModal = () => {
    setProjectError("")
    setProjectNameInput(`Projet ${projects.length + 1}`)
    setShowProjectModal(true)
  }

  const handleNewProject = async () => {
    if (isCreatingProject) return
    setProjectError("")

    const name = projectNameInput.trim()
    if (!name) {
      setProjectError("Le nom du projet est requis")
      return
    }

    setIsCreatingProject(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de créer le projet")
      }

      const created = payload?.project as ProjectRecord | undefined
      if (created) {
        setProjects((prev) =>
          [...prev.filter((p) => p.id !== created.id), created].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        )
        setSelectedProjectId(created.id)
        setSelectedChatId(null)
        setShowProjectModal(false)
      }
    } catch (error) {
      console.error("Erreur lors de la création du projet", error)
      const message =
        error instanceof Error ? error.message : "Impossible de créer un projet"
      setProjectError(message)
    } finally {
      setIsCreatingProject(false)
    }
  }

  const startRenameProject = (project: ProjectRecord) => {
    setRenamingProjectId(project.id)
    setProjectRenameInput(project.name)
    setProjectError("")
  }

  const cancelRenameProject = () => {
    setRenamingProjectId(null)
    setProjectRenameInput("")
  }

  const handleRenameProject = async () => {
    if (!renamingProjectId) return
    const nextName = projectRenameInput.trim()
    if (!nextName) {
      setProjectError("Le nom du projet est requis")
      return
    }
    setProjectError("")
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: renamingProjectId, name: nextName }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de renommer le projet")
      }

      const updated = payload?.project as ProjectRecord | undefined
      if (updated) {
        setProjects((prev) =>
          prev
            .map((p) => (p.id === updated.id ? updated : p))
            .sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
        )
        setSelectedProjectId(updated.id)
      }
    } catch (error) {
      console.error("Erreur lors du renommage du projet", error)
      const message =
        error instanceof Error ? error.message : "Impossible de renommer le projet"
      setProjectError(message)
    } finally {
      cancelRenameProject()
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (deletingProjectId) return
    setProjectError("")
    setDeletingProjectId(projectId)
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de supprimer le projet")
      }

      const nextProjects = Array.isArray(payload?.projects) ? payload.projects : []
      const nextChats = Array.isArray(payload?.chats) ? payload.chats : []
      setProjects(nextProjects)
      setChats(nextChats)
      const resolvedProjectId = nextProjects.some(
        (p: ProjectRecord) => p.id === selectedProjectId
      )
        ? selectedProjectId
        : null
      setSelectedProjectId(resolvedProjectId)
      const unassignedAfterDelete = nextChats.filter(
        (chat: ChatRecord) => !chat.projectId
      )
      const projectChats = resolvedProjectId
        ? nextChats.filter((chat: ChatRecord) => chat.projectId === resolvedProjectId)
        : unassignedAfterDelete
      setSelectedChatId(projectChats[0]?.id ?? unassignedAfterDelete[0]?.id ?? null)
    } catch (error) {
      console.error("Erreur lors de la suppression du projet", error)
      const message =
        error instanceof Error ? error.message : "Impossible de supprimer le projet"
      setProjectError(message)
    } finally {
      setDeletingProjectId(null)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    if (deletingChatId) return
    setChatError("")
    setDeletingChatId(chatId)
    try {
      const res = await fetch("/api/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de supprimer le chat")
      }

      setChats((prev) => {
        const next = prev.filter((chat) => chat.id !== chatId)
        if (selectedChatId === chatId) {
          const projectChats = next.filter((chat) => chat.projectId === selectedProjectId)
          setSelectedChatId(projectChats[0]?.id ?? null)
        }
        return next
      })
    } catch (error) {
      console.error("Erreur lors de la suppression du chat", error)
      const message =
        error instanceof Error ? error.message : "Impossible de supprimer le chat"
      setChatError(message)
    } finally {
      setDeletingChatId(null)
    }
  }

  const handleMoveChat = async (chatId: string, projectId: string | null) => {
    if (movingChatId) return
    setChatError("")
    const targetValue = projectId || null
    setMovingChatId(chatId)
    setActionMenuChatId(null)
    try {
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, projectId: targetValue }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de déplacer le chat")
      }

      const updated = payload?.chat as ChatRecord | undefined
      if (updated) {
        setChats((prev) =>
          prev
            .map((chat) => (chat.id === updated.id ? updated : chat))
            .sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
        )
        if (selectedChatId === chatId && updated.projectId !== selectedProjectId) {
          setSelectedProjectId(updated.projectId)
        }
      }
    } catch (error) {
      console.error("Erreur lors du déplacement du chat", error)
      const message =
        error instanceof Error ? error.message : "Impossible de déplacer le chat"
      setChatError(message)
    } finally {
      setMovingChatId(null)
      setProjectPickerChatId(null)
    }
  }

  const startRename = (chat: ChatRecord) => {
    setRenamingChatId(chat.id)
    setChatTitleInput(chat.title || "")
    setChatError("")
    setActionMenuChatId(null)
  }

  const cancelRename = () => {
    setRenamingChatId(null)
    setChatTitleInput("")
  }

  const handleRenameChat = async () => {
    if (!renamingChatId) return
    const nextTitle = chatTitleInput.trim()
    if (!nextTitle) {
      setChatError("Le titre ne peut pas être vide")
      return
    }
    setChatError("")
    try {
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: renamingChatId, title: nextTitle }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de renommer le chat")
      }

      const updated = payload?.chat as ChatRecord | undefined
      if (updated) {
        setChats((prev) =>
          prev
            .map((chat) => (chat.id === updated.id ? updated : chat))
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
        )
      }
    } catch (error) {
      console.error("Erreur lors du renommage du chat", error)
      const message =
        error instanceof Error ? error.message : "Impossible de renommer le chat"
      setChatError(message)
    } finally {
      cancelRename()
    }
  }

  const handleTextareaInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(el.scrollHeight, 240)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > nextHeight ? "auto" : "hidden"
  }

  const handleSendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || isSending) return
    try {
      setIsSending(true)
      setChatError("")

      let chatId = selectedChatId
      if (!chatId) {
        const created = await createChat({
          projectId: selectedProjectId,
          silent: true,
        })
        if (!created) {
          return
        }
        chatId = created.id
      }

      if (!chatId) {
        return
      }

      const userId = `user-${Date.now()}-${messageIdRef.current++}`
      const assistantId = `assistant-${Date.now()}-${messageIdRef.current++}`
      const userEntry = {
        id: userId,
        role: "user" as const,
        content: trimmed,
        status: "done",
      }
      const assistantEntry = {
        id: assistantId,
        role: "assistant" as const,
        content: "",
        status: "loading",
      }
      const historyMessages = mapToOllamaMessages(chatHistory)
      const payloadMessages = [
        ...historyMessages,
        { role: "user" as const, content: trimmed },
      ]

      setChatHistory((prev) => [...prev, userEntry, assistantEntry])
      setMessage("")
      clearTypingTimeouts()
      await persistMessage(chatId, "user", trimmed)
      await requestAssistantReply(payloadMessages, assistantId, chatId)
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    handleTextareaInput()
  }, [])

  useEffect(() => {
    handleTextareaInput()
  }, [message])

  useEffect(() => {
    return () => {
      clearTypingTimeouts()
    }
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [chatHistory])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognitionCtor =
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition) as
        | (new () => SpeechRecognitionInstance)
        | undefined
    if (!SpeechRecognitionCtor) {
      recognitionRef.current = null
      return
    }
    const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor()
    recognition.lang = "fr-FR"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const result = event.results[event.resultIndex]
      if (!result?.isFinal) return
      const transcript = result[0].transcript.trim()
      if (!transcript) return
      setMessage((prev) => {
        const base = prev.trim()
        return base ? `${base} ${transcript}` : transcript
      })
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [])

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return
    const mapped = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
    }))
    setUploadedFiles((prev) => {
      const next = [...prev, ...mapped]
      if (next.length > 3) {
        setFileNotice("Maximum 3 fichiers. Seuls les 3 premiers sont conservés.")
      } else {
        setFileNotice("")
      }
      return next.slice(0, 3)
    })
  }

  const handleRemoveFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name))
    setFileNotice("")
  }

  const handleVoiceClick = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      console.warn("SpeechRecognition non disponible dans ce navigateur.")
      return
    }
    if (isListening) {
      recognition.stop()
    } else {
      recognition.start()
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" })
    } catch (error) {
      console.error("Erreur lors de la déconnexion", error)
    } finally {
      router.push("/login")
    }
  }

  const openEmailEdit = () => {
    setEmailUpdateError("")
    setEmailUpdateSuccess("")
    setEmailEditMode(true)
    setEmailInput(session?.email ?? "")
  }

  const openPasswordEdit = () => {
    setPasswordEditMode(true)
    setPasswordUpdateError("")
    setPasswordUpdateSuccess("")
    setPasswordInput("")
    setPasswordConfirm("")
  }

  const openDeleteConfirm = () => {
    setDeleteConfirmOpen(true)
    setDeleteError("")
  }

  const openNameEdit = () => {
    setNameEditMode(true)
    setNameUpdateError("")
    setNameUpdateSuccess("")
    setFirstNameInput(session?.firstName ?? "")
    setLastNameInput(session?.lastName ?? "")
  }

  const handleExportData = async () => {
    setExportError("")
    setExportingData(true)
    try {
      const res = await fetch("/api/account/export")

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error ?? "Impossible d'exporter les données")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "indexia-export.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible d'exporter les données"
      setExportError(message)
    } finally {
      setExportingData(false)
    }
  }

  const handleEmailUpdate = async () => {
    const normalized = emailInput.trim().toLowerCase()
    if (!normalized || !normalized.includes("@") || normalized.length < 5) {
      setEmailUpdateError("Email invalide")
      return
    }

    setEmailUpdateError("")
    setEmailUpdateSuccess("")
    setEmailUpdating(true)

    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de mettre à jour l'email")
      }

      const updatedEmail =
        typeof payload?.email === "string" && payload.email ? payload.email : normalized

      setSession((prev) => (prev ? { ...prev, email: updatedEmail } : prev))
      setEmailInput(updatedEmail)
      setEmailUpdateSuccess("Email mis à jour")
      setEmailEditMode(false)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour l'email"
      setEmailUpdateError(message)
    } finally {
      setEmailUpdating(false)
    }
  }

  const handleNameUpdate = async () => {
    const firstName = firstNameInput.trim()
    const lastName = lastNameInput.trim()

    if (!firstName || !lastName) {
      setNameUpdateError("Prénom et nom sont requis")
      return
    }

    setNameUpdateError("")
    setNameUpdateSuccess("")
    setNameUpdating(true)

    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de mettre à jour le profil")
      }

      setSession((prev) =>
        prev
          ? {
              ...prev,
              firstName: payload?.firstName ?? firstName,
              lastName: payload?.lastName ?? lastName,
            }
          : prev
      )
      setNameUpdateSuccess("Profil mis à jour")
      setNameEditMode(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de mettre à jour le profil"
      setNameUpdateError(message)
    } finally {
      setNameUpdating(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!passwordInput || !passwordConfirm) {
      setPasswordUpdateError("Mot de passe requis")
      return
    }
    if (passwordInput !== passwordConfirm) {
      setPasswordUpdateError("Les mots de passe ne correspondent pas")
      return
    }
    if (passwordInput.length < 8) {
      setPasswordUpdateError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    setPasswordUpdateError("")
    setPasswordUpdateSuccess("")
    setPasswordUpdating(true)

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, confirm: passwordConfirm }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de mettre à jour le mot de passe")
      }

      setPasswordUpdateSuccess("Mot de passe mis à jour")
      setPasswordEditMode(false)
      setPasswordInput("")
      setPasswordConfirm("")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le mot de passe"
      setPasswordUpdateError(message)
    } finally {
      setPasswordUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError("")
    setDeletingAccount(true)
    try {
      const res = await fetch("/api/account/delete", { method: "POST" })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.replace("/login")
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible de supprimer le compte")
      }

      router.replace("/login")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de supprimer le compte"
      setDeleteError(message)
    } finally {
      setDeletingAccount(false)
    }
  }

  useEffect(() => {
    let active = true
    const checkSession = async () => {
      try {
        const res = await fetch("/api/session")
        if (!active) return
        if (!res.ok) {
          router.replace("/login")
          return
        }
        const payload = await res.json().catch(() => null)
        if (!active) return
        if (!payload?.email) {
          router.replace("/login")
          return
        }
        setSession({
          email: payload.email,
          admin: payload.admin ?? false,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
        })
        setCheckingAuth(false)
      } catch (error) {
        console.error("Erreur lors du contrôle de session", error)
        if (!active) return
        router.replace("/login")
      }
    }
    checkSession()
    return () => {
      active = false
    }
  }, [router])

  useEffect(() => {
    if (session?.email) {
      setEmailInput(session.email)
    }
    if (session?.firstName || session?.lastName) {
      setFirstNameInput(session.firstName ?? "")
      setLastNameInput(session.lastName ?? "")
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    let active = true

    const fetchWorkspace = async () => {
      setLoadingChats(true)
      setChatError("")
      setProjectError("")
      try {
        const res = await fetch("/api/projects")
        const payload = await res.json().catch(() => ({}))
        if (!active) return
        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (!res.ok) {
          setProjectError(payload?.error ?? "Impossible de charger vos projets")
          return
        }
        const nextProjects = Array.isArray(payload?.projects) ? payload.projects : []
        const nextChats = Array.isArray(payload?.chats) ? payload.chats : []
        nextProjects.sort(
          (a: ProjectRecord, b: ProjectRecord) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        nextChats.sort(
          (a: ChatRecord, b: ChatRecord) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        setProjects(nextProjects)
        setChats(nextChats)
        const resolvedProjectId =
          selectedProjectId &&
          nextProjects.some((p: ProjectRecord) => p.id === selectedProjectId)
            ? selectedProjectId
            : null
        setSelectedProjectId(resolvedProjectId)
        const unassignedAfterFetch = nextChats.filter(
          (chat: ChatRecord) => !chat.projectId
        )
        const projectChats =
          resolvedProjectId === null
            ? unassignedAfterFetch
            : nextChats.filter((chat: ChatRecord) => chat.projectId === resolvedProjectId)
        const preservedChat =
          selectedChatId &&
          projectChats.some((chat: ChatRecord) => chat.id === selectedChatId)
            ? selectedChatId
            : null
        setSelectedChatId(preservedChat ?? projectChats[0]?.id ?? unassignedAfterFetch[0]?.id ?? null)
      } catch (error) {
        if (!active) return
        console.error("Erreur lors du chargement des projets", error)
        setProjectError("Impossible de charger vos projets")
      } finally {
        if (active) {
          setLoadingChats(false)
        }
      }
    }

    fetchWorkspace()

    return () => {
      active = false
    }
  }, [router, session])

  useEffect(() => {
    const projectChats = selectedProjectId
      ? chats.filter((chat) => chat.projectId === selectedProjectId)
      : chats.filter((chat) => !chat.projectId)

    if (projectChats.length === 0) {
      if (selectedChatId && !chats.some((chat) => chat.id === selectedChatId)) {
        setSelectedChatId(null)
      }
      return
    }

    if (!selectedChatId || !projectChats.some((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(projectChats[0].id)
    }
  }, [chats, selectedProjectId, selectedChatId])

  useEffect(() => {
    if (!selectedChatId) {
      setChatHistory([])
      return
    }
    if (skipNextLoadForChatId.current === selectedChatId) {
      skipNextLoadForChatId.current = null
      return
    }
    clearTypingTimeouts()
    let active = true
    const loadMessages = async () => {
      setLoadingMessages(true)
      setChatError("")
      try {
        const res = await fetch(`/api/chat-messages?chatId=${selectedChatId}`)
        const payload = await res.json().catch(() => ({}))
        if (!active) return
        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (!res.ok) {
          throw new Error(
            payload?.error ??
              `Impossible de charger les messages (statut ${res.status})`
          )
        }
        const messages = Array.isArray(payload?.messages) ? payload.messages : []
        setChatHistory(
          messages.map((m: any) => ({
            id: m.id ?? `${m.role}-${m.createdAt ?? Math.random()}`,
            role: m.role === "assistant" ? "assistant" : "user",
            content: typeof m.content === "string" ? m.content : "",
            status: "done",
          }))
        )
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Impossible de charger les messages"
        setChatError(msg)
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    loadMessages()
    return () => {
      active = false
    }
  }, [router, selectedChatId])

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    const isImage = ext && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)
    const isPdf = ext === "pdf"
    const isDoc = ext && ["doc", "docx", "txt", "rtf", "odt", "md"].includes(ext)
    const isZip = ext && ["zip", "rar", "7z", "tar", "gz"].includes(ext)
    const isAudio = ext && ["mp3", "wav", "ogg", "flac", "m4a"].includes(ext)
    const isVideo = ext && ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)

    if (isImage) return <IconImage className="h-4 w-4" />
    if (isPdf) return <IconPdf className="h-4 w-4" />
    if (isDoc) return <IconDoc className="h-4 w-4" />
    if (isZip) return <IconZip className="h-4 w-4" />
    if (isAudio) return <IconAudio className="h-4 w-4" />
    if (isVideo) return <IconVideo className="h-4 w-4" />
    return <IconFile className="h-4 w-4" />
  }

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()

  const searchQuery = normalizeText(searchTerm)

  const filteredChats = chats.filter((chat) => {
    const title = normalizeText(chat.title || "")
    return searchQuery === "" ? true : title.includes(searchQuery)
  })
  const unassignedChats = filteredChats.filter((chat) => !chat.projectId)
  const userInitials =
    (session?.firstName?.[0] || "") + (session?.lastName?.[0] || "")
      ? `${(session?.firstName?.[0] || "").toUpperCase()}${(session?.lastName?.[0] || "").toUpperCase()}`
      : session?.email
        ? session.email.slice(0, 2).toUpperCase()
        : "??"
  const userLabel =
    session?.firstName || session?.lastName
      ? `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim()
      : "Utilisateur"
  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const headerTitle = selectedChat?.title?.trim() ? selectedChat.title : "Chat"

  if (checkingAuth) {
    return (
      <div className="bg-muted text-foreground flex min-h-svh items-center justify-center">
        <span className="text-sm text-muted-foreground">Vérification de session...</span>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar
        collapsible="icon"
        variant="inset"
        className="min-h-[calc(100vh-var(--header-height))]"
      >
        {actionMenuChatId && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setActionMenuChatId(null)}
            aria-hidden="true"
          />
        )}
        <SidebarHeader className="pb-2 pt-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <Image
                src={logoSrc}
                alt="Logo"
                width={140}
                height={140}
                priority
                unoptimized
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="gap-4 px-3 pb-4">
          <div className="relative">
            <IconSearch className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un chat"
              className="w-full rounded-xl border border-border bg-background px-10 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="text-foreground hover:bg-muted disabled:opacity-60 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
            onClick={handleNewChat}
            disabled={isCreatingChat || !session}
          >
            <IconChat className="h-4 w-4" />
            {isCreatingChat ? "Création..." : "Nouveau chat"}
          </button>
          <button
            className="text-foreground hover:bg-muted disabled:opacity-60 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
            onClick={openProjectModal}
            disabled={isCreatingProject || !session}
          >
            <IconPlusSquare className="h-4 w-4" />
            {isCreatingProject ? "Création..." : "Nouveau projet"}
          </button>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <IconMenu className="h-3 w-3" />
            Chats sans projet
          </div>
          <div className="flex flex-col gap-2">
            {unassignedChats.map((chat) => {
              const isActiveChat = chat.id === selectedChatId
              const isRenaming = renamingChatId === chat.id
              return (
                <div
                  key={chat.id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1 ${
                    isActiveChat ? "bg-muted border border-border" : "hover:bg-muted/60"
                  }`}
                >
                  {isRenaming ? (
                    <>
                      <div className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1">
                        <IconChat className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={chatTitleInput}
                          onChange={(e) => setChatTitleInput(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleRenameChat()
                            }
                          }}
                        />
                      </div>
                      <button
                        className="text-emerald-600 hover:text-emerald-700 rounded-full p-1 transition cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenameChat()
                        }}
                        aria-label="Enregistrer le titre"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          cancelRename()
                        }}
                        aria-label="Annuler"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedProjectId(null)
                          setSelectedChatId(chat.id)
                        }}
                        className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1 text-sm transition cursor-pointer ${
                          isActiveChat
                            ? "font-semibold text-foreground"
                            : " text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <IconChat className="h-4 w-4" />
                        <span className="truncate">{chat.title || "Sans titre"}</span>
                      </button>
                    <div className="relative z-50" data-chat-actions>
                      <button
                        className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuChatId((prev) => (prev === chat.id ? null : chat.id))
                          }}
                        aria-label="Actions du chat"
                        data-chat-actions
                      >
                        <IconMore className="h-4 w-4" />
                      </button>
                      {actionMenuChatId === chat.id && (
                              <div
                                className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 rounded-xl border border-border bg-white shadow-lg"
                                data-chat-actions
                              >
                                <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                setProjectPickerChatId(chat.id)
                                setActionMenuChatId(null)
                              }}
                            >
                              <IconMove className="h-4 w-4" />
                              <span>Déplacer</span>
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                startRename(chat)
                                setActionMenuChatId(null)
                              }}
                            >
                              <IconEdit className="h-4 w-4" />
                              <span>Renommer</span>
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuChatId(null)
                                handleDeleteChat(chat.id)
                              }}
                              disabled={deletingChatId === chat.id}
                            >
                              <IconTrash className="h-4 w-4" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {unassignedChats.length === 0 && (
              <span className="text-xs text-muted-foreground px-1">Aucun chat pour le moment</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <IconMenu className="h-3 w-3" />
            Vos projets
          </div>
          <div className="flex flex-col gap-3">
            {loadingChats ? (
              <span className="text-xs text-muted-foreground">Chargement...</span>
            ) : null}
            {projectError && !loadingChats ? (
              <span className="text-xs text-red-500">{projectError}</span>
            ) : null}
            {!loadingChats && projects.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Aucun projet pour le moment
              </span>
            )}
            {projects.map((project) => {
              const projectChats = chats.filter((chat) => chat.projectId === project.id)
              const isActiveProject = project.id === selectedProjectId
              const visibleChats = isActiveProject
                ? filteredChats.filter((chat) => chat.projectId === project.id)
                : []
              const isRenamingProject = renamingProjectId === project.id
              return (
                <div
                  key={project.id}
                  className="rounded-xl border border-border bg-background/60 shadow-sm"
                >
                  <div
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      isActiveProject ? "bg-muted/70 font-semibold" : "hover:bg-muted/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id)
                        if (!projectChats.some((chat) => chat.id === selectedChatId)) {
                          setSelectedChatId(projectChats[0]?.id ?? null)
                        }
                      }}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <IconFolder className="h-4 w-4 mt-1" />
                      <div className="flex flex-col flex-1">
                        {isRenamingProject ? (
                          <input
                            type="text"
                            value={projectRenameInput}
                            onChange={(e) => setProjectRenameInput(e.target.value)}
                            className="w-full rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleRenameProject()
                              }
                            }}
                          />
                        ) : (
                          <>
                            <span className="truncate">{project.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {projectChats.length} {projectChats.length > 1 ? "chats" : "chat"}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                    {isRenamingProject ? (
                      <div className="flex items-center gap-1">
                        <button
                          className="text-emerald-600 hover:text-emerald-700 rounded-full p-1 transition cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRenameProject()
                          }}
                          aria-label="Enregistrer le projet"
                        >
                          <IconCheck className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelRenameProject()
                          }}
                          aria-label="Annuler"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            startRenameProject(project)
                          }}
                          aria-label="Renommer le projet"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-red-600 rounded-full p-1 transition cursor-pointer disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                          disabled={deletingProjectId === project.id}
                          aria-label="Supprimer le projet"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                        {isActiveProject ? (
                          <span className="text-[10px] font-semibold text-primary px-1">
                            Actif
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {isActiveProject ? (
                    <div className="flex flex-col gap-2 px-2 pb-3 pt-1">
                      {visibleChats.map((chat) => {
                        const isActiveChat = chat.id === selectedChatId
                        const isRenaming = renamingChatId === chat.id
                        return (
                          <div
                            key={chat.id}
                            className={`flex items-center gap-2 rounded-xl px-2 py-1 ${
                              isActiveChat ? "bg-[#ededed] border border-border" : ""
                            }`}
                          >
                            {isRenaming ? (
                              <>
                                <div className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1">
                                  <IconChat className="h-4 w-4 text-muted-foreground" />
                                  <input
                                    type="text"
                                    value={chatTitleInput}
                                    onChange={(e) => setChatTitleInput(e.target.value)}
                                    className="w-full rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleRenameChat()
                                      }
                                    }}
                                  />
                                </div>
                                <button
                                  className="text-emerald-600 hover:text-emerald-700 rounded-full p-1 transition cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRenameChat()
                                  }}
                                  aria-label="Enregistrer le titre"
                                >
                                  <IconCheck className="h-4 w-4" />
                                </button>
                                <button
                                  className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelRename()
                                  }}
                                  aria-label="Annuler"
                                >
                                  <IconX className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedProjectId(project.id)
                                    setSelectedChatId(chat.id)
                                  }}
                                  className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1 text-sm transition cursor-pointer ${
                                    isActiveChat
                                      ? "font-semibold text-foreground"
                                      : " text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  <IconChat className="h-4 w-4" />
                                  <span className="truncate">{chat.title || "Sans titre"}</span>
                                </button>
                              <div className="relative z-50" data-chat-actions>
                                <button
                                  className="text-muted-foreground hover:text-foreground rounded-full p-1 transition cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActionMenuChatId((prev) =>
                                        prev === chat.id ? null : chat.id
                                      )
                                    }}
                                    aria-label="Actions du chat"
                                  data-chat-actions
                                  >
                                    <IconMore className="h-4 w-4" />
                                  </button>
                                {actionMenuChatId === chat.id && (
                                  <div
                                    className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 rounded-xl border border-border bg-white shadow-lg"
                                    data-chat-actions
                                  >
                                      <button
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setProjectPickerChatId(chat.id)
                                          setActionMenuChatId(null)
                                        }}
                                      >
                                        <IconMove className="h-4 w-4" />
                                        <span>Déplacer</span>
                                      </button>
                                      <button
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          startRename(chat)
                                          setActionMenuChatId(null)
                                        }}
                                      >
                                        <IconEdit className="h-4 w-4" />
                                        <span>Renommer</span>
                                      </button>
                                      <button
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActionMenuChatId(null)
                                          handleDeleteChat(chat.id)
                                        }}
                                        disabled={deletingChatId === chat.id}
                                      >
                                        <IconTrash className="h-4 w-4" />
                                        <span>Supprimer</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                      {visibleChats.length === 0 && (
                        <span className="text-xs text-muted-foreground px-1">
                          {searchTerm
                            ? "Aucun chat ne correspond à la recherche"
                            : "Aucun chat dans ce projet"}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </SidebarContent>
        <SidebarFooter className="px-3 pb-4">
          <div className="flex flex-col gap-2">
            <button
              className="text-muted-foreground hover:bg-muted flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
              onClick={() => setShowSettings(true)}
            >
              <IconSettings className="h-4 w-4" />
              Paramètres
            </button>
            <button
              className="text-red-500 hover:bg-red-50 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
              onClick={handleLogout}
            >
              <IconLogout className="h-4 w-4" />
              Déconnexion
            </button>
            <div className="flex items-center gap-3 rounded-xl bg-background px-3 py-2 shadow-sm">
              <div className="bg-foreground/10 text-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                {userInitials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{userLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {session ? "Connecté" : "En attente..."}
                </div>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <SiteHeader title={headerTitle} showSidebarTrigger={false} />
        <div className="bg-background text-foreground relative flex min-h-[calc(100vh-var(--header-height))] flex-1 overflow-hidden px-4 pb-8 pt-4 lg:px-8">
          <div className="relative flex flex-1 flex-col items-center gap-6 rounded-3xl bg-white/90 p-6 pb-44">
            <Card className="w-[1100px] max-w-full rounded-3xl bg-white/70 shadow-none border-none">
              <CardContent className="flex h-[50vh] flex-col gap-4 px-6 py-4">
                <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
                  {chatHistory.length === 0 ? (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      Commencez une conversation pour voir vos messages ici.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {chatHistory.map((entry) => {
                        const isLoading = entry.status === "loading"
                        const isAssistant = entry.role === "assistant"
                        const isDisabled = isLoading || entry.status === "typing"
                        const feedback = feedbackById[entry.id] ?? null
                        return (
                        <div
                          key={entry.id}
                          className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                        >
                          <div className="flex max-w-[95%] md:max-w-[720px] flex-col">
                            <div
                              className={`chat-message rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                                isAssistant
                                  ? "bg-muted text-foreground"
                                  : "bg-black text-white"
                              }`}
                            >
                              {isLoading ? (
                                <span className="chat-loading-dots inline-flex gap-1">
                                  <span>•</span>
                                  <span>•</span>
                                  <span>•</span>
                                </span>
                              ) : isAssistant ? (
                                <div className="chat-markdown">
                                  {renderMarkdown(entry.content)}
                                </div>
                              ) : (
                                entry.content
                              )}
                            </div>
                            {isAssistant ? (
                              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                <button
                                  type="button"
                                  className="hover:text-foreground rounded-full border border-border/70 px-2 py-1 transition disabled:opacity-50"
                                  onClick={() => handleCopy(entry.content)}
                                  disabled={isDisabled || !entry.content}
                                >
                                  Copier
                                </button>
                                <button
                                  type="button"
                                  className="hover:text-foreground rounded-full border border-border/70 px-2 py-1 transition disabled:opacity-50"
                                  onClick={() => startAssistantResponse(entry.id, selectedChatId)}
                                  disabled={isDisabled}
                                >
                                  Regenerer
                                </button>
                                <button
                                  type="button"
                                  className={`rounded-full border border-border/70 px-2 py-1 transition disabled:opacity-50 ${
                                    feedback === "up"
                                      ? "text-emerald-600 border-emerald-200"
                                      : "hover:text-foreground"
                                  }`}
                                  onClick={() => handleFeedback(entry.id, "up")}
                                  disabled={isDisabled}
                                >
                                  Utile
                                </button>
                                <button
                                  type="button"
                                  className={`rounded-full border border-border/70 px-2 py-1 transition disabled:opacity-50 ${
                                    feedback === "down"
                                      ? "text-rose-600 border-rose-200"
                                      : "hover:text-foreground"
                                  }`}
                                  onClick={() => handleFeedback(entry.id, "down")}
                                  disabled={isDisabled}
                                >
                                  Pas utile
                                </button>
                                <button
                                  type="button"
                                  className="hover:text-foreground rounded-full border border-border/70 px-2 py-1 transition disabled:opacity-50"
                                  onClick={() => handleShare(entry.content)}
                                  disabled={isDisabled || !entry.content}
                                >
                                  Partager
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="absolute bottom-0 left-1/2 z-30 w-[960px] max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-3xl border border-border/70 bg-white/95 shadow-xl backdrop-blur">
              <CardContent className="flex flex-col gap-3 px-6 py-3">
                <textarea
                  rows={1}
                  ref={textareaRef}
                  onInput={handleTextareaInput}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Demandez, cherchez ou faites ce que vous voulez..."
                  className="text-foreground placeholder:text-muted-foreground w-full resize-none border-none bg-transparent text-md leading-relaxed outline-none focus-visible:outline-none min-h-[44px] max-h-[200px]"
                />
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="text-muted-foreground hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-transparent shadow-md transition cursor-pointer"
                    aria-label="Joindre un fichier"
                  >
                    <IconPaperclip className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className={`text-muted-foreground hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full border border-border/70 shadow-md transition cursor-pointer ${
                      isListening ? "bg-black text-white border-black" : "bg-transparent"
                    }`}
                    aria-label="Dicter un message"
                    onClick={handleVoiceClick}
                  >
                    <IconMic className={`h-5 w-5 ${isListening ? "text-white" : ""}`} />
                  </button>
                  <div className="relative ml-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      className="border-border text-sm text-foreground/90 flex items-center gap-2 rounded-3xl border bg-transparent px-3 py-2 pr-4 shadow-sm transition hover:bg-muted cursor-pointer"
                    >
                      <Image
                        src={selectedModel.icon}
                        alt={selectedModel.label}
                        width={18}
                        height={18}
                        className="rounded"
                      />
                      <span>{selectedModel.label}</span>
                    </button>
                    {open && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpen(false)}
                          aria-hidden="true"
                        />
                        <div className="border-border bg-background absolute left-0 bottom-[calc(100%+8px)] z-20 w-64 rounded-xl border shadow-lg">
                          <ul className="flex flex-col divide-y divide-border/70">
                            {models.map((model) => (
                              <li key={model.value}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(model)
                                    setOpen(false)
                                  }}
                                  className="text-foreground flex w-full items-center gap-3 px-3 py-2 text-sm transition hover:bg-muted cursor-pointer"
                                >
                                  <Image
                                    src={model.icon}
                                    alt={model.label}
                                    width={18}
                                    height={18}
                                    className="rounded"
                                  />
                                  <span className="flex-1 text-left">{model.label}</span>
                                  {selectedModel.value === model.value ? (
                                    <span className="text-xs text-primary">●</span>
                                  ) : null}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    size="icon"
                    className="ml-auto h-9 w-9 rounded-full bg-black text-white hover:bg-black/90 cursor-pointer shadow-xl disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    <IconArrowUp className="h-10 w-10" />
                  </Button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="animate-pop border-border bg-muted/40 text-foreground flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3">
                    <div className="flex items-center gap-2 rounded-full bg-background px-3 py-2 text-sm font-medium shadow-sm">
                      {getFileIcon(uploadedFiles[0].name)}
                      {uploadedFiles.length === 1
                        ? "1 fichier"
                        : `${uploadedFiles.length} fichiers`}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {uploadedFiles.slice(0, 3).map((file) => (
                        <span
                          key={file.name}
                          className="flex items-center gap-1.5 rounded-full bg-background px-2 py-1 shadow-sm"
                        >
                          {getFileIcon(file.name)}
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.name)}
                            className="text-muted-foreground hover:text-foreground flex items-center justify-center rounded-full transition cursor-pointer"
                            aria-label={`Supprimer ${file.name}`}
                          >
                            <IconX className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {uploadedFiles.length > 3 && (
                        <span className="rounded-full bg-background px-2 py-1 shadow-sm">
                          +{uploadedFiles.length - 3} autres
                        </span>
                      )}
                    </div>
                    {fileNotice && (
                      <div className="text-xs font-medium text-muted-foreground">
                        {fileNotice}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground justify-start">
                  {[
                    {
                      icon: <IconDatabase className="h-4 w-4 text-cyan-700" />,
                      label: "Analyse data",
                      bg: "bg-cyan-50",
                      text: "text-cyan-900",
                      border: "border-cyan-200",
                    },
                    {
                      icon: <IconSparkle className="h-4 w-4 text-amber-700" />,
                      label: "Résumer texte",
                      bg: "bg-amber-50",
                      text: "text-amber-900",
                      border: "border-amber-200",
                    },
                    {
                      icon: <IconShield className="h-4 w-4 text-emerald-700" />,
                      label: "Vérifier droits",
                      bg: "bg-emerald-50",
                      text: "text-emerald-900",
                      border: "border-emerald-200",
                    },
                    {
                      icon: <IconFlow className="h-4 w-4 text-indigo-700" />,
                      label: "Comparer pipelines",
                      bg: "bg-indigo-50",
                      text: "text-indigo-900",
                      border: "border-indigo-200",
                    },
                    {
                      icon: <IconChart className="h-4 w-4 text-rose-700" />,
                      label: "Benchmark",
                      bg: "bg-rose-50",
                      text: "text-rose-900",
                      border: "border-rose-200",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`flex gap-2 rounded-full border px-3 py-2 transition cursor-pointer ${item.bg} ${item.text} ${item.border} hover:brightness-95`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      {showProjectModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!isCreatingProject) {
                setShowProjectModal(false)
                setProjectError("")
              }
            }}
          />
          <Card className="relative z-40 w-full max-w-md rounded-3xl border border-border/60 bg-white/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Nouveau projet
                </p>
                <h3 className="text-lg font-semibold">Organisez vos chats</h3>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full p-2 transition"
                onClick={() => {
                  if (!isCreatingProject) {
                    setShowProjectModal(false)
                    setProjectError("")
                  }
                }}
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3 px-5 py-4">
              <label className="text-sm font-medium text-foreground" htmlFor="project-name">
                Nom du projet
              </label>
              <input
                id="project-name"
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="Ex: Lancement produit"
                disabled={isCreatingProject}
                autoFocus
              />
              {projectError ? (
                <span className="text-xs text-red-500">{projectError}</span>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-full px-4 py-2 cursor-pointer"
                  onClick={() => {
                    if (!isCreatingProject) {
                      setShowProjectModal(false)
                      setProjectError("")
                    }
                  }}
                  disabled={isCreatingProject}
                >
                  Annuler
                </Button>
                <Button
                  className="rounded-full px-4 py-2 cursor-pointer"
                  onClick={handleNewProject}
                  disabled={isCreatingProject}
                >
                  {isCreatingProject ? "Création..." : "Créer le projet"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {projectPickerChatId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setProjectPickerChatId(null)}
          />
          <Card className="relative z-50 w-full max-w-md rounded-3xl border border-border/60 bg-white/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Déplacer le chat
                </p>
                <h3 className="text-lg font-semibold">Sélectionner un projet</h3>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full p-2 transition"
                onClick={() => setProjectPickerChatId(null)}
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3 px-5 py-4">
              <button
                className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition cursor-pointer"
                onClick={() => handleMoveChat(projectPickerChatId, null)}
                disabled={movingChatId === projectPickerChatId}
              >
                <span>Sans projet</span>
                <span className="text-xs text-muted-foreground">Par défaut</span>
              </button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition cursor-pointer disabled:opacity-50"
                  onClick={() => handleMoveChat(projectPickerChatId, project.id)}
                  disabled={movingChatId === projectPickerChatId}
                >
                  <div className="flex items-center gap-2">
                    <IconFolder className="h-4 w-4" />
                    <span>{project.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {chats.filter((c) => c.projectId === project.id).length} chats
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <Card className="relative z-10 w-full max-w-3xl rounded-3xl border border-border/60 bg-white/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Préférences
                </p>
                <h2 className="text-xl font-semibold">Paramètres du compte</h2>
              </div>
              <Button
                variant="outline"
                className="rounded-full px-4 py-2 cursor-pointer"
                onClick={() => setShowSettings(false)}
              >
                Fermer
              </Button>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <SettingsSection title="Profil">
                  <SettingsRow
                    label="Nom complet"
                    value={
                      session?.firstName || session?.lastName
                        ? `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim()
                        : "Non renseigné"
                    }
                    action="Modifier"
                    onAction={openNameEdit}
                    disabled={!session}
                  />
                  {nameEditMode && (
                    <div className="rounded-xl bg-background px-3 py-3 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="first-name-update"
                          className="text-sm font-medium text-foreground"
                        >
                          Prénom
                        </label>
                        <input
                          id="first-name-update"
                          type="text"
                          value={firstNameInput}
                          onChange={(e) => setFirstNameInput(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                          placeholder="Prénom"
                          disabled={nameUpdating}
                        />
                        <label
                          htmlFor="last-name-update"
                          className="text-sm font-medium text-foreground"
                        >
                          Nom
                        </label>
                        <input
                          id="last-name-update"
                          type="text"
                          value={lastNameInput}
                          onChange={(e) => setLastNameInput(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                          placeholder="Nom"
                          disabled={nameUpdating}
                        />
                        {nameUpdateError ? (
                          <p className="text-xs text-red-500">{nameUpdateError}</p>
                        ) : null}
                        {nameUpdateSuccess ? (
                          <p className="text-xs text-emerald-600">{nameUpdateSuccess}</p>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={() => {
                              setNameEditMode(false)
                              setNameUpdateError("")
                              setNameUpdateSuccess("")
                              setFirstNameInput(session?.firstName ?? "")
                              setLastNameInput(session?.lastName ?? "")
                            }}
                            disabled={nameUpdating}
                          >
                            Annuler
                          </Button>
                          <Button
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={handleNameUpdate}
                            disabled={nameUpdating}
                          >
                            {nameUpdating ? "Mise à jour..." : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <SettingsRow
                    label="Email"
                    value={session?.email ?? "Non disponible"}
                    action="Changer"
                    onAction={openEmailEdit}
                    disabled={!session}
                  />
                  {emailEditMode && (
                    <div className="rounded-xl bg-background px-3 py-3 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="email-update"
                          className="text-sm font-medium text-foreground"
                        >
                          Nouveau email
                        </label>
                        <input
                          id="email-update"
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                          placeholder="nouveau@email.com"
                          disabled={emailUpdating}
                        />
                        {emailUpdateError ? (
                          <p className="text-xs text-red-500">{emailUpdateError}</p>
                        ) : null}
                        {emailUpdateSuccess ? (
                          <p className="text-xs text-emerald-600">{emailUpdateSuccess}</p>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={() => {
                              setEmailEditMode(false)
                              setEmailUpdateError("")
                              setEmailUpdateSuccess("")
                              setEmailInput(session?.email ?? "")
                            }}
                            disabled={emailUpdating}
                          >
                            Annuler
                          </Button>
                          <Button
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={handleEmailUpdate}
                            disabled={emailUpdating}
                          >
                            {emailUpdating ? "Mise à jour..." : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <SettingsRow
                    label="Mot de passe"
                    value="••••••••"
                    action="Mettre à jour"
                    onAction={openPasswordEdit}
                    disabled={!session}
                  />
                  {passwordEditMode && (
                    <div className="rounded-xl bg-background px-3 py-3 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="password-update"
                          className="text-sm font-medium text-foreground"
                        >
                          Nouveau mot de passe
                        </label>
                        <input
                          id="password-update"
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                          placeholder="••••••••"
                          disabled={passwordUpdating}
                        />
                        <label
                          htmlFor="password-confirm"
                          className="text-sm font-medium text-foreground"
                        >
                          Confirmer le mot de passe
                        </label>
                        <input
                          id="password-confirm"
                          type="password"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                          placeholder="••••••••"
                          disabled={passwordUpdating}
                        />
                        {passwordUpdateError ? (
                          <p className="text-xs text-red-500">{passwordUpdateError}</p>
                        ) : null}
                        {passwordUpdateSuccess ? (
                          <p className="text-xs text-emerald-600">{passwordUpdateSuccess}</p>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={() => {
                              setPasswordEditMode(false)
                              setPasswordUpdateError("")
                              setPasswordUpdateSuccess("")
                              setPasswordInput("")
                              setPasswordConfirm("")
                            }}
                            disabled={passwordUpdating}
                          >
                            Annuler
                          </Button>
                          <Button
                            className="h-8 rounded-full px-3 text-xs cursor-pointer"
                            onClick={handlePasswordUpdate}
                            disabled={passwordUpdating}
                          >
                            {passwordUpdating ? "Mise à jour..." : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </SettingsSection>
                <SettingsSection title="Données & confidentialité">
                  <SettingsRow
                    label="Export données"
                    value={exportError ? exportError : "Disponible"}
                    action={exportingData ? "Export..." : "Exporter"}
                    onAction={handleExportData}
                    disabled={!session || exportingData}
                    danger={!!exportError}
                  />
                  <SettingsRow
                    label="Suppression compte"
                    action="Supprimer"
                    danger
                    onAction={openDeleteConfirm}
                    disabled={!session}
                  />
                  {deleteConfirmOpen && (
                    <div className="rounded-xl bg-red-50 px-3 py-3 shadow-sm border border-red-200">
                      <p className="text-sm font-semibold text-red-700">
                        Confirmer la suppression du compte ?
                      </p>
                      <p className="text-xs text-red-600">
                        Cette action supprimera votre compte et vos chats.
                      </p>
                      {deleteError ? (
                        <p className="text-xs text-red-600 mt-1">{deleteError}</p>
                      ) : null}
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs cursor-pointer"
                          onClick={() => {
                            setDeleteConfirmOpen(false)
                            setDeleteError("")
                          }}
                          disabled={deletingAccount}
                        >
                          Annuler
                        </Button>
                        <Button
                          variant="destructive"
                          className="h-8 rounded-full px-3 text-xs cursor-pointer"
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                        >
                          {deletingAccount ? "Suppression..." : "Oui, supprimer"}
                        </Button>
                      </div>
                    </div>
                  )}
                </SettingsSection>
              </div>
              <div className="flex flex-col gap-4">
                <SettingsSection title="Sécurité & accès">
                  <SettingsRow label="2FA" value="Désactivé" action="Activer" />
                  <SettingsRow label="Clés API" value="2 clés actives" action="Gérer" />
                  <SettingsRow label="Sessions" value="4 sessions ouvertes" action="Révoquer" />
                  <SettingsRow
                    label="Rôle"
                    value={session ? (session.admin ? "Administrateur" : "Utilisateur") : "Inconnu"}
                  />
                </SettingsSection>
              </div>
            </div>
          </Card>
        </div>
      )}
        <style jsx global>{`
          @keyframes chat-pop {
            0% {
              opacity: 0;
              transform: translateY(6px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .chat-message {
            animation: chat-pop 0.18s ease-out;
          }
          @keyframes chat-loading {
            0% {
              opacity: 0.3;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.3;
            }
          }
          .chat-loading-dots {
            animation: chat-loading 1.2s ease-in-out infinite;
          }
          .chat-markdown {
            line-height: 1.55;
          }
          .chat-paragraph {
            margin: 0;
          }
          .chat-paragraph + .chat-paragraph {
            margin-top: 0.5rem;
          }
          .chat-inline-code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
              "Liberation Mono", "Courier New", monospace;
            font-size: 0.85em;
            background: rgba(0, 0, 0, 0.08);
            padding: 0.1rem 0.35rem;
            border-radius: 0.4rem;
          }
          .chat-link {
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .chat-list {
            margin: 0.4rem 0 0.6rem 1.2rem;
            list-style: disc;
          }
          .chat-list li {
            margin: 0.15rem 0;
          }
        `}</style>
      </SidebarInset>
    </SidebarProvider>
  )
}

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function IconPaperclip(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21.44 11.05 12.47 20a5 5 0 0 1-7.07-7.07l9-9a3.5 3.5 0 0 1 4.95 4.95l-9 9a2 2 0 0 1-2.83-2.83l8.5-8.5" />
    </svg>
  )
}

function IconChat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconFolder(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 7h5l2 3h11v9H3z" />
      <path d="M3 7h18V5H9L7 3H3z" />
    </svg>
  )
}

function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20 15.3 15.3 0 0 0 0-20" />
    </svg>
  )
}

function IconArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

function IconMic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v1a7 7 0 1 1-14 0v-1" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function IconFile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function IconImage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4-4a2 2 0 0 0-3 0l-5 5" />
    </svg>
  )
}

function IconPdf(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h1c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H9z" />
      <path d="M13 13h1.5c.8 0 1.5.7 1.5 1.5S15.3 16 14.5 16H13z" />
      <path d="M17 16v-3h1" />
    </svg>
  )
}

function IconDoc(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h1.5a1.5 1.5 0 0 1 0 3H8z" />
      <path d="M13.5 13h1a1.5 1.5 0 0 1 0 3h-1z" />
      <path d="M18 16v-3" />
    </svg>
  )
}

function IconZip(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 7h1" />
      <path d="M9 11h1" />
      <path d="M9 15h1" />
      <path d="M9 19h1" />
    </svg>
  )
}

function IconAudio(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconVideo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="7" width="14" height="10" rx="2" ry="2" />
      <path d="m16 9 4-2v10l-4-2" />
    </svg>
  )
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  )
}

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconPlusSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M14 10v8" />
      <path d="M10 10v8" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 4.09V4a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function IconMove(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="5" width="10" height="14" rx="2" />
      <path d="m15 10 4-4" />
      <path d="M15 6h4v4" />
    </svg>
  )
}

function IconMore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  )
}

function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  )
}

function IconLogout(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

function IconDatabase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function IconSparkle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3-1.5 5h3L12 3Z" />
      <path d="m5 13-2 7 7-2-7-2 2-7 7 2" />
      <path d="m19 11-1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4Z" />
    </svg>
  )
}

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M8 11c1.5 1.5 3 3 4 5 1-2 2.5-3.5 4-5" />
    </svg>
  )
}

function IconFlow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 7h4" />
      <path d="m10 17 4-3v-4" />
    </svg>
  )
}

function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 3v18h18" />
      <rect x="7" y="8" width="3" height="7" rx="1" />
      <rect x="12" y="6" width="3" height="9" rx="1" />
      <rect x="17" y="10" width="3" height="5" rx="1" />
    </svg>
  )
}

type SettingsRowProps = {
  label: string
  value?: string
  action?: string
  danger?: boolean
  onAction?: () => void
  disabled?: boolean
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function SettingsRow({ label, value, action, danger, onAction, disabled }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2 shadow-sm">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {value ? (
          <div
            className={`text-xs ${
              danger ? "text-red-600" : "text-muted-foreground"
            }`}
          >
            {value}
          </div>
        ) : null}
      </div>
      {action ? (
        <Button
          variant={danger ? "destructive" : "outline"}
          className="h-8 rounded-full px-3 text-xs cursor-pointer"
          onClick={onAction}
          disabled={disabled}
        >
          {action}
        </Button>
      ) : null}
    </div>
  )
}
