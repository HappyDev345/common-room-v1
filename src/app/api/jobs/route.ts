import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId')

  const { data: jobs, error } = await supabaseServer
    .from('jobs')
    .select('id, name, description, points')
    .eq('active', true)
    .eq('student_submittable', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark the jobs this student already has waiting for review
  let pendingIds = new Set<string>()
  if (userId) {
    const { data: pending } = await supabaseServer
      .from('job_submissions')
      .select('job_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
    pendingIds = new Set((pending || []).map(p => p.job_id))
  }

  return NextResponse.json({
    jobs: (jobs || []).map(j => ({ ...j, pending: pendingIds.has(j.id) })),
  })
}