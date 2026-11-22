import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
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

  const { data: target } = await supabaseServer
    .from('users')
    .select('id, first_name, last_name, username, role')
    .eq('id', userId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { error } = await supabaseServer.from('transactions').insert({
    user_id: userId,
    amount,
    reason: cleanReason,
    awarded_by: auth.user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: balanceRow } = await supabaseServer
    .from('student_balances')
    .select('balance')
    .eq('id', userId)
    .maybeSingle()

  const gained = amount > 0
  const abs = Math.abs(amount)
  await logAudit({
    action: gained ? 'points.awarded' : 'points.deducted',
    actor: auth.user,
    target,
    summary: `${fullName(auth.user)} ${gained ? 'awarded' : 'deducted'} ${abs} point${abs === 1 ? '' : 's'} ${gained ? 'to' : 'from'} ${fullName(target)}`,
    fields: {
      Points: gained ? `+${amount}` : `${amount}`,
      Reason: cleanReason,
      'New balance': balanceRow ? `${balanceRow.balance} pts` : null,
    },
  })

  return NextResponse.json({ success: true })
}