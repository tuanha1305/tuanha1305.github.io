import { AlertTriangle } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">System Maintenance</h3>
            <p className="text-gray-600">
              We're currently performing scheduled maintenance to improve your experience. We'll be
              back shortly. Thank you for your patience.
            </p>
          </div>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">We will be back soon</div>
      </div>
    </div>
  )
}
