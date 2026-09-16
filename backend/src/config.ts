export const config = {
  port: Number(process.env.PORT ?? 3000),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  openRouterModel: process.env.OPENROUTER_MODEL ?? '',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? '*',
}

export function assertServerConfig() {
  if (!config.openRouterApiKey) {
    console.warn('OPENROUTER_API_KEY is not configured. Chat will remain unavailable until it is set.')
  }
}
