import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">TrackMySpend</h1>
          <p className="text-muted-foreground mt-2">
            Financial Statement Analysis Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}