export function extractIssueKey(jiraUrl: string | null | undefined): string | null {
  if (!jiraUrl) return null
  try {
    const url = new URL(jiraUrl)
    const segment = url.pathname.replace(/\/$/, '').split('/').pop()
    return segment || null
  } catch {
    return null
  }
}
