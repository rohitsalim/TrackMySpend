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
import { Badge } from '@/components/ui/badge'
import { useTransactionStore } from '@/store/transaction-store'
import { useUploadStore } from '@/store/uploadStore'
import { CalendarIcon, X, Filter, Sparkles } from 'lucide-react'
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
    const presets = generateSmartPresets(files, transactions)
    setSmartPresets(presets)
    
    // Auto-initialize with smart default if not already set and not initialized
    if (!isInitialized && (!value.start && !value.end)) {
      const smartDefault = getSmartDefaultDateRange(files, transactions)
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
      }
    }
    setIsInitialized(true)
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
  
  // Group presets by priority/type
  const dataBasedPresets = smartPresets.filter(p => p.isDataBased).slice(0, 4) // Top 4 data-based
  const calendarPresets = smartPresets.filter(p => !p.isDataBased).slice(0, 3) // Top 3 calendar-based
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Filter Label */}
        {showLabel && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Time Period</Label>
          </div>
        )}
        
        {/* Smart Preset Buttons */}
        {dataBasedPresets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Smart Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dataBasedPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={activePreset === preset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs relative"
                >
                  {preset.label}
                  <Badge 
                    variant="secondary" 
                    className="ml-2 px-1 py-0 text-[10px] bg-blue-100 text-blue-700"
                  >
                    data
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Calendar-based Presets */}
        {calendarPresets.length > 0 && (
          <div className="space-y-2">
            {dataBasedPresets.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Standard Periods</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {calendarPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={activePreset === preset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Custom Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">or custom:</span>
          
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs justify-start min-w-[100px]"
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {value.start ? (
                  format(value.start, 'MMM dd')
                ) : (
                  'From'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value.start || undefined}
                onSelect={(date) => handleDateRangeChange('start', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs justify-start min-w-[100px]"
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {value.end ? (
                  format(value.end, 'MMM dd')
                ) : (
                  'To'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
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
            className="text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      
      {/* Active Filter Indicator */}
      {hasActiveFilters && (
        <div className="pt-3 border-t bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing data from</span>
            <span className="font-medium text-foreground">
              {value.start ? format(value.start, 'PPP') : 'beginning'}
            </span>
            <span>to</span>
            <span className="font-medium text-foreground">
              {value.end ? format(value.end, 'PPP') : 'now'}
            </span>
            {activePreset !== 'custom' && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-[10px]">
                  {smartPresets.find(p => p.id === activePreset)?.isDataBased ? 'Smart' : 'Standard'}
                </Badge>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}