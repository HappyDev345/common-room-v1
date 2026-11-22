import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName, cut } from '@/lib/audit'
import { getCategory, MAX_FEEDBACK_MESSAGE, MAX_FEEDBACK_PER_DAY } from '@/lib/feedback-meta'
import { NextResponse } from 'next/server'

// A student's own submissions and the committee's replies
export async function GET() {
  const auth = await requireRole(['student'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseServer
    .from('feedback')
    .select('id, created_at, type, category, message, status, response')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(request: Request) {
  const auth = await requireRole(['student'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  const category = typeof body.category === 'string' ? body.category : ''
  const meta = getCategory(category)
  if (!meta) {
    return NextResponse.json({ error: 'Please choose a category' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (message.length < 5) {
    return NextResponse.json({ error: 'Please write a little more detail' }, { status: 400 })
  }
  if (message.length > MAX_FEEDBACK_MESSAGE) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_FEEDBACK_MESSAGE} characters` },
      { status: 400 }
    )
  }

  // Only reports can hide the sender's name
  const hideName = meta.type === 'report' && body.hideName === true

  // Daily limit, to stop misuse
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabaseServer
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .gte('created_at', since)

  if ((count ?? 0) >= MAX_FEEDBACK_PER_DAY) {
    return NextResponse.json(
      { error: `You have already sent ${MAX_FEEDBACK_PER_DAY} in the last day. Please try again tomorrow.` },
      { status: 429 }
    )
  }

  const { error } = await supabaseServer.from('feedback').insert({
    user_id: auth.user.id,
    type: meta.type,
    category,
    message,
    hide_name: hideName,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    action: 'feedback.submitted',
    actor: auth.user,
    summary: `${fullName(auth.user)} sent a ${meta.type}: ${meta.label}`,
    fields: {
      Type: meta.type === 'report' ? 'Report' : 'Suggestion',
      Category: meta.label,
      // Sensitive text stays inside the site and is not copied to Discord
      Message: meta.sensitive
        ? '(Not copied here for privacy. Open the Inbox on the website to read it.)'
        : cut(message, 900),
      'Name hidden from committee': meta.type === 'report' ? hideName : null,
    },
  })

  return NextResponse.json({ success: true })
}