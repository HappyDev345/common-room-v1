import { supabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data: rewards, error } = await supabaseServer
    .from('rewards')
    .select('id, name, description, cost')
    .eq('available', true)
    .order('cost', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rewards })
}