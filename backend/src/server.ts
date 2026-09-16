import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { assertServerConfig, config } from './config.js'
import { chatRouter } from './routes/chat.js'
import { healthRouter } from './routes/health.js'

const app = express()

app.use(
  cors({
    origin: config.frontendOrigin === '*' ? true : config.frontendOrigin.split(',').map((origin: string) => origin.trim()),
  }),
)
app.use(express.json({ limit: '1mb' }))

app.use('/api', healthRouter)
app.use('/api', chatRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

assertServerConfig()

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`)
})
