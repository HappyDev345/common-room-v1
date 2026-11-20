import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { userId, amount, reason } = await request.json()
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''

  if (!userId || !Number.isInteger(amount) || amount === 0 || !cleanReason) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }
  if (cleanReason.length > 200) {
    return NextResponse.json({ error: 'Reason is too long' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('transactions').insert({
    user_id: userId,
    amount,
    reason: cleanReason,
    awarded_by: auth.user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}