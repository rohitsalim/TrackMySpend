import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Add authentication check here
  // Redirect to auth if not authenticated
  
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  )
}