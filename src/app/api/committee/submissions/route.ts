import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
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

  const { id, action, reason } = await request.json()
  if (!['approved', 'declined'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // A reason is required when declining, and the student will see it
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''
  if (action === 'declined' && (cleanReason.length < 3 || cleanReason.length > 200)) {
    return NextResponse.json({ error: 'Please give a reason (3 to 200 characters)' }, { status: 400 })
  }

  // Only update if still pending, so a double-click can't award points twice
  const { data, error } = await supabaseServer
    .from('job_submissions')
    .update({
      status: action,
      reviewed_by: auth.user.id,
      decline_reason: action === 'declined' ? cleanReason : null,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('user_id, jobs(name, points)')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  const job = data.jobs as unknown as { name: string; points: number }
  const approved = action === 'approved'

  if (approved) {
    await supabaseServer.from('transactions').insert({
      user_id: data.user_id,
      amount: job.points,
      reason: `Job approved: ${job.name}`,
      awarded_by: auth.user.id,
    })
  }

  const { data: student } = await supabaseServer
    .from('users')
    .select('id, first_name, last_name, username, role')
    .eq('id', data.user_id)
    .single()

  await logAudit({
    action: approved ? 'job.approved' : 'job.declined',
    actor: auth.user,
    target: student,
    summary: `${fullName(auth.user)} ${approved ? 'approved' : 'declined'} ${student ? fullName(student) + "'s" : 'a'} submission for "${job.name}"`,
    fields: {
      Job: job.name,
      Points: approved ? `+${job.points}` : 'None awarded',
      Reason: approved ? null : cleanReason,
    },
  })

  return NextResponse.json({ success: true })
}