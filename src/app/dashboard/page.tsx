'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  first_name: string
  last_name: string
  username: string
  role: string
}

type Transaction = {
  id: string
  amount: number
  reason: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      router.push('/')
      return
    }
    const parsed = JSON.parse(stored)
    if (parsed.role !== 'student') {
      router.push('/committee')
      return
    }
    setUser(parsed)
    fetchTransactions(parsed.id)
  }, [])

  async function fetchTransactions(userId: string) {
    const res = await fetch(`/api/transactions?userId=${userId}`)
    const data = await res.json()
    setTransactions(data.transactions || [])
    const total = (data.transactions || []).reduce(
      (sum: number, t: Transaction) => sum + t.amount, 0
    )
    setBalance(total)
  }

  function handleLogout() {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-blue-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-blue-100 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CR</div>
          <div>
            <div className="font-semibold text-sm text-gray-900">Common Room</div>
            <div className="text-xs text-gray-400">Year 12</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">⊞ Dashboard</div>
          <div className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">📋 My Points</div>
          <div className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">🛠 Jobs</div>
          <div className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">🎁 Rewards</div>
          <div className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">🏆 Leaderboard</div>
          <div className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">📢 Announcements</div>
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

      {/* Main content */}
      <div className="ml-56 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Good morning, {user.first_name} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here's how you're tracking this term.</p>
        </div>

        {/* Balance card */}
        <div className="bg-blue-600 rounded-2xl p-7 text-white mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm opacity-75 mb-1">Your points</div>
            <div className="text-5xl font-bold tracking-tight">{balance}</div>
            <div className="text-sm opacity-70 mt-1">points available</div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="text-sm font-semibold text-gray-500 mb-4">Recent activity</div>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.reason}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}