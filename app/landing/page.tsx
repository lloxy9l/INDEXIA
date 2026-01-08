"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Inter } from "next/font/google"

import { Button } from "@/components/ui/button"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const theme = {
  "--sand": "#f6f6f6",
  "--ink": "#0b0b0b",
  "--mist": "#ededed",
  "--accent": "#111111",
} as React.CSSProperties

const faqs = [
  {
    question: "Quel probleme IndexIA resout ?",
    answer:
      "Permettre de connecter n'importe quel LLM a vos documents, avec un RAG adaptable et des droits d'acces stricts.",
  },
  {
    question: "Quels modeles sont supportes ?",
    answer:
      "La plateforme est concue pour brancher n'importe quel modele (Llama, Mistral, GPT-4o mini, etc.) sans verrouillage.",
  },
  {
    question: "Comment sont gerees les permissions ?",
    answer:
      "Les droits sont appliques lors du retrieval pour garantir que chaque utilisateur ne voit que ses sources autorisees.",
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0)
  return (
    <main
      className={`${inter.className} min-h-screen text-[var(--ink)]`}
      style={theme}
    >
      <div className="relative overflow-hidden bg-[var(--sand)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
          <div className="absolute right-[-6rem] top-[-3rem] h-72 w-72 rounded-full bg-black/5 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-black/5 blur-3xl" />
        </div>
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="IndexIA logo" width={150} height={150} />
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <span>Vision</span>
            <span>Fonctionnalites</span>
            <span>FAQ</span>
          </nav>
          <Button
            asChild
            className="cursor-pointer rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white"
          >
            <Link href="/login">Demander une demo</Link>
          </Button>
        </header>

        <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 pb-10 pt-12 text-center">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-medium text-slate-600">
            48+ startups & equipes R&D font confiance a IndexIA
          </p>
          <h1 className="animate-fade-up text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Transformez vos bases documentaires en reponses fiables.
          </h1>
          <p className="animate-fade-up max-w-2xl text-base text-slate-700 md:text-lg">
            IndexIA combine LLM, RAG et gouvernance documentaire pour offrir une
            recherche semantique precise, avec des droits d'acces stricts.
          </p>
          <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="cursor-pointer rounded-full bg-[var(--accent)] px-6 text-white hover:bg-[var(--accent)] hover:text-white"
            >
              <Link href="/login">Demander une demo</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="cursor-pointer rounded-full border-slate-300 px-6 hover:bg-transparent hover:text-[var(--ink)]"
            >
              <Link href="/login">Voir le projet</Link>
            </Button>
          </div>
          <div className="animate-fade-up pt-8 text-xs uppercase tracking-[0.3em] text-slate-500">
            Trusted partners
          </div>
          <div className="animate-fade-up grid w-full max-w-4xl grid-cols-2 items-center gap-6 pt-2 text-sm text-slate-500 md:grid-cols-5">
            {[
              { name: "Mistral", src: "/icon-mistral.png" },
              { name: "Meta", src: "/icon-meta.jpg" },
              { name: "Claude", src: "/icon-claude-ai.jpg" },
              { name: "Gemini", src: "/icon-gemini-ai.jpg" },
              { name: "DeepSeek", src: "/icon-deepseek.jpg" },
            ].map((brand) => (
              <div key={brand.name} className="flex items-center justify-center gap-2">
                <Image
                  src={brand.src}
                  alt={`${brand.name} logo`}
                  width={24}
                  height={24}
                  className="rounded-full grayscale"
                />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Description
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Une plateforme RAG vraiment adaptable
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            IndexIA permet de combiner rapidement modele, pipeline RAG et
            politique d'acces sur un corpus documentaire structure.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Modeles interchangeables",
              text: "Comparaison et selection selon vos besoins (cout, latence, qualite).",
            },
            {
              title: "RAG modulable",
              text: "Standard, re-ranking, multi-query ou agent, en un clic.",
            },
            {
              title: "Controle d'acces",
              text: "Permissions appliquees avant la generation pour eviter les fuites.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-sm font-semibold text-slate-900">
                {item.title}
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 pb-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            FAQ
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">Questions frequentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <button
                key={faq.question}
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : index)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {faq.question}
                  </div>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs transition ${
                      isOpen ? "rotate-180 bg-black text-white" : "bg-white text-slate-600"
                    }`}
                    aria-hidden="true"
                  >
                    ↓
                  </span>
                </div>
                {isOpen ? (
                  <p className="mt-3 text-sm text-slate-600">{faq.answer}</p>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="rounded-3xl border border-black/10 bg-[var(--mist)] p-8 md:flex md:items-center md:justify-between">
          <div className="space-y-2">
            <h3 className="text-3xl font-semibold tracking-tight">
              Pret a evaluer IndexIA ?
            </h3>
            <p className="text-sm text-slate-600">
              Lancez une demo et testez la flexibilite RAG avec vos documents.
            </p>
          </div>
          <div className="mt-6 flex gap-3 md:mt-0">
            <Button
              asChild
              className="cursor-pointer rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white"
            >
              <Link href="/login">Demander une demo</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="cursor-pointer rounded-full border-slate-300 hover:bg-transparent hover:text-[var(--ink)]"
            >
              <Link href="/login">Contact equipe</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-slate-900">IndexIA</div>
            <div className="text-xs text-slate-500">
              Recherche RAG, modeles LLM et gouvernance documentaire.
            </div>
          </div>
          <div className="text-xs text-slate-500">
            © 2025 IndexIA · Projet R&D Polytech
          </div>
        </div>
      </footer>
      <style jsx>{`
        .animate-fade-up {
          animation: fadeUp 0.8s ease forwards;
          opacity: 0;
          transform: translateY(10px);
        }
        .animate-fade-up:nth-child(1) {
          animation-delay: 0.05s;
        }
        .animate-fade-up:nth-child(2) {
          animation-delay: 0.15s;
        }
        .animate-fade-up:nth-child(3) {
          animation-delay: 0.25s;
        }
        .animate-fade-up:nth-child(4) {
          animation-delay: 0.35s;
        }
        .animate-fade-up:nth-child(5) {
          animation-delay: 0.45s;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  )
}
