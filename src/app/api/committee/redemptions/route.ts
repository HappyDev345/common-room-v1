import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: redemptions, error } = await supabaseServer
    .from('redemptions')
    .select('*, users!user_id(first_name, last_name), rewards(name, cost)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ redemptions })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { id, action } = await request.json()
  if (!['approved', 'declined'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Only update if still pending, so a double-click can't deduct points twice
  const { data, error } = await supabaseServer
    .from('redemptions')
    .update({ status: action, reviewed_by: auth.user.id })
    .eq('id', id)
    .eq('status', 'pending')
    .select('user_id, rewards(name, cost)')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  if (action === 'approved') {
    const reward = data.rewards as unknown as { name: string; cost: number }
    await supabaseServer.from('transactions').insert({
      user_id: data.user_id,
      amount: -reward.cost,
      reason: `Redeemed: ${reward.name}`,
      awarded_by: auth.user.id,
    })
  }

  return NextResponse.json({ success: true })
}