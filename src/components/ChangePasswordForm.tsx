'use client'

import { useState } from 'react'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (next.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (next !== confirm) {
      setMessage({ type: 'error', text: 'The new passwords do not match.' })
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setMessage({ type: 'ok', text: 'Password changed.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
        <input
          type="password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <input
          type="password"
          value={next}
          onChange={e => setNext(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
          required
        />
      </div>

      {message && (
        <p
          className={`text-sm px-3 py-2 rounded-lg ${
            message.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}