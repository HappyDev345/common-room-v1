// Shared by the server (when logging) and the browser (the Audit Log tab).
// Keep this file free of server-only imports.

export type AuditCategory =
  | 'points'
  | 'jobs'
  | 'rewards'
  | 'accounts'
  | 'challenges'
  | 'announcements'
  | 'settings'
  | 'security'

export const AUDIT_CATEGORIES: { key: AuditCategory; label: string }[] = [
  { key: 'points', label: 'Points' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'accounts', label: 'Accounts and passwords' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'settings', label: 'Settings' },
  { key: 'security', label: 'Security' },
]

export type ActionMeta = {
  label: string
  emoji: string
  color: number // Discord embed colour
  category: AuditCategory
  discord: boolean // set to false to keep an event in the website log but out of Discord
}

const GREEN = 0x059669
const RED = 0xdc2626
const AMBER = 0xd97706
const BLUE = 0x0e6fbf
const PURPLE = 0x7c3aed
const GREY = 0x6b7280

export const AUDIT_ACTIONS = {
  // Points
  'points.awarded': { label: 'Points awarded', emoji: '🪙', color: GREEN, category: 'points', discord: true },
  'points.deducted': { label: 'Points deducted', emoji: '➖', color: RED, category: 'points', discord: true },

  // Jobs
  'job.submitted': { label: 'Job submitted', emoji: '📝', color: AMBER, category: 'jobs', discord: true },
  'job.approved': { label: 'Job approved', emoji: '✅', color: GREEN, category: 'jobs', discord: true },
  'job.declined': { label: 'Job declined', emoji: '❌', color: RED, category: 'jobs', discord: true },
  'job.created': { label: 'Job created', emoji: '🆕', color: BLUE, category: 'jobs', discord: true },
  'job.updated': { label: 'Job updated', emoji: '✏️', color: BLUE, category: 'jobs', discord: true },

  // Rewards
  'reward.requested': { label: 'Reward requested', emoji: '🎁', color: AMBER, category: 'rewards', discord: true },
  'reward.approved': { label: 'Reward approved', emoji: '✅', color: GREEN, category: 'rewards', discord: true },
  'reward.declined': { label: 'Reward declined', emoji: '❌', color: RED, category: 'rewards', discord: true },
  'reward.created': { label: 'Reward created', emoji: '🆕', color: BLUE, category: 'rewards', discord: true },
  'reward.updated': { label: 'Reward updated', emoji: '✏️', color: BLUE, category: 'rewards', discord: true },

  // Accounts
  'students.created': { label: 'Student accounts created', emoji: '👥', color: BLUE, category: 'accounts', discord: true },
  'password.reset': { label: 'Password reset by committee', emoji: '🔑', color: AMBER, category: 'accounts', discord: true },
  'password.changed': { label: 'Password changed', emoji: '🔒', color: BLUE, category: 'accounts', discord: true },

  // Challenges
  'challenge.created': { label: 'Challenge created', emoji: '🎯', color: PURPLE, category: 'challenges', discord: true },
  'challenge.progress': { label: 'Challenge progress updated', emoji: '📈', color: PURPLE, category: 'challenges', discord: true },
  'challenge.completed': { label: 'Challenge completed and paid out', emoji: '🏆', color: GREEN, category: 'challenges', discord: true },
  'challenge.removed': { label: 'Challenge removed', emoji: '🗑️', color: GREY, category: 'challenges', discord: true },

  // Announcements
  'announcement.posted': { label: 'Announcement posted', emoji: '📢', color: BLUE, category: 'announcements', discord: true },
  'announcement.deleted': { label: 'Announcement deleted', emoji: '🗑️', color: GREY, category: 'announcements', discord: true },

  // Settings
  'settings.changed': { label: 'Setting changed', emoji: '⚙️', color: BLUE, category: 'settings', discord: true },

  // Security
  'auth.login': { label: 'Signed in', emoji: '🔓', color: GREY, category: 'security', discord: false },
  'auth.lockout': { label: 'Sign-in locked', emoji: '🚨', color: RED, category: 'security', discord: true },
} satisfies Record<string, ActionMeta>

export type AuditAction = keyof typeof AUDIT_ACTIONS

const FALLBACK: ActionMeta = {
  label: 'Event',
  emoji: '📄',
  color: GREY,
  category: 'settings',
  discord: false,
}

export function getActionMeta(action: string): ActionMeta {
  const meta = (AUDIT_ACTIONS as Record<string, ActionMeta>)[action]
  return meta ?? { ...FALLBACK, label: action }
}

export function getActionsInCategory(category: string): string[] {
  return Object.entries(AUDIT_ACTIONS as Record<string, ActionMeta>)
    .filter(([, meta]) => meta.category === category)
    .map(([key]) => key)
}