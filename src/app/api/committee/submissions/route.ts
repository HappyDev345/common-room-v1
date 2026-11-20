import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: submissions, error } = await supabaseServer
    .from('job_submissions')
    .select('*, users!user_id(first_name, last_name), jobs(name, points)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { id, action } = await request.json()
  if (!['approved', 'declined'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Only update if still pending, so a double-click can't award points twice
  const { data, error } = await supabaseServer
    .from('job_submissions')
    .update({ status: action, reviewed_by: auth.user.id })
    .eq('id', id)
    .eq('status', 'pending')
    .select('user_id, jobs(name, points)')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  if (action === 'approved') {
    const job = data.jobs as unknown as { name: string; points: number }
    await supabaseServer.from('transactions').insert({
      user_id: data.user_id,
      amount: job.points,
      reason: `Job approved: ${job.name}`,
      awarded_by: auth.user.id,
    })
  }

  return NextResponse.json({ success: true })
}