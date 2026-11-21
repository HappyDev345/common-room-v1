import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

const COLUMNS = 'id, name, description, cost, available'

type Fields = {
  name?: string
  description?: string | null
  cost?: number
  available?: boolean
}

function parseFields(body: Record<string, unknown>): { fields: Fields; error?: string } {
  const fields: Fields = {}

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 80) return { fields, error: 'Name is required (max 80 characters)' }
    fields.name = name
  }
  if ('description' in body) {
    const d = typeof body.description === 'string' ? body.description.trim() : ''
    if (d.length > 300) return { fields, error: 'Description is too long (max 300 characters)' }
    fields.description = d || null
  }
  if ('cost' in body) {
    const c = body.cost
    if (typeof c !== 'number' || !Number.isInteger(c) || c < 1 || c > 10000) {
      return { fields, error: 'Cost must be a whole number from 1 to 10000' }
    }
    fields.cost = c
  }
  if ('available' in body) {
    if (typeof body.available !== 'boolean') return { fields, error: 'Invalid value' }
    fields.available = body.available
  }
  return { fields }
}

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: rewards, error } = await supabaseServer
    .from('rewards')
    .select(COLUMNS)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rewards })
}

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { fields, error: parseError } = parseFields(await request.json())
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 })
  if (!fields.name || !fields.cost) {
    return NextResponse.json({ error: 'Name and cost are required' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('rewards').insert(fields)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { fields, error: parseError } = parseFields(body)
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 })
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('rewards').update(fields).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}