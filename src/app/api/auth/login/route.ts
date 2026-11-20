import { supabaseServer } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  console.log('Attempting login for:', username)

  const { data: user, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  console.log('User found:', user)
  console.log('DB error:', error)

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  console.log('Password valid:', valid)

  if (!valid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const { password_hash, ...safeUser } = user
  return NextResponse.json({ user: safeUser })
}