const WEB_SEARCH_PATTERNS = [
  /\b(latest|today|now|current|recent|news|this week|this month|2026)\b/i,
  /\b(search|google|look up|find|research|sources|according to)\b/i,
  /\b(compare|comparison|versus|vs\.?|best options|alternatives)\b/i,
  /\b(job|jobs|vacancy|vacancies|salary|hiring|career opportunities)\b/i,
  /\b(hotel|flight|travel|restaurant|shopping|price|prices|deal|deals)\b/i,
]

export type AgentPlan = {
  useWebSearch: boolean
  reason: string
}

export function createAgentPlan(query: string): AgentPlan {
  const normalized = query.replace(/\s+/g, ' ').trim()
  if (!normalized) return { useWebSearch: false, reason: 'empty_query' }

  const matched = WEB_SEARCH_PATTERNS.some((pattern) => pattern.test(normalized))
  if (matched) return { useWebSearch: true, reason: 'live_or_research_intent' }

  return { useWebSearch: false, reason: 'direct_answer_sufficient' }
}
