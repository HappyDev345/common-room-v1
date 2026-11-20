import { supabaseServer } from '@/lib/supabase-server'
import { createSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  await createSession(user.id)

  const { password_hash, ...safeUser } = user
  return NextResponse.json({ user: safeUser })
}