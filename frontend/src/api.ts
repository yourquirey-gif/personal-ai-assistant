const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
const CONVERSATION_STORAGE_KEY = 'personal_ai_current_conversation'

export type User = {
  userId: string
  email: string
  name: string
  picture: string
}

async function postAuth<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Authentication request failed')
  return data
}

async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
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

export async function requestPasswordReset(email: string) { return postAuth<{ ok: boolean; message: string }>('/api/auth/forgot-password', { email }) }
export async function verifyPasswordResetOtp(email: string, otp: string) { const data = await postAuth<{ ok: boolean; resetToken: string }>('/api/auth/verify-reset-otp', { email, otp }); return data.resetToken }
export async function resetPassword(email: string, resetToken: string, password: string) { return postAuth<{ ok: boolean; message: string }>('/api/auth/reset-password', { email, resetToken, password }) }

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
  if (!response.ok) return null
  const data = await response.json() as { user?: User }
  return data.user ?? null
}

export async function signOut() {
  await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  localStorage.removeItem(CONVERSATION_STORAGE_KEY)
}

export type WebSource = { title: string; url: string; provider: string }
export type ChatMessage = { role: 'user' | 'assistant'; content: string; sources?: WebSource[]; createdAt?: string }
export type ChatResponse = { message: string; model?: string; conversationId?: string; webSearch: { used: boolean; providers: string[]; sources: WebSource[]; planReason?: string } }

export function startNewChat() { localStorage.removeItem(CONVERSATION_STORAGE_KEY) }
export function getCurrentConversationId() { return localStorage.getItem(CONVERSATION_STORAGE_KEY) }

async function ensureConversation() {
  const existing = localStorage.getItem(CONVERSATION_STORAGE_KEY)
  if (existing) return existing
  const data = await apiFetch<{ conversation: { id: string } }>('/api/conversations', { method: 'POST', body: JSON.stringify({ title: 'New chat' }) })
  localStorage.setItem(CONVERSATION_STORAGE_KEY, data.conversation.id)
  return data.conversation.id
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const conversationId = await ensureConversation()
  const data = await apiFetch<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify({ messages, conversationId }) })
  if (data.conversationId) localStorage.setItem(CONVERSATION_STORAGE_KEY, data.conversationId)
  if (!data.message) throw new Error('The assistant returned an empty response')
  return data
}

export type Conversation = { id: string; title: string; createdAt: string; updatedAt: string }
export async function getConversations() { const data = await apiFetch<{ conversations: Conversation[] }>('/api/conversations'); return data.conversations }
export async function getConversation(id: string) { return apiFetch<{ conversation: Conversation; messages: ChatMessage[] }>(`/api/conversations/${encodeURIComponent(id)}`) }
export async function deleteConversation(id: string) { await apiFetch<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (localStorage.getItem(CONVERSATION_STORAGE_KEY) === id) startNewChat() }

export type AccountOverview = { user: User; plan: { id: string; name: string; dailyRequests: number }; usage: { requestsToday: number; remainingToday: number }; referral: { code: string; invitedCount: number; rewardedCount: number } }
export async function getAccountOverview() { return apiFetch<AccountOverview>('/api/account/overview') }
export async function getReferral() { return apiFetch<AccountOverview['referral']>('/api/referral') }
