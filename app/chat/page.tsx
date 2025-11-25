import type React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ChatPage() {
  const logoSrc = "/logo.png"
  const models = [
    { value: "gpt-4o-mini", label: "GPT 4o-mini", icon: "[GPT]" },
    { value: "deepseek-r1", label: "Deepseek R1", icon: "[DS]" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", icon: "[CL]" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", icon: "[GM]" },
    { value: "llama-3-8b", label: "Llama 3 8b", icon: "[LL]" },
    { value: "firefunction-v2", label: "Firefunction V2", icon: "[FW]" },
    { value: "mistral-7b", label: "Mistral 7b", icon: "[MS]" },
  ]

  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="border-border bg-muted/40 flex w-72 flex-col gap-4 border-r p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <IconMenu className="h-4 w-4" />
          Conversations
        </div>
        <button className="text-foreground hover:bg-background flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition">
          <span className="text-lg">+</span>
          Nouveau chat
        </button>
        <div className="flex flex-col gap-2">
          <button className="flex items-center rounded-xl bg-background px-3 py-2 text-sm font-medium shadow-sm transition">
            Essai 1
          </button>
          <button className="text-muted-foreground hover:bg-background flex items-center rounded-xl px-3 py-2 text-sm transition">
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
          <CardContent className="flex flex-col gap-4 px-6 py-0">
            <textarea
              rows={1}
              placeholder="Ask, search, or make anything..."
              className="text-foreground placeholder:text-muted-foreground w-full resize-none border-none bg-transparent text-lg leading-relaxed outline-none focus-visible:outline-none"
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <select className="border-border text-sm rounded-3xl border bg-transparent px-2 py-2 pr-4 outline-none">
                  {models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.icon} {model.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="icon"
                className="ml-auto h-10 w-10 rounded-full bg-black text-white hover:bg-black/90"
              >
                <IconArrowUp className="h-8 w-8" />
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
