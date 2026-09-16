export const config = {
  port: Number(process.env.PORT ?? 3000),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  openRouterModel: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? '*',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'personal-ai-assistant',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'Personal AI <onboarding@resend.dev>',
  tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
  serperApiKey: process.env.SERPER_API_KEY ?? '',
  braveApiKey: process.env.BRAVE_SEARCH_API_KEY ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}

export function assertServerConfig() {
  if (!config.openRouterApiKey) {
    console.warn('OPENROUTER_API_KEY is not configured. Chat requests will return a configuration error.')
  }
  if (!config.mongoUri) console.warn('MONGODB_URI is not configured. MongoDB authentication will be unavailable.')
  if (!config.googleClientId) console.warn('GOOGLE_CLIENT_ID is not configured. Google authentication will be unavailable.')
  if (!config.sessionSecret) console.warn('SESSION_SECRET is not configured. Sessions will be unavailable.')
  if (!config.resendApiKey) console.warn('RESEND_API_KEY is not configured. Password reset emails will be unavailable.')
  if (!config.tavilyApiKey && !config.serperApiKey && !config.braveApiKey) {
    console.warn('No web search provider is configured. The assistant will answer without live web research.')
  }
}
