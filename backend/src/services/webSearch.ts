import { config } from '../config.js'

export type SearchProvider = 'tavily' | 'google' | 'brave'

export type SearchResult = {
  title: string
  url: string
  snippet: string
  provider: SearchProvider
  score?: number
}

export type WebSearchResponse = {
  query: string
  providers: SearchProvider[]
  results: SearchResult[]
}

const MAX_RESULTS_PER_PROVIDER = 6
const MAX_FINAL_RESULTS = 12
const REQUEST_TIMEOUT_MS = 9_000

function cleanText(value: unknown, maxLength = 700) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function cleanUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

function uniqueResults(results: SearchResult[]) {
  const seen = new Set<string>()
  return results.filter((result) => {
    const key = result.url.replace(/\/$/, '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchJson(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`)
    return data as Record<string, unknown>
  } finally {
    clearTimeout(timeout)
  }
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  if (!config.tavilyApiKey) return []
  const data = await fetchJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.tavilyApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      topic: 'general',
      max_results: MAX_RESULTS_PER_PROVIDER,
      include_answer: false,
      include_raw_content: false,
      auto_parameters: true,
      country: 'india',
    }),
  })

  const results = Array.isArray(data.results) ? data.results : []
  return results.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const url = cleanUrl(value.url)
    const title = cleanText(value.title, 220)
    const snippet = cleanText(value.content ?? value.snippet)
    if (!url || !title) return []
    return [{ title, url, snippet, provider: 'tavily' as const, score: typeof value.score === 'number' ? value.score : undefined }]
  })
}

async function searchGoogle(query: string): Promise<SearchResult[]> {
  if (!config.serperApiKey) return []
  const data = await fetchJson('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': config.serperApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'in',
      hl: 'en',
      num: MAX_RESULTS_PER_PROVIDER,
    }),
  })

  const results = Array.isArray(data.organic) ? data.organic : []
  return results.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const url = cleanUrl(value.link)
    const title = cleanText(value.title, 220)
    const snippet = cleanText(value.snippet)
    if (!url || !title) return []
    return [{ title, url, snippet, provider: 'google' as const }]
  })
}

async function searchBrave(query: string): Promise<SearchResult[]> {
  if (!config.braveApiKey) return []
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('country', 'IN')
  url.searchParams.set('search_lang', 'en')
  url.searchParams.set('count', String(MAX_RESULTS_PER_PROVIDER))
  url.searchParams.set('safesearch', 'moderate')

  const data = await fetchJson(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': config.braveApiKey,
    },
  })

  const web = data.web
  if (!web || typeof web !== 'object') return []
  const results = (web as Record<string, unknown>).results
  if (!Array.isArray(results)) return []

  return results.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const url = cleanUrl(value.url)
    const title = cleanText(value.title, 220)
    const snippet = cleanText(value.description)
    if (!url || !title) return []
    return [{ title, url, snippet, provider: 'brave' as const }]
  })
}

function buildQueryVariants(query: string) {
  const normalized = query.replace(/\s+/g, ' ').trim().slice(0, 600)
  if (!normalized) return []

  const variants = [normalized]
  const lower = normalized.toLowerCase()
  const timeSensitive = /\b(latest|today|now|current|recent|news|price|rate|2026|this week|this month)\b/i.test(normalized)
  if (timeSensitive && !/\b2026\b/.test(lower)) variants.push(`${normalized} 2026`)

  return [...new Set(variants)].slice(0, 2)
}

export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const variants = buildQueryVariants(query)
  if (variants.length === 0) return { query, providers: [], results: [] }

  const providers: SearchProvider[] = []
  if (config.tavilyApiKey) providers.push('tavily')
  if (config.serperApiKey) providers.push('google')
  if (config.braveApiKey) providers.push('brave')

  if (providers.length === 0) return { query, providers: [], results: [] }

  const tasks = variants.flatMap((variant) => [
    config.tavilyApiKey ? searchTavily(variant) : Promise.resolve([]),
    config.serperApiKey ? searchGoogle(variant) : Promise.resolve([]),
    config.braveApiKey ? searchBrave(variant) : Promise.resolve([]),
  ])

  const settled = await Promise.allSettled(tasks)
  const results = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : [])
  const deduped = uniqueResults(results)

  const providerRank = new Map<SearchProvider, number>([
    ['google', 3],
    ['brave', 2],
    ['tavily', 1],
  ])

  deduped.sort((a, b) => {
    const scoreA = (a.score ?? 0) + (providerRank.get(a.provider) ?? 0) * 0.01
    const scoreB = (b.score ?? 0) + (providerRank.get(b.provider) ?? 0) * 0.01
    return scoreB - scoreA
  })

  return {
    query,
    providers,
    results: deduped.slice(0, MAX_FINAL_RESULTS),
  }
}
