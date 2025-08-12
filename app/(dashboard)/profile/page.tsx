"use client"

import { useEffect } from 'react'
import { FileList } from '@/components/upload/FileList'
import { UserProfile } from '@/components/profile/UserProfile'
import { AccountStatistics } from '@/components/profile/AccountStatistics'
import { AccountActions } from '@/components/profile/AccountActions'
import { useTransactionStore } from '@/store/transaction-store'

export default function ProfilePage() {
  const { fetchCategories, ensureTransactionsLoaded } = useTransactionStore()
  
  useEffect(() => {
    const loadData = async () => {
      await fetchCategories()
      await ensureTransactionsLoaded()
    }
    loadData()
  }, [fetchCategories, ensureTransactionsLoaded])
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account, view statistics, and uploaded files
          </p>
        </div>
        <AccountActions />
      </div>
      
      {/* User Overview and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <UserProfile />
        </div>
        <div className="lg:col-span-2">
          <AccountStatistics />
        </div>
      </div>
      
      {/* File Management */}
      <FileList />
    </div>
  )
}