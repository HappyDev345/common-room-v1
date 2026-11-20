import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data: submissions, error } = await supabaseServer
    .from('job_submissions')
    .select('*, users(first_name, last_name), jobs(name, points)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions })
}

export async function PATCH(request: Request) {
  const { id, action, reviewedBy } = await request.json()

  // Update submission status
  const { data: submission } = await supabaseServer
    .from('job_submissions')
    .update({ status: action, reviewed_by: reviewedBy })
    .eq('id', id)
    .select('*, jobs(points), user_id')
    .single()

  // If approved, award the points
  if (action === 'approved' && submission) {
    await supabaseServer.from('transactions').insert({
      user_id: submission.user_id,
      amount: submission.jobs.points,
      reason: `Job approved: ${submission.jobs?.name || 'completed job'}`,
      awarded_by: reviewedBy,
    })
  }

  return NextResponse.json({ success: true })
}
