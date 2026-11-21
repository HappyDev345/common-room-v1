'use client'

import { useEffect, useState } from 'react'

type Challenge = {
  id: string
  title: string
  description: string | null
  goal: number
  progress: number
  reward_points: number
  status: string
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ChallengesManager() {
  const [items, setItems] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [rewardPoints, setRewardPoints] = useState('')
  const [creating, setCreating] = useState(false)

  const [amounts, setAmounts] = useState<Record<string, string>>({})

  async function load() {
    const res = await fetch('/api/committee/challenges')
    const data = await res.json()
    setItems(data.challenges || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setMessage(null)

    const res = await fetch('/api/committee/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        goal: parseInt(goal),
        rewardPoints: parseInt(rewardPoints || '0'),
      }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage({ type: 'ok', text: `Challenge "${title}" created.` })
      setTitle('')
      setDescription('')
      setGoal('')
      setRewardPoints('')
      await load()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong' })
    }
    setCreating(false)
  }

  async function patch(id: string, payload: Record<string, unknown>, okText?: string) {
    setMessage(null)
    const res = await fetch('/api/committee/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    const data = await res.json()
    if (res.ok) {
      if (okText) setMessage({ type: 'ok', text: okText })
      await load()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong' })
    }
  }

  function addProgress(c: Challenge) {
    const amount = parseInt(amounts[c.id] || '')
    if (!Number.isInteger(amount) || amount === 0) {
      setMessage({ type: 'error', text: 'Enter a number first (use a negative number to take progress away).' })
      return
    }
    patch(c.id, { action: 'progress', amount })
    setAmounts({ ...amounts, [c.id]: '' })
  }

  function complete(c: Challenge) {
    const text =
      c.reward_points > 0
        ? `Complete "${c.title}"? Every student will receive ${c.reward_points} points. This cannot be undone.`
        : `Mark "${c.title}" as complete?`
    if (!window.confirm(text)) return
    patch(c.id, { action: 'complete' }, `"${c.title}" completed.`)
  }

  function archive(c: Challenge) {
    if (!window.confirm(`Remove "${c.title}" from the list? No points will be awarded.`)) return
    patch(c.id, { action: 'archive' })
  }

  const active = items.filter(c => c.status === 'active')
  const completed = items.filter(c => c.status === 'completed')

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Challenges</h1>
        <p className="text-sm text-gray-500 mt-1">
          Shared goals for the whole cohort. Update the progress as it happens, then complete the challenge to pay out the reward to every student.
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

      <div className="bg-white rounded-xl border border-blue-100 p-5 mb-6">
        <div className="text-sm font-semibold text-gray-500 mb-4">New challenge</div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal (e.g. 50 resets)</label>
              <input
                type="number"
                min={1}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reward for every student (pts)</label>
              <input
                type="number"
                min={0}
                value={rewardPoints}
                onChange={e => setRewardPoints(e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="self-start bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : 'Create challenge'}
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="text-sm font-semibold text-gray-500 mb-3">Active</div>
          {active.length === 0 ? (
            <p className="text-sm text-gray-400 mb-6">No active challenges.</p>
          ) : (
            <div className="flex flex-col gap-3 mb-6">
              {active.map(c => {
                const pct = Math.min(100, Math.round((c.progress / c.goal) * 100))
                const reached = c.progress >= c.goal
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-blue-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{c.title}</div>
                        {c.description && (
                          <div className="text-xs text-gray-500 mt-1">{c.description}</div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                        {c.reward_points > 0 ? `+${c.reward_points} pts each` : 'No points reward'}
                      </div>
                    </div>

                    <div className="h-2 bg-blue-50 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                      <span>{c.progress} / {c.goal}</span>
                      <span>{pct}%</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <input
                        type="number"
                        value={amounts[c.id] || ''}
                        onChange={e => setAmounts({ ...amounts, [c.id]: e.target.value })}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+ amount"
                      />
                      <button
                        onClick={() => addProgress(c)}
                        className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Update progress
                      </button>
                      <button
                        onClick={() => complete(c)}
                        disabled={!reached}
                        className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                      >
                        {reached ? 'Complete and pay out' : 'Goal not reached'}
                      </button>
                      <button
                        onClick={() => archive(c)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {completed.length > 0 && (
            <>
              <div className="text-sm font-semibold text-gray-500 mb-3">Completed</div>
              <div className="flex flex-col gap-2">
                {completed.map(c => (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-blue-100 px-5 py-3 flex items-center justify-between"
                  >
                    <div className="text-sm text-gray-900">{c.title}</div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        ✓ Completed
                      </span>
                      <button
                        onClick={() => archive(c)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}