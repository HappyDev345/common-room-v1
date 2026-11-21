import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['student', 'committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: challenges, error } = await supabaseServer
    .from('challenges')
    .select('id, title, description, goal, progress, reward_points, status')
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ challenges })
}