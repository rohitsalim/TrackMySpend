"use client"

import { FileList } from '@/components/upload/FileList'
import { useAuthStore } from '@/store/authStore'

export default function ProfilePage() {
  const { user } = useAuthStore()
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and uploaded files
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">User ID</span>
                <p className="font-mono text-sm">{user?.id}</p>
              </div>
            </div>
          </div>
          
          <FileList />
        </div>
      </div>
    </div>
  )
}