"use client"

import React from 'react'
import { DotLottiePlayer } from '@dotlottie/react-player'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface EmptyStateProps {
  onUploadClick: () => void
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-64 h-64 mb-6">
        <DotLottiePlayer
          src="/animations/empty.lottie"
          loop
          autoplay
        />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">No statements uploaded yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Upload your bank or credit card statements to get started with automated transaction analysis and insights.
      </p>
      
      <Button onClick={onUploadClick} size="lg">
        <Upload className="mr-2 h-4 w-4" />
        Upload Statements
      </Button>
    </div>
  )
}