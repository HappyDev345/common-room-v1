'use client'

import { useEffect, useState } from 'react'
import StudentShell, { StudentUser } from '@/components/StudentShell'

type Reward = {
  id: string
  name: string
  description: string | null
  cost: number
}

function RewardsContent({ user }: { user: StudentUser }) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [available, setAvailable] = useState(0)
  const [held, setHeld] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function load() {
    const [rewardsRes, summaryRes] = await Promise.all([
      fetch('/api/rewards'),
      fetch(`/api/summary?userId=${user.id}`),
    ])
    const rewardsData = await rewardsRes.json()
    const summary = await summaryRes.json()
    setRewards(rewardsData.rewards || [])
    setAvailable(summary.available ?? 0)
    setHeld(summary.held ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [user.id])

  async function requestReward(reward: Reward) {
    if (!window.confirm(`Request "${reward.name}" for ${reward.cost} points?`)) return

    setBusyId(reward.id)
    setMessage(null)

    const res = await fetch('/api/redemptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, rewardId: reward.id }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage({
        type: 'ok',
        text: `Requested "${reward.name}". ${reward.cost} points are held until the committee reviews it.`,
      })
      await load()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
    }
    setBusyId(null)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
        <p className="text-sm text-gray-500 mt-1">
          You have <span className="font-semibold text-blue-600">{available} points</span> available
          {held > 0 && ` (${held} held for pending requests)`}.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm px-3 py-2 rounded-lg mb-4 ${
            message.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
          }`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-gray-400">No rewards available right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rewards.map(reward => {
            const canAfford = available >= reward.cost
            return (
              <div
                key={reward.id}
                className="bg-white rounded-xl border border-blue-100 p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{reward.name}</div>
                  {reward.description && (
                    <div className="text-xs text-gray-500 mt-1">{reward.description}</div>
                  )}
                  <div className="text-xs font-semibold text-blue-600 mt-2">✦ {reward.cost} pts</div>
                </div>

                <button
                  onClick={() => requestReward(reward)}
                  disabled={!canAfford || busyId === reward.id}
                  className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
                >
                  {busyId === reward.id
                    ? 'Requesting…'
                    : canAfford
                    ? 'Request'
                    : `Need ${reward.cost - available} more`}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RewardsPage() {
  return <StudentShell>{user => <RewardsContent user={user} />}</StudentShell>
}