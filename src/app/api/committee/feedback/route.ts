import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName, cut } from '@/lib/audit'
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  MAX_FEEDBACK_REPLY,
  getCategory,
  type FeedbackStatus,
} from '@/lib/feedback-meta'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams

  // Just the number of new items, for the badge in the menu
  if (params.get('summary')) {
    const { count } = await supabaseServer
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
    return NextResponse.json({ newCount: count ?? 0 })
  }

  const type = params.get('type')
  const status = params.get('status')

  let query = supabaseServer
    .from('feedback')
    .select(
      'id, created_at, type, category, message, hide_name, status, response, responded_at, users!user_id(first_name, last_name, username)'
    )

  if (type === 'suggestion' || type === 'report') query = query.eq('type', type)
  if (status === 'open') {
    query = query.in('status', ['new', 'reviewing'])
  } else if (status && (FEEDBACK_STATUSES as string[]).includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const isAdmin = auth.user.role === 'admin'

  const items = (data || []).map(row => {
    const reporter = row.users as unknown as {
      first_name: string
      last_name: string
      username: string
    } | null

    // If the sender chose to hide their name, only admins can see it
    const canSee = reporter && (!row.hide_name || isAdmin)

    return {
      id: row.id,
      created_at: row.created_at,
      type: row.type,
      category: row.category,
      message: row.message,
      status: row.status,
      response: row.response,
      responded_at: row.responded_at,
      reporter: canSee ? reporter : null,
      reporterHidden: row.hide_name === true,
    }
  })

  return NextResponse.json({ items })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: { status?: FeedbackStatus; response?: string | null } = {}

  if ('status' in body) {
    if (!(FEEDBACK_STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  if ('response' in body) {
    const reply = typeof body.response === 'string' ? body.response.trim() : ''
    if (reply.length > MAX_FEEDBACK_REPLY) {
      return NextResponse.json({ error: `Reply must be under ${MAX_FEEDBACK_REPLY} characters` }, { status: 400 })
    }
    update.response = reply || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: before } = await supabaseServer
    .from('feedback')
    .select('category, status, response')
    .eq('id', body.id)
    .single()

  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabaseServer
    .from('feedback')
    .update({
      ...update,
      responded_by: auth.user.id,
      responded_at: new Date().toISOString(),
    })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const meta = getCategory(before.category)
  const statusChanged = update.status !== undefined && update.status !== before.status
  const replyChanged = update.response !== undefined && update.response !== (before.response ?? null)

  if (statusChanged || replyChanged) {
    await logAudit({
      action: 'feedback.updated',
      actor: auth.user,
      summary: `${fullName(auth.user)} updated a ${meta?.label.toLowerCase() ?? 'submission'}`,
      fields: {
        Category: meta?.label,
        Status: statusChanged
          ? `${FEEDBACK_STATUS_LABELS[before.status as FeedbackStatus]} → ${FEEDBACK_STATUS_LABELS[update.status as FeedbackStatus]}`
          : null,
        // Replies to sensitive reports are not copied to Discord
        Reply: replyChanged && update.response && !meta?.sensitive ? cut(update.response, 900) : null,
      },
    })
  }

  return NextResponse.json({ success: true })
}