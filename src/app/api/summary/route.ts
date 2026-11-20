import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

type SubmissionRow = {
  id: string
  status: string
  created_at: string
  jobs: { name: string }
}

type RedemptionRow = {
  id: string
  status: string
  created_at: string
  rewards: { name: string; cost: number }
}

export async function GET() {
  const auth = await requireRole(['student'])
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const [tx, subs, reds] = await Promise.all([
    supabaseServer
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseServer
      .from('job_submissions')
      .select('id, status, created_at, jobs(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseServer
      .from('redemptions')
      .select('id, status, created_at, rewards(name, cost)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (tx.error || subs.error || reds.error) {
    return NextResponse.json({ error: 'Could not load data' }, { status: 500 })
  }

  const transactions = tx.data || []
  const submissions = (subs.data || []) as unknown as SubmissionRow[]
  const redemptions = (reds.data || []) as unknown as RedemptionRow[]

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0)
  // Points tied up in reward requests that haven't been reviewed yet
  const held = redemptions
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.rewards.cost, 0)

  return NextResponse.json({
    balance,
    held,
    available: balance - held,
    transactions,
    submissions: submissions.slice(0, 10),
    redemptions: redemptions.slice(0, 10),
  })
}