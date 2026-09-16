import { Router } from 'express'
import { config } from '../config'

export const chatRouter = Router()

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 12_000
const MAX_TOTAL_LENGTH = 40_000

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  return (
    (message.role === 'system' || message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH
  )
}

chatRouter.post('/chat', async (req, res) => {
  if (!config.openRouterApiKey) {
    return res.status(503).json({
      error: 'AI service is not configured on the server yet.',
    })
  }

  const body = req.body as { message?: unknown; messages?: unknown }
  let messages: ChatMessage[]

  if (Array.isArray(body.messages)) {
    messages = body.messages.filter(isChatMessage)
    if (messages.length !== body.messages.length || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: 'Invalid messages payload.' })
    }
  } else if (typeof body.message === 'string') {
    const message = body.message.trim()
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: 'Message must be between 1 and 12,000 characters.' })
    }
    messages = [{ role: 'user', content: message }]
  } else {
    return res.status(400).json({ error: 'Send a message or messages array.' })
  }

  const totalLength = messages.reduce((total, message) => total + message.content.length, 0)
  if (totalLength > MAX_TOTAL_LENGTH) {
    return res.status(400).json({ error: 'Conversation is too large.' })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Personal AI Assistant',
      },
      body: JSON.stringify({
        model: config.openRouterModel,
        messages,
        max_tokens: 1200,
      }),
    })

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string }
    }

    if (!response.ok) {
      console.error('OpenRouter request failed:', response.status, data.error?.message ?? 'unknown error')
      return res.status(502).json({ error: 'AI provider request failed.' })
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return res.status(502).json({ error: 'AI provider returned an empty response.' })
    }

    return res.json({
      message: content,
      model: config.openRouterModel,
    })
  } catch (error) {
    console.error('OpenRouter request error:', error)
    return res.status(502).json({ error: 'Unable to reach the AI provider.' })
  }
})
