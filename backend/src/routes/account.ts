import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { getDb } from '../db.js'
import { requireSession, type SessionUser } from '../auth/session.js'

export const accountRouter = Router()
accountRouter.use(requireSession)

const DAILY_LIMIT = 30

function getUser(res: { locals: { user?: SessionUser } }) {
  return res.locals.user as SessionUser
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

async function ensureReferral(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  const referrals = db.collection('referrals')
  let record = await referrals.findOne({ userId })
  if (!record) {
    const code = `PA-${randomBytes(5).toString('hex').toUpperCase()}`
    await referrals.insertOne({ userId, code, invitedCount: 0, rewardedCount: 0, createdAt: new Date() })
    record = await referrals.findOne({ userId })
  }
  return record
}

accountRouter.get('/account/overview', async (_req, res) => {
  const currentUser = getUser(res)
  try {
    const db = await getDb()
    const usage = await db.collection('usage').findOne({ userId: currentUser.userId, date: startOfToday() })
    const referral = await ensureReferral(db, currentUser.userId)
    return res.json({
      user: currentUser,
      plan: { id: 'free', name: 'Free', dailyRequests: DAILY_LIMIT },
      usage: { requestsToday: usage?.requests ?? 0, remainingToday: Math.max(0, DAILY_LIMIT - (usage?.requests ?? 0)) },
      referral: { code: referral?.code ?? '', invitedCount: referral?.invitedCount ?? 0, rewardedCount: referral?.rewardedCount ?? 0 },
    })
  } catch (error) {
    console.error('Account overview error:', error)
    return res.status(500).json({ error: 'Unable to load account details.' })
  }
})

accountRouter.get('/referral', async (_req, res) => {
  const currentUser = getUser(res)
  try {
    const db = await getDb()
    const referral = await ensureReferral(db, currentUser.userId)
    return res.json({ code: referral?.code ?? '', invitedCount: referral?.invitedCount ?? 0, rewardedCount: referral?.rewardedCount ?? 0 })
  } catch (error) {
    console.error('Referral error:', error)
    return res.status(500).json({ error: 'Unable to load referral details.' })
  }
})

export { DAILY_LIMIT }
