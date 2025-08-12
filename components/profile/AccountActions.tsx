"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  LogOut, 
  Settings, 
  Download, 
  Upload,
  MoreVertical,
  FileSpreadsheet,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transaction-store'
import { useRouter } from 'next/navigation'
import { exportToCSV } from '@/lib/utils/export'

export function AccountActions() {
  const router = useRouter()
  const { signOut } = useAuthStore()
  const { transactions } = useTransactionStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutDialog(false)
    }
  }

  const handleExportData = () => {
    if (transactions.length === 0) {
      return
    }
    
    const dateRange = transactions.length > 0
      ? `${new Date(transactions[transactions.length - 1].transaction_date).toLocaleDateString()} - ${new Date(transactions[0].transaction_date).toLocaleDateString()}`
      : 'No Data'
    
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const summary = {
      totalTransactions: transactions.length,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      dateRange
    }

    exportToCSV({
      transactions,
      summary
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Upload New File Button */}
        <Button 
          variant="default" 
          onClick={() => router.push('/')}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload Statement</span>
          <span className="sm:hidden">Upload</span>
        </Button>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={handleExportData}
              disabled={transactions.length === 0}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export All Data
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => router.push('/transactions')}
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-2" />
              View Transactions
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => console.log('Settings not implemented yet')}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => setShowLogoutDialog(true)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account? You&apos;ll need to sign in again to access your financial data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}