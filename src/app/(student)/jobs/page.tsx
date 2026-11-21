'use client'

import { useEffect, useState } from 'react'
import { useStudent } from '@/components/StudentShell'

type Job = {
  id: string
  name: string
  description: string | null
  points: number
  pending: boolean
}

export default function JobsPage() {
  const user = useStudent()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function loadJobs() {
    const res = await fetch('/api/jobs')
    const data = await res.json()
    setJobs(data.jobs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
  }, [user.id])

  async function submitJob(job: Job) {
    setBusyId(job.id)
    setMessage(null)

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage({ type: 'ok', text: `Submitted "${job.name}". A committee member will review it.` })
      await loadJobs()
    } else {
      setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
    }
    setBusyId(null)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Finished a job? Submit it and the committee will check it and award your points.
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
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-400">No jobs available right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-blue-100 p-5 flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">{job.name}</div>
                {job.description && (
                  <div className="text-xs text-gray-500 mt-1">{job.description}</div>
                )}
                <div className="text-xs font-semibold text-blue-600 mt-2">+{job.points} pts</div>
              </div>

              {job.pending ? (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
                  ⏳ Pending review
                </span>
              ) : (
                <button
                  onClick={() => submitJob(job)}
                  disabled={busyId === job.id}
                  className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {busyId === job.id ? 'Submitting…' : 'I did this'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}