import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: users, error } = await supabaseServer
    .from('users')
    .select('id, first_name, last_name, username')
    .eq('role', 'student')
    .order('last_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate balance for each student
  const students = await Promise.all(
    (users || []).map(async (u) => {
      const { data: transactions } = await supabaseServer
        .from('transactions')
        .select('amount')
        .eq('user_id', u.id)

      const balance = (transactions || []).reduce((sum, t) => sum + t.amount, 0)
      return { ...u, balance }
    })
  )

  return NextResponse.json({ students })
}