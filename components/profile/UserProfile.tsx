"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Calendar, Mail, Shield, Settings, HardDrive, Target } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transaction-store'
import { formatDistanceToNow } from '@/lib/utils'
import { useMemo } from 'react'

export function UserProfile() {
  const { user } = useAuthStore()
  const { transactions } = useTransactionStore()
  
  // Calculate data quality score
  const dataQualityScore = useMemo(() => {
    if (transactions.length === 0) return 0
    
    const categorizedCount = transactions.filter(tx => tx.category_id && tx.category_id !== '').length
    const resolvedVendorCount = transactions.filter(tx => tx.vendor_name && tx.vendor_name.trim() !== '').length
    
    // Average of categorization and vendor resolution rates
    const categorizationRate = (categorizedCount / transactions.length) * 100
    const vendorResolutionRate = (resolvedVendorCount / transactions.length) * 100
    
    return Math.round((categorizationRate + vendorResolutionRate) / 2)
  }, [transactions])
  
  if (!user) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-center text-muted-foreground">Loading user information...</p>
        </CardContent>
      </Card>
    )
  }

  // Extract user name from email or use a default
  const displayName = user.user_metadata?.full_name || 
    user.email?.split('@')[0]?.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ||
    'User'
    
  const initials = displayName
    .split(' ')
    .map((name: string) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const joinDate = new Date(user.created_at)
  const profileImage = user.user_metadata?.avatar_url
  const accountAge = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Account Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="flex flex-col justify-between flex-1 space-y-6">
          {/* Avatar and Name Section */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <Badge variant="secondary" className="mt-1 text-xs">
                Premium User
              </Badge>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">
                  {accountAge < 30 ? `${accountAge} days ago` : formatDistanceToNow(joinDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Security Status</p>
                <p className="text-sm font-medium text-green-600">Verified Account</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Target className={`h-4 w-4 flex-shrink-0 ${
                dataQualityScore >= 80 ? 'text-green-500' : 
                dataQualityScore >= 60 ? 'text-yellow-500' : 
                'text-red-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Data Quality</p>
                <p className={`text-sm font-medium ${
                  dataQualityScore >= 80 ? 'text-green-600' : 
                  dataQualityScore >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {transactions.length === 0 ? 'No data yet' : `${dataQualityScore}% organized`}
                </p>
              </div>
            </div>
          </div>


          {/* Account Settings */}
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Settings className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                </div>
                <p className="text-sm font-bold text-green-600">Active</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Currency</p>
                </div>
                <p className="text-sm font-bold">₹ INR</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}