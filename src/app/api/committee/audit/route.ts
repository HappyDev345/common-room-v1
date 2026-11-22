import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { getActionsInCategory } from '@/lib/audit-meta'
import { sendDiscordEmbed } from '@/lib/discord'
import { NextResponse } from 'next/server'

const PAGE_SIZE = 40

// The audit log is for admins only
export async function GET(request: Request) {
  const auth = await requireRole(['admin'])
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const category = params.get('category')
  const before = params.get('before')

  let query = supabaseServer
    .from('audit_log')
    .select('id, created_at, action, actor_name, actor_role, target_name, summary, details, ip')

  if (category) {
    const actions = getActionsInCategory(category)
    if (actions.length === 0) {
      return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
    }
    query = query.in('action', actions)
  }

  if (before) {
    if (Number.isNaN(Date.parse(before))) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  return NextResponse.json({
    entries: rows.slice(0, PAGE_SIZE),
    hasMore: rows.length > PAGE_SIZE,
    discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
  })
}

// Sends a test message so admins can check the Discord connection
export async function POST() {
  const auth = await requireRole(['admin'])
  if (!auth.ok) return auth.response

  if (!process.env.DISCORD_WEBHOOK_URL) {
    return NextResponse.json({ error: 'DISCORD_WEBHOOK_URL is not set' }, { status: 400 })
  }

  const ok = await sendDiscordEmbed({
    title: '🧪  Test message',
    description: 'If you can see this, the Common Room audit feed is connected to this channel.',
    color: 0x0e6fbf,
    fields: [
      { name: 'Sent by', value: `${auth.user.first_name} ${auth.user.last_name}\n@${auth.user.username}`, inline: true },
      { name: 'What happens next', value: 'Points, rewards, jobs, challenges, announcements and account changes will appear here.', inline: false },
    ],
    footer: { text: 'Common Room · Audit log' },
    timestamp: new Date().toISOString(),
  })

  if (!ok) {
    return NextResponse.json(
      { error: 'Discord did not accept the message. Check the webhook URL is correct and still exists.' },
      { status: 502 }
    )
  }
  return NextResponse.json({ success: true })
}