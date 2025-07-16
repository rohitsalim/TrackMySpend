export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">TrackMySpend</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-8 shadow-md">
          <p className="text-center text-gray-500">
            Google OAuth authentication will be implemented here.
          </p>
          <p className="mt-4 text-center text-sm text-gray-400">
            Environment variables configured: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗'}
          </p>
        </div>
      </div>
    </div>
  )
}