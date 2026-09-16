import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { getDb } from '../db.js'

export const authRouter = Router()

const googleClient = new OAuth2Client(config.googleClientId)
const COOKIE_NAME = 'pa_session'
const SESSION_DAYS = 7

type SessionUser = {
  userId: string
  email: string
  name: string
  picture: string
}

function createSession(user: SessionUser) {
  if (!config.sessionSecret) throw new Error('SESSION_SECRET is not configured')
  return jwt.sign(user, config.sessionSecret, { expiresIn: `${SESSION_DAYS}d` })
}

function readSession(req: { headers: { cookie?: string } }): SessionUser | null {
  if (!config.sessionSecret || !req.headers.cookie) return null
  const pair = req.headers.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))
  if (!pair) return null

  try {
    const token = decodeURIComponent(pair.slice(COOKIE_NAME.length + 1))
    return jwt.verify(token, config.sessionSecret) as SessionUser
  } catch {
    return null
  }
}

function setSessionCookie(res: { setHeader: (name: string, value: string) => void }, token: string) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`,
  )
}

function clearSessionCookie(res: { setHeader: (name: string, value: string) => void }) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=None; Max-Age=0${secure}`)
}

authRouter.post('/auth/google', async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
  if (!credential) return res.status(400).json({ error: 'Google credential is required.' })
  if (!config.googleClientId || !config.mongoUri || !config.sessionSecret) {
    return res.status(503).json({ error: 'Authentication is not configured on the server yet.' })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    })
    const payload = ticket.getPayload()

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Google account verification failed.' })
    }

    const db = await getDb()
    const now = new Date()
    const users = db.collection('users')
    const user = {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
      lastLoginAt: now,
    }

    const result = await users.findOneAndUpdate(
      { googleId: payload.sub },
      { $set: user, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: 'after' },
    )

    if (!result) return res.status(500).json({ error: 'Unable to create the account.' })

    const sessionUser: SessionUser = {
      userId: String(result._id),
      email: result.email,
      name: result.name,
      picture: result.picture,
    }

    setSessionCookie(res, createSession(sessionUser))
    return res.json({ user: sessionUser })
  } catch (error) {
    console.error('Google authentication error:', error)
    return res.status(401).json({ error: 'Google authentication failed.' })
  }
})

authRouter.get('/auth/me', (req, res) => {
  const user = readSession(req)
  if (!user) return res.status(401).json({ error: 'Not signed in.' })
  return res.json({ user })
})

authRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res)
  return res.json({ ok: true })
})
