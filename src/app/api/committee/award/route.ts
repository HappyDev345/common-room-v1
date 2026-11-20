import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId, amount, reason, awardedBy } = await request.json()

  if (!userId || !amount || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('transactions').insert({
    user_id: userId,
    amount,
    reason,
    awarded_by: awardedBy,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
