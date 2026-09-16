export const config = {
  port: Number(process.env.PORT ?? 3000),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  openRouterModel: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? '*',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'personal-ai-assistant',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}

export function assertServerConfig() {
  if (!config.openRouterApiKey) {
    console.warn('OPENROUTER_API_KEY is not configured. Chat requests will return a configuration error.')
  }
  if (!config.mongoUri) console.warn('MONGODB_URI is not configured. Google authentication will be unavailable.')
  if (!config.googleClientId) console.warn('GOOGLE_CLIENT_ID is not configured. Google authentication will be unavailable.')
  if (!config.sessionSecret) console.warn('SESSION_SECRET is not configured. Sessions will be unavailable.')
}
