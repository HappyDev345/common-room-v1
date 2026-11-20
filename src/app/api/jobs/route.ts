import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['student'])
  if (!auth.ok) return auth.response

  const { data: jobs, error } = await supabaseServer
    .from('jobs')
    .select('id, name, description, points')
    .eq('active', true)
    .eq('student_submittable', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark the jobs this student already has waiting for review
  const { data: pending } = await supabaseServer
    .from('job_submissions')
    .select('job_id')
    .eq('user_id', auth.user.id)
    .eq('status', 'pending')
  const pendingIds = new Set((pending || []).map(p => p.job_id))

  return NextResponse.json({
    jobs: (jobs || []).map(j => ({ ...j, pending: pendingIds.has(j.id) })),
  })
}