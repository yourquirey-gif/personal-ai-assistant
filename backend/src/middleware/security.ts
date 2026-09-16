import type { NextFunction, Request, Response } from 'express'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60_000
const GENERAL_LIMIT = 120
const AUTH_LIMIT = 20
const CHAT_LIMIT = 45

function clientKey(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.ip || 'unknown'
}

function getLimit(req: Request) {
  if (req.path.startsWith('/auth/')) return AUTH_LIMIT
  if (req.path === '/chat') return CHAT_LIMIT
  return GENERAL_LIMIT
}

export function requestRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now()
  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
  }

  const key = `${clientKey(req)}:${req.path.startsWith('/auth/') ? 'auth' : req.path === '/chat' ? 'chat' : 'general'}`
  const existing = buckets.get(key)
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : existing

  bucket.count += 1
  buckets.set(key, bucket)

  if (bucket.count > getLimit(req)) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  }

  return next()
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return next()
}
