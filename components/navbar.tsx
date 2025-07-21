"use client"

import React, { useEffect, useState } from "react"
import { User, LogOut, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/authStore"
import { useUploadStore } from "@/store/uploadStore"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UploadModal } from "@/components/upload/upload-modal"

export function Navbar() {
  const { user, signOut } = useAuthStore()
  const { hasUploadedFiles, fetchUserFiles } = useUploadStore()
  const router = useRouter()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  
  useEffect(() => {
    if (user) {
      fetchUserFiles()
    }
  }, [user, fetchUserFiles])
  
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-2">
        <SidebarTrigger />
        
        <div className="flex flex-1 items-center justify-end">
          <div className="flex items-center space-x-2">
            {hasUploadedFiles && (
              <Button 
                variant="secondary"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Statement
              </Button>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Avatar className="h-[22px] w-[22px]">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User avatar'} />
                      <AvatarFallback className="text-xs">
                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="end">
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" title="User menu">
                <User className="h-4 w-4" />
                <span className="sr-only">User menu</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <UploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
      />
    </header>
  )
}