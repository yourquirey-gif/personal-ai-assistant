import { Router } from 'express'
import { config } from '../config.js'
import { getDb } from '../db.js'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'personal-ai-assistant-backend' })
})

healthRouter.get('/health/ready', async (_req, res) => {
  const checks = {
    database: false,
    ai: Boolean(config.openRouterApiKey),
    search: Boolean(config.serperApiKey),
    sessions: Boolean(config.sessionSecret),
    emailReset: Boolean(config.resendApiKey),
  }

  if (config.mongoUri) {
    try {
      const db = await getDb()
      await db.command({ ping: 1 })
      checks.database = true
    } catch (error) {
      console.error('Readiness database check failed:', error)
    }
  }

  const ready = checks.database && checks.ai && checks.sessions
  return res.status(ready ? 200 : 503).json({ ok: ready, service: 'personal-ai-assistant-backend', checks })
})
