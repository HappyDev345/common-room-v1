import { after } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendDiscordEmbed, type DiscordEmbed, type DiscordField } from '@/lib/discord'
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-meta'

export type Person = {
  id: string
  first_name: string
  last_name: string
  username: string
  role?: string
}

type FieldValue = string | number | boolean | null | undefined
export type AuditFields = Record<string, FieldValue>

export function fullName(p: { first_name: string; last_name: string }) {
  return `${p.first_name} ${p.last_name}`
}

function personLabel(p: Person) {
  return `${fullName(p)} (@${p.username})`
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  committee: 'Committee member',
  student: 'Student',
}

export function cut(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max - 1) + '…'
}

function display(v: FieldValue): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === null || v === undefined || v === '') return '(empty)'
  return String(v)
}

// Turns before/after values into readable lines like "Points: 10 → 12"
export function describeChanges(
  before: Record<string, unknown>,
  changes: Record<string, unknown>,
  labels: Record<string, string>
): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(changes)) {
    const oldValue = before[key] ?? null
    const newValue = value ?? null
    if (oldValue === newValue) continue
    lines.push(`${labels[key] ?? key}: ${display(oldValue as FieldValue)} → ${display(newValue as FieldValue)}`)
  }
  return lines
}

function buildEmbed(args: {
  id?: string
  action: AuditAction
  actor?: Person | null
  target?: Person | null
  summary: string
  fields: Record<string, string | number | boolean>
}): DiscordEmbed {
  const meta = AUDIT_ACTIONS[args.action]
  const fields: DiscordField[] = []

  if (args.actor) {
    const role = ROLE_LABELS[args.actor.role ?? ''] ?? ''
    fields.push({
      name: 'Performed by',
      value: cut(`${fullName(args.actor)}\n@${args.actor.username}${role ? ` · ${role}` : ''}`, 1000),
      inline: true,
    })
  }
  if (args.target) {
    fields.push({
      name: 'Affected account',
      value: cut(`${fullName(args.target)}\n@${args.target.username}`, 1000),
      inline: true,
    })
  }

  for (const [name, raw] of Object.entries(args.fields)) {
    const value = cut(display(raw), 1000)
    fields.push({
      name: cut(name, 250),
      value,
      inline: value.length <= 30 && !value.includes('\n'),
    })
  }

  return {
    title: cut(`${meta.emoji}  ${meta.label}`, 250),
    description: cut(args.summary, 3500),
    color: meta.color,
    fields: fields.slice(0, 25),
    footer: { text: `Common Room · Audit log${args.id ? ` · #${args.id.slice(0, 8)}` : ''}` },
    timestamp: new Date().toISOString(),
  }
}

// Records an event in the database and (for most events) posts it to Discord.
// It never throws, so a logging problem can never break the action itself.
export async function logAudit(entry: {
  action: AuditAction
  actor?: Person | null
  target?: Person | null
  summary: string
  fields?: AuditFields
  ip?: string
}) {
  try {
    const details: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(entry.fields ?? {})) {
      if (value !== null && value !== undefined && value !== '') details[key] = value
    }

    const { data, error } = await supabaseServer
      .from('audit_log')
      .insert({
        action: entry.action,
        actor_id: entry.actor?.id ?? null,
        actor_name: entry.actor ? personLabel(entry.actor) : null,
        actor_role: entry.actor?.role ?? null,
        target_user_id: entry.target?.id ?? null,
        target_name: entry.target ? personLabel(entry.target) : null,
        summary: entry.summary,
        details,
        ip: entry.ip ?? null,
      })
      .select('id')
      .single()

    if (error) console.error('Audit log insert failed:', error.message)

    if (AUDIT_ACTIONS[entry.action].discord) {
      const embed = buildEmbed({
        id: data?.id,
        action: entry.action,
        actor: entry.actor,
        target: entry.target,
        summary: entry.summary,
        fields: details,
      })
      // Runs after the response is sent, so it never slows the page down
      after(async () => {
        await sendDiscordEmbed(embed)
      })
    }
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}