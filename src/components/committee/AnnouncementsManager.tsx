'use client'

import { useEffect, useState } from 'react'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function AnnouncementsManager() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function load() {
    const res = await fetch('/api/committee/announcements')
    const data = await res.json()
    setItems(data.announcements || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setPosting(true)
    setMessage(null)

    const res = await fetch('/api/committee/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage({ type: 'ok', text: 'Announcement posted. Students will see it on their dashboard.' })
      setTitle('')
      setBody('')
      await load()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong' })
    }
    setPosting(false)
  }

  async function handleDelete(item: Announcement) {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    const res = await fetch(`/api/committee/announcements?id=${item.id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Post updates about rules, rewards and challenges. The latest five show on every student dashboard.
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
        <div className="text-sm font-semibold text-gray-500 mb-4">New announcement</div>
        <form onSubmit={handlePost} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputClass}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className={inputClass}
              maxLength={1000}
              required
            />
          </div>
          <button
            type="submit"
            disabled={posting}
            className="self-start bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {posting ? 'Posting…' : 'Post announcement'}
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-blue-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.body}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}