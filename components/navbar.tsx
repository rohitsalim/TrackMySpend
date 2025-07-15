import { Bell, Search, User, Calendar, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Navbar() {
  // TODO: Replace with actual auth state from Supabase
  // const isAuthenticated = true // Placeholder for auth state
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
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
            
            <Button variant="ghost" size="icon" title="User menu">
              <User className="h-4 w-4" />
              <span className="sr-only">User menu</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}