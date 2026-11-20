import { supabaseServer } from '@/lib/supabase-server'
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

function baseUsername(first: string, last: string) {
  return (first + last).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export async function POST(request: Request) {
  const { requesterId, students } = await request.json()

  if (!requesterId || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Keep each request small so password hashing finishes quickly
  if (students.length > 25) {
    return NextResponse.json({ error: 'Maximum 25 students per request' }, { status: 400 })
  }

  // Only committee members and admins can create accounts
  const { data: requester } = await supabaseServer
    .from('users')
    .select('role')
    .eq('id', requesterId)
    .single()

  if (!requester || !['committee', 'admin'].includes(requester.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  // Load existing usernames so we never create a duplicate
  const { data: existing, error: existingError } = await supabaseServer
    .from('users')
    .select('username')

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const taken = new Set((existing || []).map(u => u.username))

  const created: { firstName: string; lastName: string; username: string; password: string }[] = []
  const rows: {
    first_name: string
    last_name: string
    username: string
    password_hash: string
    role: string
  }[] = []

  for (const s of students) {
    const firstName = String(s.firstName || '').trim()
    const lastName = String(s.lastName || '').trim()
    if (!firstName || !lastName) continue

    // jamieliu, then jamieliu2, jamieliu3 ... if the name is already taken
    const base = baseUsername(firstName, lastName) || 'student'
    let username = base
    let n = 2
    while (taken.has(username)) {
      username = `${base}${n}`
      n++
    }
    taken.add(username)

    const password = makePassword()
    const password_hash = await bcrypt.hash(password, 10)

    rows.push({
      first_name: firstName,
      last_name: lastName,
      username,
      password_hash,
      role: 'student', // accounts created here are always students
    })
    created.push({ firstName, lastName, username, password })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid students to create' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('users').insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created })
}