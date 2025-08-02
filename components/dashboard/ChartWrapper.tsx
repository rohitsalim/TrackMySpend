import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartWrapperProps {
  title: string
  children: React.ReactNode
  className?: string
  description?: string
}

export function ChartWrapper({ 
  title, 
  children, 
  className,
  description 
}: ChartWrapperProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px]">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}