import { Router } from 'express'

export const chatRouter = Router()

chatRouter.post('/chat', (_req, res) => {
  res.status(501).json({
    error: 'Chat service is not connected yet.',
  })
})
