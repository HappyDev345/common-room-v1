import { supabaseServer } from '@/lib/supabase-server'
import { createSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

const WINDOW_MINUTES = 15
const MAX_FAILS_PER_USERNAME = 8 // wrong guesses on one account
const MAX_FAILS_PER_IP = 100 // generous, because a whole school can share one IP address

function getIp(request: Request) {
  // Behind a Cloudflare Tunnel the real visitor address is in cf-connecting-ip
  const cloudflareIp = request.headers.get('cf-connecting-ip')
  if (cloudflareIp) return cloudflareIp.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function tooManyAttempts() {
  return NextResponse.json(
    { error: `Too many failed attempts. Please wait ${WINDOW_MINUTES} minutes and try again.` },
    { status: 429, headers: { 'Retry-After': String(WINDOW_MINUTES * 60) } }
  )
}

async function recordFailure(username: string, ip: string) {
  await supabaseServer.from('login_attempts').insert({ username, ip })

  // Tidy up old rows now and then so the table stays small
  if (Math.random() < 0.05) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabaseServer.from('login_attempts').delete().lt('created_at', dayAgo)
  }
}

export async function POST(request: Request) {
  const ip = getIp(request)
  const body = await request.json()
  const username =
    typeof body.username === 'string' ? body.username.trim().toLowerCase().slice(0, 64) : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  // Check recent failures BEFORE doing any password work
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const [byUsername, byIp] = await Promise.all([
    supabaseServer
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
      .gte('created_at', since),
    supabaseServer
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since),
  ])

  if ((byUsername.count ?? 0) >= MAX_FAILS_PER_USERNAME || (byIp.count ?? 0) >= MAX_FAILS_PER_IP) {
    return tooManyAttempts()
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  const valid = user ? await bcrypt.compare(password, user.password_hash) : false

  if (!user || !valid) {
    await recordFailure(username, ip)

    // Log once, at the moment a lock starts (not on every blocked attempt)
    const usernameFails = (byUsername.count ?? 0) + 1
    const ipFails = (byIp.count ?? 0) + 1
    if (usernameFails === MAX_FAILS_PER_USERNAME) {
      await logAudit({
        action: 'auth.lockout',
        target: user ?? null,
        summary: `Sign-in for "${username}" was locked for ${WINDOW_MINUTES} minutes after ${usernameFails} failed attempts`,
        fields: {
          Username: username,
          'Failed attempts': usernameFails,
          'Locked for': `${WINDOW_MINUTES} minutes`,
          'Account exists': user ? 'Yes' : 'No',
          'IP address': ip,
        },
        ip,
      })
    } else if (ipFails === MAX_FAILS_PER_IP) {
      await logAudit({
        action: 'auth.lockout',
        summary: `An IP address was locked for ${WINDOW_MINUTES} minutes after ${ipFails} failed sign-ins`,
        fields: {
          Scope: 'IP address',
          'Failed attempts': ipFails,
          'Locked for': `${WINDOW_MINUTES} minutes`,
          'IP address': ip,
        },
        ip,
      })
    }
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  // Success: forget this account's earlier failures
  await supabaseServer.from('login_attempts').delete().eq('username', username)

  await createSession(user.id)

  await logAudit({
    action: 'auth.login',
    actor: user,
    summary: `${user.first_name} ${user.last_name} (@${user.username}) signed in`,
    fields: { 'IP address': ip },
    ip,
  })

  const { password_hash, ...safeUser } = user
  return NextResponse.json({ user: safeUser })
}