const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  let data = null
  try { data = await response.json() } catch { /* empty response */ }
  return { response, data }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const checks = []
try {
  const health = await request('/api/health')
  assert(health.response.ok && health.data?.ok === true, `health check failed: ${health.response.status}`)
  checks.push('GET /api/health')

  const unauthorized = await request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'smoke test' }) })
  assert(unauthorized.response.status === 401, `auth guard failed: expected 401, got ${unauthorized.response.status}`)
  checks.push('POST /api/chat requires authentication')

  const ready = await request('/api/health/ready')
  assert([200, 503].includes(ready.response.status), `readiness endpoint returned unexpected status ${ready.response.status}`)
  checks.push(`GET /api/health/ready (${ready.response.status})`)

  console.log(`Smoke test passed: ${checks.join(', ')}`)
} catch (error) {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
