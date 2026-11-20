import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId, jobId } = await request.json()

  if (!userId || !jobId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single()

  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { data: job } = await supabaseServer
    .from('jobs')
    .select('id, active, student_submittable')
    .eq('id', jobId)
    .single()

  if (!job || !job.active || !job.student_submittable) {
    return NextResponse.json({ error: 'This job is not available' }, { status: 400 })
  }

  // One pending submission per job at a time
  const { data: existing } = await supabaseServer
    .from('job_submissions')
    .select('id')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'You already have this job waiting for review' },
      { status: 409 }
    )
  }

  const { error } = await supabaseServer
    .from('job_submissions')
    .insert({ user_id: userId, job_id: jobId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}