import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

export const SESSION_COOKIE_NAME = 'pa_session'

export type SessionUser = {
  userId: string
  email: string
  name: string
  picture: string
}

export function getSessionUser(req: Request): SessionUser | null {
  if (!config.sessionSecret) return null
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
  if (!cookie) return null
  try {
    return jwt.verify(decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1)), config.sessionSecret) as SessionUser
  } catch {
    return null
  }
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' })
  res.locals.user = user
  return next()
}
