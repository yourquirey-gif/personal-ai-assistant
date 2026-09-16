const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type User = {
  userId: string
  email: string
  name: string
  picture: string
}

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) throw new Error('Backend health check failed')
  return response.json() as Promise<{ ok: boolean; service: string }>
}

export async function signInWithGoogle(credential: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  const data = (await response.json()) as { user?: User; error?: string }
  if (!response.ok || !data.user) throw new Error(data.error ?? 'Google sign-in failed')
  return data.user
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
  if (!response.ok) return null
  const data = (await response.json()) as { user?: User }
  return data.user ?? null
}

export async function signOut() {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    credentials: 'include',
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
