'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StudentShell, { StudentUser } from '@/components/StudentShell'

type Transaction = {
  id: string
  amount: number
  reason: string
  created_at: string
}

type RequestItem = {
  id: string
  kind: 'Job' | 'Reward'
  label: string
  status: string
  created_at: string
}

type Summary = {
  balance: number
  held: number
  available: number
  transactions: Transaction[]
  submissions: { id: string; status: string; created_at: string; jobs: { name: string } }[]
  redemptions: { id: string; status: string; created_at: string; rewards: { name: string } }[]
}

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
}

type Challenge = {
  id: string
  title: string
  description: string | null
  goal: number
  progress: number
  reward_points: number
  status: string
}

const BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-600',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardContent({ user }: { user: StudentUser }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])

  useEffect(() => {
    fetch('/api/summary')
      .then(r => r.json())
      .then(setSummary)
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []))
    fetch('/api/challenges')
      .then(r => r.json())
      .then(d => setChallenges(d.challenges || []))
  }, [user.id])

  if (!summary) return <p className="text-sm text-gray-400">Loading…</p>

  const requests: RequestItem[] = [
    ...summary.submissions.map(s => ({
      id: s.id,
      kind: 'Job' as const,
      label: s.jobs?.name ?? 'Job',
      status: s.status,
      created_at: s.created_at,
    })),
    ...summary.redemptions.map(r => ({
      id: r.id,
      kind: 'Reward' as const,
      label: r.rewards?.name ?? 'Reward',
      status: r.status,
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 6)

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{greeting()}, {user.first_name} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s how you&apos;re tracking.</p>
      </div>

      {/* Balance */}
      <div className="bg-blue-600 rounded-2xl p-7 text-white mb-6">
        <div className="text-sm opacity-75 mb-1">Your points</div>
        <div className="text-5xl font-bold tracking-tight">{summary.available}</div>
        <div className="text-sm opacity-70 mt-1">points available</div>
        {summary.held > 0 && (
          <div className="text-xs bg-white/15 inline-block rounded-lg px-3 py-1.5 mt-4">
            {summary.held} pts held for pending reward requests
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <Link href="/jobs" className="bg-white/15 hover:bg-white/25 transition-colors text-sm font-semibold px-4 py-2 rounded-lg">
            🛠 Earn points
          </Link>
          <Link href="/rewards" className="bg-white/15 hover:bg-white/25 transition-colors text-sm font-semibold px-4 py-2 rounded-lg">
            🎁 Browse rewards
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="text-sm font-semibold text-gray-500 mb-4">Recent activity</div>
          {summary.transactions.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {summary.transactions.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.reason}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(t.created_at)}</div>
                  </div>
                  <div className={`text-sm font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My requests */}
        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="text-sm font-semibold text-gray-500 mb-4">My requests</div>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nothing yet. Submit a job or request a reward and it will show up here.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {requests.map(r => (
                <div key={`${r.kind}-${r.id}`} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.kind} · {formatDate(r.created_at)}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${BADGE[r.status] || ''}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Announcements */}
        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="text-sm font-semibold text-gray-500 mb-4">Announcements</div>
          {announcements.length === 0 ? (
            <p className="text-sm text-gray-400">No announcements right now.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {announcements.map(a => (
                <div key={a.id} className="py-3">
                  <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                  <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{a.body}</div>
                  <div className="text-xs text-gray-400 mt-1.5">{formatDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Challenges */}
        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="text-sm font-semibold text-gray-500 mb-4">Challenges</div>
          {challenges.length === 0 ? (
            <p className="text-sm text-gray-400">No challenges right now.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {challenges.map(c => {
                const pct = Math.min(100, Math.round((c.progress / c.goal) * 100))
                return (
                  <div key={c.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">{c.title}</div>
                      {c.status === 'completed' && (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ Done
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <div className="text-xs text-gray-500 mt-1">{c.description}</div>
                    )}
                    <div className="h-2 bg-blue-50 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                      <span>{c.progress} / {c.goal}</span>
                      <span>{c.reward_points > 0 ? `+${c.reward_points} pts each when done` : `${pct}%`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <StudentShell>{user => <DashboardContent user={user} />}</StudentShell>
}