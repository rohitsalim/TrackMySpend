import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-destructive">Authentication Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            There was an error processing your authentication request.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This could happen if:
          </p>
          <ul className="text-left text-sm text-muted-foreground space-y-1">
            <li>• The authentication session expired</li>
            <li>• You cancelled the authentication process</li>
            <li>• There was a network error</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <Button asChild>
            <Link href="/login">
              Try Again
            </Link>
          </Button>
          
          <p className="text-xs text-muted-foreground">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}