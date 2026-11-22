import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const auth = await requireRole(['student', 'committee', 'admin'])
  if (!auth.ok) return auth.response

  const { currentPassword, newPassword } = await request.json()

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }
  if (newPassword.length > 72) {
    return NextResponse.json({ error: 'New password is too long' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'New password must be different' }, { status: 400 })
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('password_hash')
    .eq('id', auth.user.id)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(newPassword, 10)
  const { error } = await supabaseServer
    .from('users')
    .update({ password_hash })
    .eq('id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    action: 'password.changed',
    actor: auth.user,
    summary: `${fullName(auth.user)} changed their own password`,
    fields: { 'Account type': auth.user.role },
  })

  return NextResponse.json({ success: true })
}