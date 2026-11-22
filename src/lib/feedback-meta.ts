// Shared by the server and the browser. Keep free of server-only imports.

export type FeedbackType = 'suggestion' | 'report'
export type FeedbackStatus = 'new' | 'reviewing' | 'done' | 'dismissed'

type CategoryMeta = {
  type: FeedbackType
  label: string
  emoji: string
  sensitive?: boolean // text is kept out of Discord and the audit log
}

export const FEEDBACK_CATEGORIES = {
  job_idea: { type: 'suggestion', label: 'New job idea', emoji: '🛠️' },
  reward_idea: { type: 'suggestion', label: 'New reward idea', emoji: '🎁' },
  other_suggestion: { type: 'suggestion', label: 'Other suggestion', emoji: '💡' },
  supplies: { type: 'report', label: 'Supplies needed', emoji: '🥛' },
  broken: { type: 'report', label: 'Something broken or unsafe', emoji: '🔧' },
  behaviour: { type: 'report', label: 'Behaviour or rules', emoji: '🚩', sensitive: true },
  other_report: { type: 'report', label: 'Other report', emoji: '📝' },
} satisfies Record<string, CategoryMeta>

export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES

export function getCategory(key: string): CategoryMeta | null {
  return (FEEDBACK_CATEGORIES as Record<string, CategoryMeta>)[key] ?? null
}

export function categoriesFor(type: FeedbackType) {
  return Object.entries(FEEDBACK_CATEGORIES as Record<string, CategoryMeta>)
    .filter(([, meta]) => meta.type === type)
    .map(([key, meta]) => ({ key, ...meta }))
}

// What the committee sees
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewing: 'Looking into it',
  done: 'Done',
  dismissed: 'Not going ahead',
}

// What the student sees
export const STUDENT_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Received',
  reviewing: 'Looking into it',
  done: 'Done',
  dismissed: 'Not going ahead',
}

export const FEEDBACK_STATUSES = Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]

export const MAX_FEEDBACK_PER_DAY = 5
export const MAX_FEEDBACK_MESSAGE = 600
export const MAX_FEEDBACK_REPLY = 500