'use client'

import { useEffect, useState } from 'react'

export default function SettingsPanel() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/committee/settings')
      .then(r => r.json())
      .then(data => {
        setEnabled(Boolean(data.leaderboardEnabled))
        setLoading(false)
      })
  }, [])

  async function toggle() {
    setSaving(true)
    setError('')
    const next = !enabled
    const res = await fetch('/api/committee/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaderboardEnabled: next }),
    })
    if (res.ok) {
      setEnabled(next)
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Decide what students can see.</p>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 p-5">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-gray-900">Leaderboard</div>
            <div className="text-xs text-gray-500 mt-1">
              Shows the top 10 students by total points earned (first name and last initial only).
              Each student can also see their own rank. When off, balances stay completely private.
            </div>
          </div>

          <button
            onClick={toggle}
            disabled={loading || saving}
            className={`text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-colors disabled:opacity-50 ${
              enabled
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {loading ? '…' : enabled ? 'On — click to turn off' : 'Off — click to turn on'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}