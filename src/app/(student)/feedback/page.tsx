'use client'

import { useEffect, useState } from 'react'
import {
  categoriesFor,
  getCategory,
  MAX_FEEDBACK_MESSAGE,
  STUDENT_STATUS_LABELS,
  type FeedbackStatus,
  type FeedbackType,
} from '@/lib/feedback-meta'

type Item = {
  id: string
  created_at: string
  type: FeedbackType
  category: string
  message: string
  status: FeedbackStatus
  response: string | null
}

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: 'bg-amber-50 text-amber-700',
  reviewing: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [category, setCategory] = useState(categoriesFor('suggestion')[0].key)
  const [message, setMessage] = useState('')
  const [hideName, setHideName] = useState(false)
  const [sending, setSending] = useState(false)
  const [banner, setBanner] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  async function loadItems() {
    const res = await fetch('/api/feedback')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  function switchType(next: FeedbackType) {
    setType(next)
    setCategory(categoriesFor(next)[0].key)
    setHideName(false)
    setBanner(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setBanner(null)

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, message, hideName }),
    })
    const data = await res.json()

    if (res.ok) {
      setBanner({
        type: 'ok',
        text: type === 'report' ? 'Report sent. Thank you for letting the committee know.' : 'Suggestion sent. Thank you!',
      })
      setMessage('')
      setHideName(false)
      await loadItems()
    } else {
      setBanner({ type: 'error', text: data.error || 'Something went wrong.' })
    }
    setSending(false)
  }

  const categories = categoriesFor(type)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Suggestions and reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Have an idea, or spotted something the committee should know about? Tell us here.
        </p>
      </div>

      {/* Type switch */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => switchType('suggestion')}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            type === 'suggestion' ? 'border-blue-600 bg-blue-50' : 'border-blue-100 bg-white hover:bg-blue-50'
          }`}
        >
          <div className="text-lg">💡</div>
          <div className="text-sm font-semibold text-gray-900">Suggest something</div>
          <div className="text-xs text-gray-500">New jobs, rewards or ideas</div>
        </button>
        <button
          type="button"
          onClick={() => switchType('report')}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            type === 'report' ? 'border-blue-600 bg-blue-50' : 'border-blue-100 bg-white hover:bg-blue-50'
          }`}
        >
          <div className="text-lg">🚩</div>
          <div className="text-sm font-semibold text-gray-900">Report something</div>
          <div className="text-xs text-gray-500">Supplies, problems, behaviour</div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 p-5 mb-8">
        {type === 'report' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            For anything serious or urgent, such as bullying or someone being hurt, please speak to a teacher straight
            away. This form is for everyday common room matters.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">What is it about?</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
              {categories.map(c => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {type === 'report' ? 'What happened, or what is needed?' : 'Your idea'}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={MAX_FEEDBACK_MESSAGE}
              className={inputClass}
              placeholder={type === 'report' ? 'For example: we are out of milk in the fridge' : 'For example: a job for wiping down the microwave'}
              required
            />
            <div className="text-xs text-gray-400 text-right mt-1">
              {message.length} / {MAX_FEEDBACK_MESSAGE}
            </div>
          </div>

          {type === 'report' && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hideName}
                onChange={e => setHideName(e.target.checked)}
                className="mt-1"
              />
              <span>
                Hide my name from the committee
                <span className="block text-xs text-gray-500 mt-0.5">
                  Committee members will not see who sent it. Admins can still see it if they need to deal with misuse.
                </span>
              </span>
            </label>
          )}

          {banner && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                banner.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
              }`}
            >
              {banner.text}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="self-start bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : type === 'report' ? 'Send report' : 'Send suggestion'}
          </button>
        </form>
      </div>

      {/* Their own history */}
      <div className="text-sm font-semibold text-gray-500 mb-3">Your recent submissions</div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing sent yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const meta = getCategory(item.category)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-blue-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {meta?.emoji} {meta?.label ?? item.category}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[item.status]}`}
                  >
                    {STUDENT_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2 whitespace-pre-line">{item.message}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                {item.response && (
                  <div className="mt-3 text-sm text-gray-900 bg-blue-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-blue-700">Committee reply: </span>
                    {item.response}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}