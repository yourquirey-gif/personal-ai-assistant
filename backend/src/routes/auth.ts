import { Router } from 'express'
import { randomBytes, randomInt, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import { config } from '../config.js'
import { getDb } from '../db.js'

export const authRouter = Router()

const googleClient = new OAuth2Client(config.googleClientId)
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null
const COOKIE_NAME = 'pa_session'
const SESSION_DAYS = 7
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const OTP_MAX_ATTEMPTS = 5

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
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`)
}

function clearSessionCookie(res: { setHeader: (name: string, value: string) => void }) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=None; Max-Age=0${secure}`)
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

function createResetToken() {
  return randomBytes(32).toString('hex')
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function validPassword(password: unknown) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

async function sendPasswordResetOtp(email: string, otp: string) {
  if (!resend) throw new Error('RESEND_API_KEY is not configured')
  const result = await resend.emails.send({
    from: config.resendFromEmail,
    to: [email],
    subject: 'Your Personal AI password reset code',
    text: `Your Personal AI password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Reset your Personal AI password</h2><p>Use this one-time code to reset your password:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 0">${otp}</div><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p></div>`,
  })
  if (result.error) throw new Error(result.error.message)
}

authRouter.post('/auth/signup', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : ''
  const password = req.body?.password
  if (!email || !email.includes('@') || email.length > 254 || !name || !validPassword(password)) {
    return res.status(400).json({ error: 'Enter a valid name, email, and password of at least 8 characters.' })
  }
  if (!config.mongoUri || !config.sessionSecret) return res.status(503).json({ error: 'Authentication is not configured on the server yet.' })

  try {
    const users = (await getDb()).collection('users')
    const existing = await users.findOne({ email })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' })
    const now = new Date()
    const result = await users.insertOne({ email, name, picture: '', passwordHash: hashPassword(password), createdAt: now, lastLoginAt: now })
    const user = { userId: String(result.insertedId), email, name, picture: '' }
    setSessionCookie(res, createSession(user))
    return res.status(201).json({ user })
  } catch (error) {
    console.error('Email signup error:', error)
    return res.status(500).json({ error: 'Unable to create the account.' })
  }
})

authRouter.post('/auth/signin', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password
  if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' })
  if (!config.mongoUri || !config.sessionSecret) return res.status(503).json({ error: 'Authentication is not configured on the server yet.' })

  try {
    const users = (await getDb()).collection('users')
    const account = await users.findOne({ email })
    if (!account || typeof account.passwordHash !== 'string' || !verifyPassword(password, account.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const now = new Date()
    await users.updateOne({ _id: account._id }, { $set: { lastLoginAt: now } })
    const user = { userId: String(account._id), email: account.email, name: account.name, picture: account.picture || '' }
    setSessionCookie(res, createSession(user))
    return res.json({ user })
  } catch (error) {
    console.error('Email signin error:', error)
    return res.status(500).json({ error: 'Unable to sign in.' })
  }
})

authRouter.post('/auth/google', async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
  if (!credential) return res.status(400).json({ error: 'Google credential is required.' })
  if (!config.googleClientId || !config.mongoUri || !config.sessionSecret) return res.status(503).json({ error: 'Google authentication is not configured yet.' })
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || payload.email_verified !== true) return res.status(401).json({ error: 'Google account verification failed.' })
    const db = await getDb()
    const now = new Date()
    const users = db.collection('users')
    const userData = { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name || payload.email.split('@')[0], picture: payload.picture || '', lastLoginAt: now }
    const result = await users.findOneAndUpdate({ googleId: payload.sub }, { $set: userData, $setOnInsert: { createdAt: now } }, { upsert: true, returnDocument: 'after' })
    if (!result) return res.status(500).json({ error: 'Unable to create the account.' })
    const user = { userId: String(result._id), email: result.email, name: result.name, picture: result.picture }
    setSessionCookie(res, createSession(user))
    return res.json({ user })
  } catch (error) {
    console.error('Google authentication error:', error)
    return res.status(401).json({ error: 'Google authentication failed.' })
  }
})

authRouter.post('/auth/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  if (!email || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (!config.mongoUri || !config.resendApiKey) return res.status(503).json({ error: 'Password reset email is not configured yet.' })

  try {
    const db = await getDb()
    const users = db.collection('users')
    const account = await users.findOne({ email })
    if (!account || typeof account.passwordHash !== 'string') return res.json({ ok: true, message: 'If an account exists for this email, a reset code has been sent.' })

    const latest = await db.collection('passwordResets').findOne({ email }, { sort: { createdAt: -1 } })
    if (latest && Date.now() - new Date(latest.createdAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait before requesting another code.' })
    }

    const otp = String(randomInt(100000, 1000000))
    await db.collection('passwordResets').deleteMany({ email })
    await db.collection('passwordResets').insertOne({ email, otpHash: hashOtp(otp), attempts: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MS) })
    await sendPasswordResetOtp(email, otp)
    return res.json({ ok: true, message: 'If an account exists for this email, a reset code has been sent.' })
  } catch (error) {
    console.error('Password reset email error:', error)
    return res.status(500).json({ error: 'Unable to send the reset code right now.' })
  }
})

authRouter.post('/auth/verify-reset-otp', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : ''
  if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the 6-digit code sent to your email.' })
  try {
    const db = await getDb()
    const reset = await db.collection('passwordResets').findOne({ email })
    if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'The code is invalid or expired.' })
    if ((reset.attempts ?? 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many attempts. Request a new code.' })
    await db.collection('passwordResets').updateOne({ _id: reset._id }, { $inc: { attempts: 1 } })
    if (hashOtp(otp) !== reset.otpHash) return res.status(400).json({ error: 'The code is invalid or expired.' })
    const resetToken = createResetToken()
    await db.collection('passwordResets').updateOne({ _id: reset._id }, { $set: { verified: true, resetTokenHash: hashResetToken(resetToken), verifiedAt: new Date(), resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }, $unset: { otpHash: '' } })
    return res.json({ ok: true, resetToken })
  } catch (error) {
    console.error('Reset OTP verification error:', error)
    return res.status(500).json({ error: 'Unable to verify the code.' })
  }
})

authRouter.post('/auth/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken : ''
  const password = req.body?.password
  if (!email || !resetToken || !validPassword(password)) return res.status(400).json({ error: 'Enter a valid new password.' })
  try {
    const db = await getDb()
    const reset = await db.collection('passwordResets').findOne({ email, verified: true, resetTokenHash: hashResetToken(resetToken) })
    if (!reset || !reset.resetTokenExpiresAt || new Date(reset.resetTokenExpiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'Your reset session is invalid or expired.' })
    const users = db.collection('users')
    const result = await users.updateOne({ email }, { $set: { passwordHash: hashPassword(password), updatedAt: new Date() }, $unset: { resetTokenHash: '' } })
    if (!result.matchedCount) return res.status(400).json({ error: 'Unable to update the password.' })
    await db.collection('passwordResets').deleteMany({ email })
    return res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return res.status(500).json({ error: 'Unable to update the password.' })
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
