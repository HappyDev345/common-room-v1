import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: transactions, error } = await supabaseServer
    .from('transactions')
    .select('*, users!user_id(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions })
}