import { config } from '../config.js'

export type SearchProvider = 'google'

export type SearchResult = {
  title: string
  url: string
  snippet: string
  provider: SearchProvider
}

export type WebSearchResponse = {
  query: string
  providers: SearchProvider[]
  results: SearchResult[]
}

const MAX_RESULTS = 10
const MAX_FINAL_RESULTS = 10
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

async function fetchJson(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Google Search returned ${response.status}`)
    return data as Record<string, unknown>
  } finally {
    clearTimeout(timeout)
  }
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
      num: MAX_RESULTS,
      autocorrect: true,
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

function buildQueryVariants(query: string) {
  const normalized = query.replace(/\s+/g, ' ').trim().slice(0, 600)
  if (!normalized) return []
  const variants = [normalized]
  const lower = normalized.toLowerCase()
  const timeSensitive = /\b(latest|today|now|current|recent|news|price|rate|2026|this week|this month|deadline)\b/i.test(normalized)
  if (timeSensitive && !/\b2026\b/.test(lower)) variants.push(`${normalized} 2026`)
  return [...new Set(variants)].slice(0, 2)
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

export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const variants = buildQueryVariants(query)
  if (variants.length === 0 || !config.serperApiKey) return { query, providers: [], results: [] }

  const settled = await Promise.allSettled(variants.map((variant) => searchGoogle(variant)))
  const results = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : [])
  return {
    query,
    providers: ['google'],
    results: uniqueResults(results).slice(0, MAX_FINAL_RESULTS),
  }
}
