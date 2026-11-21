import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

const COLUMNS = 'id, name, description, points, student_submittable, active'

type Fields = {
  name?: string
  description?: string | null
  points?: number
  student_submittable?: boolean
  active?: boolean
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
  if ('points' in body) {
    const p = body.points
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 1 || p > 1000) {
      return { fields, error: 'Points must be a whole number from 1 to 1000' }
    }
    fields.points = p
  }
  if ('student_submittable' in body) {
    if (typeof body.student_submittable !== 'boolean') return { fields, error: 'Invalid value' }
    fields.student_submittable = body.student_submittable
  }
  if ('active' in body) {
    if (typeof body.active !== 'boolean') return { fields, error: 'Invalid value' }
    fields.active = body.active
  }
  return { fields }
}

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: jobs, error } = await supabaseServer
    .from('jobs')
    .select(COLUMNS)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { fields, error: parseError } = parseFields(await request.json())
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 })
  if (!fields.name || !fields.points) {
    return NextResponse.json({ error: 'Name and points are required' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('jobs').insert(fields)
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

  const { error } = await supabaseServer.from('jobs').update(fields).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}