"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useTransactionStore } from '@/store/transaction-store'
import { useUploadStore } from '@/store/uploadStore'
import { CalendarIcon, X, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { 
  generateSmartPresets, 
  getSmartDefaultDateRange,
  type DatePreset 
} from '@/lib/utils/date-range-analysis'

interface DateRange {
  start: Date | null
  end: Date | null
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
  context?: 'dashboard' | 'transactions'
  showLabel?: boolean
  className?: string
}

export function DateRangeFilter({ 
  value, 
  onChange, 
  context = 'dashboard',
  showLabel = true,
  className = ""
}: DateRangeFilterProps) {
  const { transactions } = useTransactionStore()
  const { files } = useUploadStore()
  
  const [activePreset, setActivePreset] = useState<string>('custom')
  const [smartPresets, setSmartPresets] = useState<DatePreset[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Generate smart presets when data changes
  useEffect(() => {
    // Only proceed if we have data to work with
    if (transactions.length === 0) {
      return
    }
    
    const presets = generateSmartPresets(files, transactions)
    setSmartPresets(presets)
    
    // Auto-initialize with smart default if not already set and not initialized
    if (!isInitialized && (!value.start && !value.end)) {
      const smartDefault = getSmartDefaultDateRange(files, transactions)
      
      // Apply the smart default
      onChange(smartDefault)
      
      // Find which preset matches the smart default
      const matchingPreset = presets.find(preset => {
        const presetValue = preset.getValue()
        return (
          presetValue.start?.getTime() === smartDefault.start?.getTime() &&
          presetValue.end?.getTime() === smartDefault.end?.getTime()
        )
      })
      
      if (matchingPreset) {
        setActivePreset(matchingPreset.id)
      } else if (presets.length > 0) {
        // Fallback: select the first high-priority smart preset
        const firstSmartPreset = presets.find(p => p.isDataBased) || presets[0]
        if (firstSmartPreset) {
          setActivePreset(firstSmartPreset.id)
          const fallbackRange = firstSmartPreset.getValue()
          onChange(fallbackRange)
        }
      }
      
      setIsInitialized(true)
    }
  }, [files, transactions, onChange, value.start, value.end, isInitialized])

  // Update active preset when external value changes
  useEffect(() => {
    const matchingPreset = smartPresets.find(preset => {
      const presetValue = preset.getValue()
      return (
        presetValue.start?.getTime() === value.start?.getTime() &&
        presetValue.end?.getTime() === value.end?.getTime()
      )
    })
    
    setActivePreset(matchingPreset?.id || 'custom')
  }, [value, smartPresets])
  
  const handlePresetClick = (preset: DatePreset) => {
    const dateRange = preset.getValue()
    setActivePreset(preset.id)
    onChange(dateRange)
  }
  
  const handleDateRangeChange = (field: 'start' | 'end', date: Date | undefined) => {
    const newDateRange = {
      ...value,
      [field]: date || null
    }
    setActivePreset('custom')
    onChange(newDateRange)
  }
  
  const handleReset = () => {
    setActivePreset('custom')
    onChange({ start: null, end: null })
  }
  
  const hasActiveFilters = value.start || value.end
  
  // Get all presets sorted by priority, limit to top 5-6 for space
  const allPresets = smartPresets.slice(0, 6)
  
  // Simplify preset labels for compactness
  const getCompactLabel = (preset: DatePreset) => {
    return preset.label
      .replace(/All My Data \(([^)]+)\)/, 'All Data ($1)')
      .replace(/Latest Statement \(([^)]+)\)/, 'Latest ($1)')
      .replace(/Latest Period \(([^)]+)\)/, 'Latest ($1)')
      .replace(/This Month \(([^)]+)\)/, 'This Month')
      .replace(/Last (\d+) Days/, 'Last $1d')
      .replace(/Last (\d+) Months/, 'Last $1m')
  }
  
  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Label */}
        {showLabel && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Time Period</Label>
          </div>
        )}
        
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {allPresets.map((preset) => (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={`text-xs h-7 px-3 relative ${
                preset.isDataBased 
                  ? 'border-l-2 border-l-blue-500' 
                  : ''
              }`}
            >
              {getCompactLabel(preset)}
            </Button>
          ))}
        </div>
        
        {/* Custom Date Range */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground">or</span>
          
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-3 justify-start min-w-[80px]"
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {value.start ? format(value.start, 'MMM d') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.start || undefined}
                onSelect={(date) => handleDateRangeChange('start', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Separator */}
          {value.start && value.end && (
            <span className="text-xs text-muted-foreground px-1">→</span>
          )}
          
          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-3 justify-start min-w-[80px]"
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {value.end ? format(value.end, 'MMM d') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.end || undefined}
                onSelect={(date) => handleDateRangeChange('end', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs h-7 px-2 gap-1 flex-shrink-0"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}