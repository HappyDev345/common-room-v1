export type DiscordField = { name: string; value: string; inline?: boolean }

export type DiscordEmbed = {
  title?: string
  description?: string
  color?: number
  fields?: DiscordField[]
  footer?: { text: string }
  timestamp?: string
}

async function post(url: string, embed: DiscordEmbed) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Common Room Audit',
      // Stops anything a user typed (like @everyone) from pinging people
      allowed_mentions: { parse: [] },
      embeds: [embed],
    }),
  })
}

// Returns true if Discord accepted the message. Never throws.
export async function sendDiscordEmbed(embed: DiscordEmbed): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return false

  try {
    let res = await post(url, embed)

    // Discord allows about 5 messages per 2 seconds per webhook. Wait and retry once.
    if (res.status === 429) {
      const data = await res.json().catch(() => null)
      const waitMs = Math.min(Math.max((data?.retry_after ?? 1) * 1000, 500), 4000)
      await new Promise(resolve => setTimeout(resolve, waitMs))
      res = await post(url, embed)
    }

    if (!res.ok) {
      console.error('Discord webhook rejected the message:', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('Discord webhook failed:', err)
    return false
  }
}