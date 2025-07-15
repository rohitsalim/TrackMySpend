import { 
  BarChart3, 
  CreditCard, 
  Home, 
  Settings, 
  Upload, 
  User 
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  {
    title: "Upload",
    url: "/upload",
    icon: Upload,
    description: "Upload bank statements",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    description: "Spending insights and trends",
  },
]

const accountItems: NavigationItem[] = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Account preferences",
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    description: "Personal information",
  },
]

export function AppSidebar() {
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
          <SidebarGroupLabel>Financial Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} title={item.description}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} title={item.description}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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