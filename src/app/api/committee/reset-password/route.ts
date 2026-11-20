import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'

// No look-alike characters (no 0/o, 1/l/i) so passwords are easy to read out
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function makePassword(length = 8) {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]
  }
  return out
}

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: 'Use My Account to change your own password' },
      { status: 400 }
    )
  }

  const { data: target } = await supabaseServer
    .from('users')
    .select('id, username, role')
    .eq('id', userId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Committee members can only reset students. Admins can reset anyone.
  if (target.role !== 'student' && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const password = makePassword()
  const password_hash = await bcrypt.hash(password, 10)

  const { error } = await supabaseServer
    .from('users')
    .update({ password_hash })
    .eq('id', target.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ username: target.username, password })
}