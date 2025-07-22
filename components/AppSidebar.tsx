"use client"

import { 
  CreditCard, 
  Home, 
  User 
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavigationItem } from "@/types/navigation"

const dashboardItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Overview of your financial data",
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: CreditCard,
    description: "View and manage transactions",
  },
]

const accountItems: NavigationItem[] = [
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    description: "Personal information",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <CreditCard className="h-6 w-6 text-credit" />
          <h2 className="text-lg font-semibold">TrackMySpend</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...dashboardItems, ...accountItems].map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "!bg-primary !text-primary-foreground hover:!bg-primary" : ""}
                    >
                      <Link href={item.url} title={item.description}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-4 text-xs text-muted-foreground">
          © 2024 TrackMySpend
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}