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

type Submission = {
  id: string
  status: string
  created_at: string
  users: { first_name: string; last_name: string }
  jobs: { name: string; points: number }
}

type Redemption = {
  id: string
  status: string
  created_at: string
  users: { first_name: string; last_name: string }
  rewards: { name: string; cost: number }
}

type Student = {
  id: string
  first_name: string
  last_name: string
  username: string
  balance: number
}

type Transaction = {
  id: string
  amount: number
  reason: string
  created_at: string
  users: { first_name: string; last_name: string }
}

export default function CommitteePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'award' | 'queue' | 'students'>('overview')

  // Data
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  // Award points form
  const [selectedStudent, setSelectedStudent] = useState('')
  const [awardAmount, setAwardAmount] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [awardLoading, setAwardLoading] = useState(false)
  const [awardSuccess, setAwardSuccess] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/'); return }
    const parsed = JSON.parse(stored)
    if (parsed.role === 'student') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchAll(parsed.id)
  }, [])

  async function fetchAll(userId: string) {
    const [subRes, redRes, stuRes, txRes] = await Promise.all([
      fetch('/api/committee/submissions'),
      fetch('/api/committee/redemptions'),
      fetch('/api/committee/students'),
      fetch('/api/committee/transactions'),
    ])
    const [subData, redData, stuData, txData] = await Promise.all([
      subRes.json(), redRes.json(), stuRes.json(), txRes.json(),
    ])
    setSubmissions(subData.submissions || [])
    setRedemptions(subData.redemptions || [])
    setStudents(stuData.students || [])
    setRecentTransactions(txData.transactions || [])

    // Also set redemptions from its own endpoint
    if (redData.redemptions) setRedemptions(redData.redemptions)
  }

  async function handleReviewSubmission(id: string, action: 'approved' | 'declined') {
    await fetch('/api/committee/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewedBy: user?.id }),
    })
    setSubmissions(prev => prev.filter(s => s.id !== id))
    if (action === 'approved') fetchAll(user!.id)
  }

  async function handleReviewRedemption(id: string, action: 'approved' | 'declined') {
    await fetch('/api/committee/redemptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewedBy: user?.id }),
    })
    setRedemptions(prev => prev.filter(r => r.id !== id))
  }

  async function handleAwardPoints(e: React.FormEvent) {
    e.preventDefault()
    setAwardLoading(true)
    setAwardSuccess('')
    const res = await fetch('/api/committee/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedStudent,
        amount: parseInt(awardAmount),
        reason: awardReason,
        awardedBy: user?.id,
      }),
    })
    if (res.ok) {
      setAwardSuccess('Points awarded successfully!')
      setSelectedStudent('')
      setAwardAmount('')
      setAwardReason('')
      fetchAll(user!.id)
    }
    setAwardLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) return null

  const pendingCount = submissions.length + redemptions.length

  const navItems = [
    { key: 'overview', label: 'Overview', icon: '⊞' },
    { key: 'award', label: 'Award Points', icon: '⭐' },
    { key: 'queue', label: 'Review Queue', icon: '📋' },
    { key: 'students', label: 'Students', icon: '👥' },
  ]

  return (
    <main className="min-h-screen bg-blue-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-blue-100 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs">CR</div>
          <div>
            <div className="font-semibold text-sm text-gray-900">Common Room</div>
            <div className="text-xs text-gray-400">Committee</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                activeTab === item.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.key === 'queue' && pendingCount > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-blue-100 pt-4 px-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
              <div className="text-xs text-gray-400 capitalize">{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-56 p-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Committee dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} waiting for review.` : 'Nothing pending review.'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-blue-100 p-5">
                <div className="text-xs text-gray-500 font-medium mb-1">Students</div>
                <div className="text-3xl font-bold text-gray-900">{students.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 p-5">
                <div className="text-xs text-gray-500 font-medium mb-1">Pending reviews</div>
                <div className="text-3xl font-bold text-amber-500">{pendingCount}</div>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 p-5">
                <div className="text-xs text-gray-500 font-medium mb-1">Recent awards</div>
                <div className="text-3xl font-bold text-gray-900">{recentTransactions.length}</div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-xl border border-blue-100 p-5">
              <div className="text-sm font-semibold text-gray-500 mb-4">Recent activity</div>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-400">No activity yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {recentTransactions.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {t.users.first_name} {t.users.last_name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{t.reason}</div>
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
        )}

        {/* AWARD POINTS */}
        {activeTab === 'award' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Award points</h1>
              <p className="text-sm text-gray-500 mt-1">Select a student and record an award.</p>
            </div>

            <div className="bg-white rounded-xl border border-blue-100 p-6 max-w-md">
              <form onSubmit={handleAwardPoints} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                  <select
                    value={selectedStudent}
                    onChange={e => setSelectedStudent(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a student…</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.balance} pts)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    value={awardAmount}
                    onChange={e => setAwardAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 10"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Use a negative number to deduct points.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={awardReason}
                    onChange={e => setAwardReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Tidied common room"
                    required
                  />
                </div>

                {awardSuccess && (
                  <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{awardSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={awardLoading}
                  className="bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {awardLoading ? 'Awarding…' : 'Award points'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW QUEUE */}
        {activeTab === 'queue' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Review queue</h1>
              <p className="text-sm text-gray-500 mt-1">Approve or decline job submissions and reward requests.</p>
            </div>

            {/* Job submissions */}
            <div className="bg-white rounded-xl border border-blue-100 p-5 mb-4">
              <div className="text-sm font-semibold text-gray-500 mb-4">Job submissions</div>
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing pending.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {submissions.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {s.users.first_name} {s.users.last_name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {s.jobs.name} · +{s.jobs.points} pts
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewSubmission(s.id, 'approved')}
                          className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReviewSubmission(s.id, 'declined')}
                          className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reward redemptions */}
            <div className="bg-white rounded-xl border border-blue-100 p-5">
              <div className="text-sm font-semibold text-gray-500 mb-4">Reward redemptions</div>
              {redemptions.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing pending.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {redemptions.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {r.users.first_name} {r.users.last_name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {r.rewards.name} · -{r.rewards.cost} pts
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewRedemption(r.id, 'approved')}
                          className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReviewRedemption(r.id, 'declined')}
                          className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Students</h1>
              <p className="text-sm text-gray-500 mt-1">{students.length} students registered.</p>
            </div>

            <div className="bg-white rounded-xl border border-blue-100 p-5">
              {students.length === 0 ? (
                <p className="text-sm text-gray-400">No students yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</div>
                          <div className="text-xs text-gray-400">@{s.username}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-600">{s.balance} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
