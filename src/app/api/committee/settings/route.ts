import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
import { NextResponse } from 'next/server'

async function currentValue() {
  const { data } = await supabaseServer
    .from('settings')
    .select('value')
    .eq('key', 'leaderboard_enabled')
    .maybeSingle()
  return data?.value === 'true'
}

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  return NextResponse.json({ leaderboardEnabled: await currentValue() })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { leaderboardEnabled } = await request.json()
  if (typeof leaderboardEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  }

  const before = await currentValue()

  const { error } = await supabaseServer
    .from('settings')
    .upsert({ key: 'leaderboard_enabled', value: leaderboardEnabled ? 'true' : 'false' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (before !== leaderboardEnabled) {
    await logAudit({
      action: 'settings.changed',
      actor: auth.user,
      summary: `${fullName(auth.user)} turned the leaderboard ${leaderboardEnabled ? 'on' : 'off'}`,
      fields: {
        Setting: 'Leaderboard',
        Before: before ? 'On' : 'Off',
        After: leaderboardEnabled ? 'On' : 'Off',
      },
    })
  }

  return NextResponse.json({ success: true })
}