'use client'

import { useCallback, useEffect, useState } from 'react'
import { AUDIT_CATEGORIES, getActionMeta } from '@/lib/audit-meta'

type Entry = {
  id: string
  created_at: string
  action: string
  actor_name: string | null
  actor_role: string | null
  target_name: string | null
  summary: string
  details: Record<string, string | number | boolean>
  ip: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function showValue(v: string | number | boolean) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return String(v)
}

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [discordConfigured, setDiscordConfigured] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async (cat: string, before?: string) => {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    if (before) params.set('before', before)

    const res = await fetch(`/api/committee/audit?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not load the audit log')
      return
    }
    setError('')
    setDiscordConfigured(Boolean(data.discordConfigured))
    setHasMore(Boolean(data.hasMore))
    setEntries(prev => (before ? [...prev, ...data.entries] : data.entries))
  }, [])

  useEffect(() => {
    setLoading(true)
    load(category).finally(() => setLoading(false))
  }, [category, load])

  async function loadMore() {
    if (entries.length === 0) return
    setLoadingMore(true)
    await load(category, entries[entries.length - 1].created_at)
    setLoadingMore(false)
  }

  async function sendTest() {
    setTesting(true)
    setTestMessage(null)
    const res = await fetch('/api/committee/audit', { method: 'POST' })
    const data = await res.json()
    setTestMessage(
      res.ok
        ? { type: 'ok', text: 'Test message sent. Check your Discord channel.' }
        : { type: 'error', text: data.error || 'Something went wrong' }
    )
    setTesting(false)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          A permanent record of what happened, who did it and when. Only admins can see this page.
        </p>
      </div>

      {/* Discord status */}
      <div className="bg-white rounded-xl border border-blue-100 p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Discord feed</div>
            <div className="text-xs text-gray-500 mt-1">
              {discordConfigured
                ? 'Connected. New events are posted to your private admin channel.'
                : 'Not connected. Add DISCORD_WEBHOOK_URL to turn on the feed. Events are still saved here.'}
            </div>
          </div>
          <button
            onClick={sendTest}
            disabled={!discordConfigured || testing}
            className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
          >
            {testing ? 'Sending…' : 'Send test message'}
          </button>
        </div>
        {testMessage && (
          <p
            className={`text-sm px-3 py-2 rounded-lg mt-4 ${
              testMessage.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
            }`}
          >
            {testMessage.text}
          </p>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All events</option>
          {AUDIT_CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400">No events recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(entry => {
            const meta = getActionMeta(entry.action)
            const detailEntries = Object.entries(entry.details || {})
            return (
              <div key={entry.id} className="bg-white rounded-xl border border-blue-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {meta.emoji} {meta.label}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">{formatTime(entry.created_at)}</div>
                </div>

                <div className="text-sm text-gray-900 mt-2">{entry.summary}</div>

                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-blue-600">
                    Details
                  </summary>
                  <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                    {entry.actor_name && (
                      <div>
                        <dt className="text-gray-400">Performed by</dt>
                        <dd className="text-gray-900 whitespace-pre-line">
                          {entry.actor_name}
                          {entry.actor_role ? ` · ${entry.actor_role}` : ''}
                        </dd>
                      </div>
                    )}
                    {entry.target_name && (
                      <div>
                        <dt className="text-gray-400">Affected account</dt>
                        <dd className="text-gray-900">{entry.target_name}</dd>
                      </div>
                    )}
                    {detailEntries.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-gray-400">{key}</dt>
                        <dd className="text-gray-900 whitespace-pre-line break-words">{showValue(value)}</dd>
                      </div>
                    ))}
                    {entry.ip && (
                      <div>
                        <dt className="text-gray-400">IP address</dt>
                        <dd className="text-gray-900">{entry.ip}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-gray-400">Reference</dt>
                      <dd className="text-gray-900 font-mono">#{entry.id.slice(0, 8)}</dd>
                    </div>
                  </dl>
                </details>
              </div>
            )
          })}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="self-center text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 py-2"
            >
              {loadingMore ? 'Loading…' : 'Load older events'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}