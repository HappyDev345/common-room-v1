import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName, cut } from '@/lib/audit'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: announcements, error } = await supabaseServer
    .from('announcements')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcements })
}

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''

  if (!title || title.length > 100) {
    return NextResponse.json({ error: 'Title is required (max 100 characters)' }, { status: 400 })
  }
  if (!text || text.length > 1000) {
    return NextResponse.json({ error: 'Message is required (max 1000 characters)' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('announcements')
    .insert({ title, body: text, created_by: auth.user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    action: 'announcement.posted',
    actor: auth.user,
    summary: `${fullName(auth.user)} posted the announcement "${title}"`,
    fields: { Title: title, Message: cut(text, 900) },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: existing } = await supabaseServer
    .from('announcements')
    .select('title, body')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabaseServer.from('announcements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existing) {
    await logAudit({
      action: 'announcement.deleted',
      actor: auth.user,
      summary: `${fullName(auth.user)} deleted the announcement "${existing.title}"`,
      fields: { Title: existing.title, Message: cut(existing.body, 900) },
    })
  }

  return NextResponse.json({ success: true })
}