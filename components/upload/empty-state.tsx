"use client"

import React from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface EmptyStateProps {
  onUploadClick: () => void
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  const [hasAnimation, setHasAnimation] = React.useState(true)

  const handleDotLottieRef = React.useCallback((dotLottie: unknown) => {
    if (!dotLottie || typeof dotLottie !== 'object') return
    
    const lottieInstance = dotLottie as { addEventListener?: (event: string, callback: () => void) => void }
    lottieInstance.addEventListener?.('loadError', () => {
      console.log('Animation file not found, rendering without animation')
      setHasAnimation(false)
    })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-64 h-64 mb-6 flex items-center justify-center">
        {hasAnimation ? (
          <DotLottieReact
            src="/animations/empty.lottie"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
            dotLottieRefCallback={handleDotLottieRef}
          />
        ) : (
          <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center" data-testid="fallback-upload-icon">
            <Upload className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
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