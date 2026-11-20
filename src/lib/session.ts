import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const COOKIE_NAME = 'cr_session'
const SESSION_DAYS = 7

export type SessionUser = {
  id: string
  first_name: string
  last_name: string
  username: string
  role: string
}

function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

// Called after a successful login: stores a signed token in a cookie
export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript in the browser can't read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

// Works out who is logged in. The role is read fresh from the database
// every time, so changes (or a deleted account) take effect straight away.
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (!payload.sub) return null

    const { data } = await supabaseServer
      .from('users')
      .select('id, first_name, last_name, username, role')
      .eq('id', payload.sub)
      .single()

    return data ?? null
  } catch {
    return null
  }
}

type Guard =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }

// Use at the top of any API route:
//   const auth = await requireRole(['committee', 'admin'])
//   if (!auth.ok) return auth.response
export async function requireRole(allowed: string[]): Promise<Guard> {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  }
  if (!allowed.includes(user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  }
  return { ok: true, user }
}