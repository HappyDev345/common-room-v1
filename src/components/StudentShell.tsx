'use client'

import { useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export type StudentUser = {
  id: string
  first_name: string
  last_name: string
  username: string
  role: string
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/jobs', label: 'Jobs', icon: '🛠' },
  { href: '/rewards', label: 'Rewards', icon: '🎁' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/account', label: 'Account', icon: '🔒' },
]

export default function StudentShell({
  children,
}: {
  children: (user: StudentUser) => ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<StudentUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data?.user) {
          router.push('/')
          return
        }
        if (data.user.role !== 'student') {
          router.push('/committee')
          return
        }
        setUser(data.user)
      })
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-blue-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-blue-100 flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CR</div>
          <div>
            <div className="font-semibold text-sm text-gray-900">Common Room</div>
            <div className="text-xs text-gray-400">Year 12</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-blue-100 pt-4 px-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
              <div className="text-xs text-gray-400">Student</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-gray-400 hover:text-red-500 px-2 py-1 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-blue-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CR</div>
          <span className="font-semibold text-sm text-gray-900">Common Room</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400">Sign out</button>
      </header>

      {/* Page content */}
      <div className="md:ml-56 p-5 md:p-8 pb-24 md:pb-8">{children(user)}</div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-blue-100 flex">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-3 text-xs font-medium ${
              pathname === item.href ? 'text-blue-700' : 'text-gray-400'
            }`}
          >
            <div className="text-lg leading-none mb-1">{item.icon}</div>
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  )
}