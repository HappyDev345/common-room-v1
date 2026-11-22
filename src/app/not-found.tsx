import Link from 'next/link'

// Shown automatically for any address that does not exist
export default function NotFound() {
  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 w-full max-w-md text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm mx-auto mb-6">
          CR
        </div>

        <div className="text-6xl font-bold text-blue-600 tracking-tight">404</div>
        <h1 className="text-xl font-bold text-gray-900 mt-3">Page not found</h1>
        <p className="text-sm text-gray-500 mt-2">
          This page does not exist, or it may have moved. Check the address, or head back to your dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/"
            className="bg-blue-50 text-blue-700 rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}