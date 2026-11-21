'use client'

import { useEffect, useState } from 'react'
import StudentShell, { StudentUser } from '@/components/StudentShell'

type Row = { rank: number; name: string; earned: number; isYou: boolean }

type Data = {
  enabled: boolean
  top?: Row[]
  you?: { rank: number; earned: number } | null
  total?: number
}

function LeaderboardContent({ user }: { user: StudentUser }) {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(setData)
  }, [user.id])

  if (!data) return <p className="text-sm text-gray-400">Loading…</p>

  if (!data.enabled) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-sm text-gray-500">
          The leaderboard is not turned on right now. The committee decides whether it is shown.
        </p>
      </div>
    )
  }

  const top = data.top || []
  const youInTop = top.some(r => r.isYou)

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ranked by total points earned.</p>
      </div>

      {data.you && !youInTop && (
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4 mb-4 text-sm">
          You are <span className="font-bold">#{data.you.rank}</span> of {data.total} with{' '}
          <span className="font-bold">{data.you.earned}</span> points earned.
        </div>
      )}

      <div className="bg-white rounded-xl border border-blue-100 divide-y divide-gray-100">
        {top.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">Nobody has earned points yet.</p>
        ) : (
          top.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-3 ${r.isYou ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 text-sm font-bold text-gray-400">
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {r.name}
                  {r.isYou && <span className="ml-2 text-xs text-blue-600 font-semibold">You</span>}
                </div>
              </div>
              <div className="text-sm font-bold text-blue-600">{r.earned} pts</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  return <StudentShell>{user => <LeaderboardContent user={user} />}</StudentShell>
}