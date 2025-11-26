"use client"

import * as React from "react"
import Image from "next/image"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconInnerShadowTop,
  IconLogout,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const logoSrc = "/logo.png"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Utilisateurs",
      url: "#",
      icon: IconUsers,
    },
    {
      title: "Permissions",
      url: "#",
      icon: IconInnerShadowTop,
    },
    {
      title: "Documents",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Index vectoriel",
      url: "#",
      icon: IconDatabase,
    },
    {
      title: "Logs & Activité",
      url: "#",
      icon: IconReport,
    },
    {
      title: "Benchmarks LLM / RAG",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Debug RAG",
      url: "#",
      icon: IconSearch,
    },
  ],
}

export function AppSidebar({
  onNavSelect,
  activeItem,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onNavSelect?: (title: string) => void
  activeItem?: string
}) {
  React.useEffect(() => {
    onNavSelect?.(data.navMain[0]?.title ?? "")
  }, [onNavSelect])

  const [session, setSession] = React.useState<{
    firstName?: string | null
    lastName?: string | null
    email?: string
  } | null>(null)

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

  const userLabel = React.useMemo(() => {
    const fromSession = [session?.firstName, session?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()
    if (fromSession) return fromSession
    if (session?.email) return session.email
    return data.user.name || data.user.email
  }, [session])

  const userInitials = React.useMemo(() => {
    const source =
      [session?.firstName, session?.lastName].filter(Boolean).join(" ").trim() ||
      session?.email ||
      data.user.name ||
      data.user.email ||
      ""
    const parts = source.split(/[\s.@_-]+/).filter(Boolean)
    if (parts.length === 0) return ""
    const first = parts[0]?.[0] ?? ""
    const last = parts[parts.length - 1]?.[0] ?? ""
    return `${first}${last}`.toUpperCase()
  }, [session])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="mb-4 pt-4">
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
      <SidebarContent>
        <NavMain
          items={data.navMain}
          onSelect={onNavSelect}
          activeTitle={activeItem}
        />
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        <div className="flex flex-col gap-2">
          <button
            className="text-muted-foreground hover:bg-muted flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
            type="button"
          >
            <IconSettings className="h-4 w-4" />
            Paramètres
          </button>
          <button
            className="text-red-500 hover:bg-red-50 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition cursor-pointer"
            type="button"
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
                Connecté
              </div>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
