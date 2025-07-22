import { ReactNode } from 'react'
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/navbar";

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Add authentication check here
  // Redirect to auth if not authenticated
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <Navbar />
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}