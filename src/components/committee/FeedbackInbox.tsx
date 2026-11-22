'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  MAX_FEEDBACK_REPLY,
  getCategory,
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
  reporter: { first_name: string; last_name: string; username: string } | null
  reporterHidden: boolean
}

type Draft = { status: FeedbackStatus; response: string }

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: 'bg-amber-50 text-amber-700',
  reviewing: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

const selectClass =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function FeedbackInbox({ onNewCountChange }: { onNewCountChange?: (n: number) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')
  const [typeFilter, setTypeFilter] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const refreshCount = useCallback(async () => {
    if (!onNewCountChange) return
    const res = await fetch('/api/committee/feedback?summary=1')
    if (res.ok) {
      const data = await res.json()
      onNewCountChange(data.newCount ?? 0)
    }
  }, [onNewCountChange])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    const res = await fetch(`/api/committee/feedback?${params.toString()}`)
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  function getDraft(item: Item): Draft {
    return drafts[item.id] ?? { status: item.status, response: item.response ?? '' }
  }

  function setDraft(item: Item, patch: Partial<Draft>) {
    setDrafts({ ...drafts, [item.id]: { ...getDraft(item), ...patch } })
  }

  async function save(item: Item) {
    const draft = getDraft(item)
    setSavingId(item.id)
    setMessage(null)

    const res = await fetch('/api/committee/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: draft.status, response: draft.response }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage({ type: 'ok', text: 'Saved. The student can see the status and your reply.' })
      setDrafts(prev => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      await load()
      await refreshCount()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong' })
    }
    setSavingId(null)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suggestions and reports from students. The status and any reply you write are shown to the student.
        </p>
      </div>

      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
        Reports can be wrong or one-sided. Please handle behaviour reports carefully, keep them within the committee,
        and pass anything serious to a teacher.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="open">Open (new and in progress)</option>
          <option value="">All</option>
          {FEEDBACK_STATUSES.map(s => (
            <option key={s} value={s}>
              {FEEDBACK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="">Suggestions and reports</option>
          <option value="suggestion">Suggestions only</option>
          <option value="report">Reports only</option>
        </select>
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
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const meta = getCategory(item.category)
            const draft = getDraft(item)
            const changed = draft.status !== item.status || draft.response !== (item.response ?? '')

            return (
              <div key={item.id} className="bg-white rounded-xl border border-blue-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {meta?.emoji} {meta?.label ?? item.category}
                    {meta?.sensitive && (
                      <span className="ml-2 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        Sensitive
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[item.status]}`}
                  >
                    {FEEDBACK_STATUS_LABELS[item.status]}
                  </span>
                </div>

                <div className="text-sm text-gray-700 mt-3 whitespace-pre-line">{item.message}</div>

                <div className="text-xs text-gray-400 mt-3">
                  {item.reporter
                    ? `From ${item.reporter.first_name} ${item.reporter.last_name} (@${item.reporter.username})`
                    : item.reporterHidden
                    ? 'From: name hidden by the sender'
                    : 'From: former student'}
                  {item.reporter && item.reporterHidden ? ' · sender chose to hide their name from the committee' : ''}
                  {' · '}
                  {new Date(item.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <select
                    value={draft.status}
                    onChange={e => setDraft(item, { status: e.target.value as FeedbackStatus })}
                    className={selectClass}
                  >
                    {FEEDBACK_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {FEEDBACK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={draft.response}
                    onChange={e => setDraft(item, { response: e.target.value })}
                    maxLength={MAX_FEEDBACK_REPLY}
                    placeholder="Reply to the student (optional)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => save(item)}
                    disabled={!changed || savingId === item.id}
                    className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    {savingId === item.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}