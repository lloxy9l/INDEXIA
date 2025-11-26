"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ChatPage() {
  const router = useRouter()
  const logoSrc = "/logo.png"
  const models = [
    { value: "gpt-4o-mini", label: "GPT 4o-mini", icon: "/icon-chatgpt.jpg" },
    { value: "deepseek-r1", label: "Deepseek R1", icon: "/icon-deepseek.jpg" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", icon: "/icon-claude-ai.jpg" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", icon: "/icon-gemini-ai.jpg" },
    { value: "llama-3-8b", label: "Llama 3 8b", icon: "/icon-meta.jpg" },
    { value: "mistral-7b", label: "Mistral 7b", icon: "/icon-mistral.png" },
  ]
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; size: number }[]
  >([])
  const [fileNotice, setFileNotice] = useState("")
  const [selectedChatId, setSelectedChatId] = useState("chat-1")
  const [showSettings, setShowSettings] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNewChat = () => {
    console.log("Créer un nouveau chat")
  }

  const handleNewProject = () => {
    console.log("Créer un nouveau projet")
  }

  const handleTextareaInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(el.scrollHeight, 240)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > nextHeight ? "auto" : "hidden"
  }

  useEffect(() => {
    handleTextareaInput()
  }, [])

  useEffect(() => {
    handleTextareaInput()
  }, [message])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      recognitionRef.current = null
      return
    }
    const recognition: SpeechRecognition = new SpeechRecognition()
    recognition.lang = "fr-FR"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

  if (checkingAuth) {
    return (
      <div className="bg-muted text-foreground flex min-h-svh items-center justify-center">
        <span className="text-sm text-muted-foreground">Vérification de session...</span>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="border-border bg-muted/40 flex w-80 flex-col gap-4 border-r p-6">
        <div className="flex items-center gap-3 mb-4">
<Image
          src={logoSrc}
          alt="Logo"
          width={140}
          height={140}
          priority
          unoptimized
        />        
        </div>

        <div className="relative">
          <IconSearch className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher des chats"
            className="w-full rounded-xl border border-border bg-background px-10 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <button
          className="text-foreground hover:bg-[#ededed] flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer  "
          onClick={handleNewChat}
        >
          <IconChat className="h-4 w-4" />
          Nouveau chat
        </button>
        <button
          className="text-foreground hover:bg-[#ededed] flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
          onClick={handleNewProject}
        >
          <IconPlusSquare className="h-4 w-4" />
          Nouveau projet
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6">
          <IconMenu className="h-3 w-3" />
          Vos derniers chats
        </div>
        <div className="flex flex-col gap-2">
          {[{ id: "chat-1", label: "Essai 1" }, { id: "chat-2", label: "Essai 2" }].map(
            (chat) => {
              const isActive = chat.id === selectedChatId
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer ${
                    isActive
                      ? "bg-[#ededed] font-semibold text-foreground border border-border"
                      : " text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <IconChat className="h-4 w-4" />
                  {chat.label}
                </button>
              )
            }
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            className="text-muted-foreground hover:bg-background flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
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
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 mt-4 mb-2">
            <div className="bg-foreground/10 text-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
              MS
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Maxens Soldan</div>
              <div className="text-xs text-muted-foreground">En ligne</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src={logoSrc}
            alt="Logo"
            width={180}
            height={180}
            priority
            unoptimized
          />
        </div>
          <Card className="w-[840px] max-w-full rounded-3xl border border-border/70 bg-white shadow-sm">
            <CardContent className="flex flex-col gap-1 px-6 py-1">
            <textarea
              rows={1}
              ref={textareaRef}
              onInput={handleTextareaInput}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Demandez, cherchez ou faites ce que vous voulez..."
              className="text-foreground placeholder:text-muted-foreground w-full resize-none border-none bg-transparent text-lg leading-relaxed outline-none focus-visible:outline-none min-h-[44px] max-h-[240px] pb-2"
            />

            {uploadedFiles.length > 0 && (
              <div className="animate-pop border-border bg-muted/40 text-foreground flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 mb-3">
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
                  className="text-muted-foreground hover:text-foreground flex h-10 w-10 items-center justify-center rounded-full border border-border/70 shadow-md bg-transparent transition cursor-pointer"
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
              </div>
              <div className="relative flex items-center">
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
                    <div className="border-border bg-background absolute left-0 top-[calc(100%+8px)] z-20 w-64 rounded-xl border shadow-lg">
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
                className="ml-auto h-9 w-9 rounded-full bg-black text-white hover:bg-black/90 cursor-pointer shadow-xl"
              >
                <IconArrowUp className="h-10 w-10" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground justify-start">
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
      </div>
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
                  <SettingsRow label="Nom complet" value="Maxens Soldan" action="Modifier" />
                  <SettingsRow label="Email" value="maxens@example.com" action="Changer" />
                  <SettingsRow label="Mot de passe" value="••••••••" action="Mettre à jour" />
                </SettingsSection>
                <SettingsSection title="Données & confidentialité">
                  <SettingsRow label="Export données" value="Disponible" action="Exporter" />
                  <SettingsRow label="Suppression compte" action="Supprimer" danger />
                </SettingsSection>
              </div>
              <div className="flex flex-col gap-4">
                <SettingsSection title="Sécurité & accès">
                  <SettingsRow label="2FA" value="Désactivé" action="Activer" />
                  <SettingsRow label="Clés API" value="2 clés actives" action="Gérer" />
                  <SettingsRow label="Sessions" value="4 sessions ouvertes" action="Révoquer" />
                  <SettingsRow label="Rôle" value="Admin" />
                </SettingsSection>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
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

function SettingsRow({ label, value, action, danger }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2 shadow-sm">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {value ? <div className="text-xs text-muted-foreground">{value}</div> : null}
      </div>
      {action ? (
        <Button
          variant={danger ? "destructive" : "outline"}
          className="h-8 rounded-full px-3 text-xs cursor-pointer"
        >
          {action}
        </Button>
      ) : null}
    </div>
  )
}
