"use client"

import * as React from "react"
import Image from "next/image"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconInnerShadowTop,
  IconReport,
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
