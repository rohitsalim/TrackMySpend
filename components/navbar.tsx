"use client"

import React from "react"
import { Bell, Search, User, Calendar, Filter, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Navbar() {
  const { user, signOut } = useAuthStore()
  const router = useRouter()
  
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
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search transactions, vendors, amounts..."
                className="pl-8 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" title="Filter transactions">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter transactions</span>
            </Button>
            
            <Button variant="ghost" size="icon" title="Date range">
              <Calendar className="h-4 w-4" />
              <span className="sr-only">Date range</span>
            </Button>
            
            <Button variant="ghost" size="icon" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
            
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
    </header>
  )
}