import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['student', 'committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: setting } = await supabaseServer
    .from('settings')
    .select('value')
    .eq('key', 'leaderboard_enabled')
    .maybeSingle()

  if (setting?.value !== 'true') {
    return NextResponse.json({ enabled: false })
  }

  const { data, error } = await supabaseServer
    .from('student_balances')
    .select('id, first_name, last_name, earned')
    .order('earned', { ascending: false })
    .order('last_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tied students share a rank
  let lastEarned: number | null = null
  let lastRank = 0
  const ranked = (data || []).map((r, i) => {
    const rank = r.earned === lastEarned ? lastRank : i + 1
    lastEarned = r.earned
    lastRank = rank
    return { ...r, rank }
  })

  const top = ranked.slice(0, 10).map(r => ({
    rank: r.rank,
    name: `${r.first_name} ${r.last_name.charAt(0)}.`,
    earned: r.earned,
    isYou: r.id === auth.user.id,
  }))

  const me = ranked.find(r => r.id === auth.user.id)

  return NextResponse.json({
    enabled: true,
    top,
    you: me ? { rank: me.rank, earned: me.earned } : null,
    total: ranked.length,
  })
}