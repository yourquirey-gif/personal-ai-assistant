import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'personal-ai-assistant-backend' })
})

app.post('/api/chat', (_req, res) => {
  // OpenRouter integration will be added in the next build step.
  res.status(501).json({
    error: 'Chat service is not connected yet.',
  })
})

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
