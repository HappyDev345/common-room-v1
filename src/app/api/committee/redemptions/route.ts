import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data: redemptions, error } = await supabaseServer
    .from('redemptions')
    .select('*, users(first_name, last_name), rewards(name, cost)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ redemptions })
}

export async function PATCH(request: Request) {
  const { id, action, reviewedBy } = await request.json()

  const { data: redemption } = await supabaseServer
    .from('redemptions')
    .update({ status: action, reviewed_by: reviewedBy })
    .eq('id', id)
    .select('*, rewards(name, cost), user_id')
    .single()

  // If approved, deduct the points
  if (action === 'approved' && redemption) {
    await supabaseServer.from('transactions').insert({
      user_id: redemption.user_id,
      amount: -redemption.rewards.cost,
      reason: `Redeemed: ${redemption.rewards.name}`,
      awarded_by: reviewedBy,
    })
  }

  return NextResponse.json({ success: true })
}
