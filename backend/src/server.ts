import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { assertServerConfig, config } from './config.js'
import { chatRouter } from './routes/chat.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { conversationsRouter } from './routes/conversations.js'
import { accountRouter } from './routes/account.js'
import { requestRateLimit, securityHeaders } from './middleware/security.js'

const app = express()
app.set('trust proxy', 1)

app.use(securityHeaders)
app.use(requestRateLimit)
app.use(
  cors({
    origin: config.frontendOrigin === '*' ? true : config.frontendOrigin.split(',').map((origin: string) => origin.trim()),
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.use('/api', healthRouter)
app.use('/api', authRouter)
app.use('/api', accountRouter)
app.use('/api', conversationsRouter)
app.use('/api', chatRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled request error:', error)
  if (res.headersSent) return
  return res.status(500).json({ error: 'Internal server error.' })
})

assertServerConfig()

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`)
})
