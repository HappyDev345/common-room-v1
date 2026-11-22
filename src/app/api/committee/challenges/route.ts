import { supabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/session'
import { logAudit, fullName } from '@/lib/audit'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { data: challenges, error } = await supabaseServer
    .from('challenges')
    .select('*')
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ challenges })
}

export async function POST(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const { goal, rewardPoints } = body

  if (!title || title.length > 80) {
    return NextResponse.json({ error: 'Title is required (max 80 characters)' }, { status: 400 })
  }
  if (description.length > 300) {
    return NextResponse.json({ error: 'Description is too long (max 300 characters)' }, { status: 400 })
  }
  if (!Number.isInteger(goal) || goal < 1 || goal > 10000) {
    return NextResponse.json({ error: 'Goal must be a whole number from 1 to 10000' }, { status: 400 })
  }
  if (!Number.isInteger(rewardPoints) || rewardPoints < 0 || rewardPoints > 500) {
    return NextResponse.json({ error: 'Reward must be a whole number from 0 to 500' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('challenges').insert({
    title,
    description: description || null,
    goal,
    reward_points: rewardPoints,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    action: 'challenge.created',
    actor: auth.user,
    summary: `${fullName(auth.user)} created the challenge "${title}"`,
    fields: {
      Challenge: title,
      Goal: goal,
      'Reward per student': rewardPoints > 0 ? `${rewardPoints} pts` : 'None',
      Description: description || null,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['committee', 'admin'])
  if (!auth.ok) return auth.response

  const { id, action, amount } = await request.json()
  if (!id || !['progress', 'complete', 'archive'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: challenge } = await supabaseServer
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  if (action === 'archive') {
    const { error } = await supabaseServer
      .from('challenges')
      .update({ status: 'archived' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      action: 'challenge.removed',
      actor: auth.user,
      summary: `${fullName(auth.user)} removed the challenge "${challenge.title}"`,
      fields: {
        Challenge: challenge.title,
        'Status before': challenge.status,
        Progress: `${challenge.progress} / ${challenge.goal}`,
      },
    })

    return NextResponse.json({ success: true })
  }

  if (challenge.status !== 'active') {
    return NextResponse.json({ error: 'This challenge is not active' }, { status: 409 })
  }

  if (action === 'progress') {
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > challenge.goal) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    const progress = Math.min(challenge.goal, Math.max(0, challenge.progress + amount))
    const { error } = await supabaseServer
      .from('challenges')
      .update({ progress })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      action: 'challenge.progress',
      actor: auth.user,
      summary: `${fullName(auth.user)} updated progress on "${challenge.title}"`,
      fields: {
        Challenge: challenge.title,
        Change: amount > 0 ? `+${amount}` : `${amount}`,
        Progress: `${challenge.progress} → ${progress} of ${challenge.goal}`,
        Complete: `${Math.round((progress / challenge.goal) * 100)}%`,
      },
    })

    return NextResponse.json({ success: true })
  }

  // action === 'complete'
  if (challenge.progress < challenge.goal) {
    return NextResponse.json({ error: 'The goal has not been reached yet' }, { status: 400 })
  }

  // Only completes if still active, so rewards can never be paid out twice
  const { data: completed } = await supabaseServer
    .from('challenges')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active')
    .select('id')
    .single()

  if (!completed) {
    return NextResponse.json({ error: 'Already completed' }, { status: 409 })
  }

  let paid = 0
  if (challenge.reward_points > 0) {
    const { data: students } = await supabaseServer
      .from('users')
      .select('id')
      .eq('role', 'student')

    const rows = (students || []).map(s => ({
      user_id: s.id,
      amount: challenge.reward_points,
      reason: `Challenge completed: ${challenge.title}`,
      awarded_by: auth.user.id,
    }))

    if (rows.length > 0) {
      const { error } = await supabaseServer.from('transactions').insert(rows)
      if (error) {
        // Put the challenge back so it can be tried again
        await supabaseServer
          .from('challenges')
          .update({ status: 'active', completed_at: null })
          .eq('id', id)
        return NextResponse.json({ error: 'Could not award points. Nothing was changed.' }, { status: 500 })
      }
      paid = rows.length
    }
  }

  await logAudit({
    action: 'challenge.completed',
    actor: auth.user,
    summary: `${fullName(auth.user)} completed "${challenge.title}"${paid > 0 ? ` and paid ${challenge.reward_points} points to ${paid} students` : ''}`,
    fields: {
      Challenge: challenge.title,
      Goal: challenge.goal,
      'Reward per student': challenge.reward_points > 0 ? `${challenge.reward_points} pts` : 'None',
      'Students paid': paid,
      'Total points paid': paid * challenge.reward_points,
    },
  })

  return NextResponse.json({ success: true })
}