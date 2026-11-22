import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const auth = await requireRole(['student'])
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  const { rewardId } = await request.json()
  if (!rewardId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: reward } = await supabaseServer
    .from('rewards')
    .select('id, name, cost, available')
    .eq('id', rewardId)
    .single()

  if (!reward || !reward.available) {
    return NextResponse.json({ error: 'This reward is not available' }, { status: 400 })
  }

  // Available points = total balance minus points held by pending requests
  const { data: transactions } = await supabaseServer
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)

  const { data: pending } = await supabaseServer
    .from('redemptions')
    .select('rewards(cost)')
    .eq('user_id', userId)
    .eq('status', 'pending')

  const balance = (transactions || []).reduce((sum, t) => sum + t.amount, 0)
  const held = ((pending || []) as unknown as { rewards: { cost: number } }[]).reduce(
    (sum, p) => sum + p.rewards.cost,
    0
  )

  if (balance - held < reward.cost) {
    return NextResponse.json({ error: 'Not enough available points' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('redemptions')
    .insert({ user_id: userId, reward_id: rewardId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    action: 'reward.requested',
    actor: auth.user,
    summary: `${fullName(auth.user)} requested "${reward.name}"`,
    fields: {
      Reward: reward.name,
      Cost: `${reward.cost} pts`,
      'Balance before': `${balance} pts`,
      'Available after hold': `${balance - held - reward.cost} pts`,
    },
  })

  return NextResponse.json({ success: true })
}