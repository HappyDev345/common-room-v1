import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data } = await supabaseServer
    .from('settings')
    .select('value')
    .eq('key', 'leaderboard_enabled')
    .maybeSingle()

  return NextResponse.json({ leaderboardEnabled: data?.value === 'true' })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { leaderboardEnabled } = await request.json()
  if (typeof leaderboardEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('settings')
    .upsert({ key: 'leaderboard_enabled', value: leaderboardEnabled ? 'true' : 'false' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}