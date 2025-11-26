"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ChatPage() {
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
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setUploadedFiles((prev) => [...prev, ...mapped].slice(0, 3))
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

  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="border-border bg-muted/40 flex w-72 flex-col gap-4 border-r p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <IconMenu className="h-4 w-4" />
          Conversations
        </div>
        <button className="text-foreground hover:bg-background flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer">
          <span className="text-lg">+</span>
          Nouveau chat
        </button>
        <div className="flex flex-col gap-2">
          <button className="flex items-center rounded-xl bg-background px-3 py-2 text-sm font-medium shadow-sm transition cursor-pointer">
            Essai 1
          </button>
          <button className="text-muted-foreground hover:bg-background flex items-center rounded-xl px-3 py-2 text-sm transition cursor-pointer">
            Essai 2
          </button>
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-background px-3 py-2 shadow-sm">
          <div className="bg-foreground/10 text-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
            MS
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Maxens Soldan</div>
            <div className="text-xs text-muted-foreground">En ligne</div>
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
                    ? uploadedFiles[0].name
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
                    </span>
                  ))}
                  {uploadedFiles.length > 3 && (
                    <span className="rounded-full bg-background px-2 py-1 shadow-sm">
                      +{uploadedFiles.length - 3} autres
                    </span>
                  )}
                </div>
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
      </div>
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
