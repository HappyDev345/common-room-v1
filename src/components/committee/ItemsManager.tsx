'use client'

import { useEffect, useState } from 'react'

type Item = {
  id: string
  name: string
  description: string | null
  [key: string]: string | number | boolean | null
}

export type ItemsConfig = {
  heading: string
  intro: string
  noun: string
  endpoint: string
  listKey: 'jobs' | 'rewards'
  valueKey: 'points' | 'cost'
  valueLabel: string
  activeKey: 'active' | 'available'
  flag?: { key: string; label: string }
}

export const JOBS_CONFIG: ItemsConfig = {
  heading: 'Jobs',
  intro: 'Jobs students can complete to earn points.',
  noun: 'job',
  endpoint: '/api/committee/jobs',
  listKey: 'jobs',
  valueKey: 'points',
  valueLabel: 'Points',
  activeKey: 'active',
  flag: { key: 'student_submittable', label: 'Students can submit' },
}

export const REWARDS_CONFIG: ItemsConfig = {
  heading: 'Rewards',
  intro: 'Rewards students can spend their points on.',
  noun: 'reward',
  endpoint: '/api/committee/rewards',
  listKey: 'rewards',
  valueKey: 'cost',
  valueLabel: 'Cost',
  activeKey: 'available',
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ItemsManager({ config }: { config: ItemsConfig }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // New item form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [flagValue, setFlagValue] = useState(true)
  const [adding, setAdding] = useState(false)

  // Editing an existing item
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', description: '', value: '' })

  async function load() {
    const res = await fetch(config.endpoint)
    const data = await res.json()
    setItems(data[config.listKey] || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [config.endpoint])

  async function send(method: 'POST' | 'PATCH', payload: Record<string, unknown>) {
    const res = await fetch(config.endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || 'Something went wrong' })
      return false
    }
    return true
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setMessage(null)

    const payload: Record<string, unknown> = {
      name,
      description,
      [config.valueKey]: parseInt(value),
    }
    if (config.flag) payload[config.flag.key] = flagValue

    const ok = await send('POST', payload)
    if (ok) {
      setMessage({ type: 'ok', text: `Added "${name}".` })
      setName('')
      setDescription('')
      setValue('')
      await load()
    }
    setAdding(false)
  }

  async function toggle(item: Item, key: string) {
    setMessage(null)
    const ok = await send('PATCH', { id: item.id, [key]: item[key] !== true })
    if (ok) await load()
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setDraft({
      name: item.name,
      description: item.description || '',
      value: String(item[config.valueKey] ?? ''),
    })
  }

  async function saveEdit(item: Item) {
    setMessage(null)
    const ok = await send('PATCH', {
      id: item.id,
      name: draft.name,
      description: draft.description,
      [config.valueKey]: parseInt(draft.value),
    })
    if (ok) {
      setEditingId(null)
      await load()
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{config.heading}</h1>
        <p className="text-sm text-gray-500 mt-1">{config.intro}</p>
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

      {/* Add form */}
      <div className="bg-white rounded-xl border border-blue-100 p-5 mb-6">
        <div className="text-sm font-semibold text-gray-500 mb-4">Add a new {config.noun}</div>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.valueLabel}</label>
              <input
                type="number"
                min={1}
                value={value}
                onChange={e => setValue(e.target.value)}
                className={inputClass}
                required
              />
            </div>
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
          {config.flag && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={flagValue}
                onChange={e => setFlagValue(e.target.checked)}
              />
              {config.flag.label}
            </label>
          )}
          <button
            type="submit"
            disabled={adding}
            className="self-start bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding…' : `Add ${config.noun}`}
          </button>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const active = item[config.activeKey] === true
            const flagOn = config.flag ? item[config.flag.key] === true : false

            if (editingId === item.id) {
              return (
                <div key={item.id} className="bg-white rounded-xl border border-blue-300 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{config.valueLabel}</label>
                      <input
                        type="number"
                        min={1}
                        value={draft.value}
                        onChange={e => setDraft({ ...draft, value: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={e => setDraft({ ...draft, description: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(item)}
                      className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 px-3 py-2 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border border-blue-100 p-5 ${active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {item.name}
                      {!active && (
                        <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    )}
                    {config.flag && (
                      <div className="text-xs text-gray-400 mt-1">
                        {config.flag.label}: {flagOn ? 'Yes' : 'No'}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold text-blue-600 whitespace-nowrap">
                    {item[config.valueKey]} pts
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggle(item, config.activeKey)}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {active ? 'Hide from students' : 'Show to students'}
                  </button>
                  {config.flag && (
                    <button
                      onClick={() => toggle(item, config.flag!.key)}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {flagOn ? 'Committee-award only' : 'Let students submit'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}