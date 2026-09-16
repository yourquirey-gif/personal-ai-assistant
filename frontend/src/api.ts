const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type User = {
  userId: string
  email: string
  name: string
  picture: string
}

async function postAuth<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Authentication request failed')
  return data
}

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) throw new Error('Backend health check failed')
  return response.json() as Promise<{ ok: boolean; service: string }>
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const data = await postAuth<{ user: User }>('/api/auth/signup', { name, email, password })
  return data.user
}

export async function signInWithEmail(email: string, password: string) {
  const data = await postAuth<{ user: User }>('/api/auth/signin', { email, password })
  return data.user
}

export async function requestPasswordReset(email: string) {
  return postAuth<{ ok: boolean; message: string }>('/api/auth/forgot-password', { email })
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const data = await postAuth<{ ok: boolean; resetToken: string }>('/api/auth/verify-reset-otp', { email, otp })
  return data.resetToken
}

export async function resetPassword(email: string, resetToken: string, password: string) {
  return postAuth<{ ok: boolean; message: string }>('/api/auth/reset-password', { email, resetToken, password })
}

export async function signInWithGoogle(credential: string) {
  const data = await postAuth<{ user: User }>('/api/auth/google', { credential })
  return data.user
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
  if (!response.ok) return null
  const data = (await response.json()) as { user?: User }
  return data.user ?? null
}

export async function signOut() {
  await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
}

export type WebSource = {
  title: string
  url: string
  provider: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: WebSource[]
}

export type ChatResponse = {
  message: string
  webSearch: {
    used: boolean
    providers: string[]
    sources: WebSource[]
  }
}

export async function sendChatMessage(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = (await response.json()) as ChatResponse & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Chat request failed')
  if (!data.message) throw new Error('The assistant returned an empty response')
  return data.message
}
