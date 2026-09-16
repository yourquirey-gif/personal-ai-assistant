const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) throw new Error('Backend health check failed')
  return response.json() as Promise<{ ok: boolean; service: string }>
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  const data = (await response.json()) as { message?: string; error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? 'Chat request failed')
  }

  if (!data.message) {
    throw new Error('The assistant returned an empty response')
  }

  return data.message
}
