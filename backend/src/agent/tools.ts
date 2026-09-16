import { searchWeb, type SearchResult, type WebSearchResponse } from '../services/webSearch.js'

export type ToolPermission = 'public_read'

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string
  description: string
  permission: ToolPermission
  execute: (input: TInput) => Promise<TOutput>
}

export type WebSearchToolInput = { query: string }

export const webSearchTool: ToolDefinition<WebSearchToolInput, WebSearchResponse> = {
  name: 'web_search',
  description: 'Search public web information through Google Search for current, research, comparison, job, travel, shopping, and other information that benefits from live sources.',
  permission: 'public_read',
  execute: ({ query }) => searchWeb(query),
}

export const toolRegistry: Record<string, ToolDefinition<any, any>> = {
  [webSearchTool.name]: webSearchTool,
}

export function getTool(name: string) {
  return toolRegistry[name]
}

export function getSearchResults(response: WebSearchResponse): SearchResult[] {
  return response.results
}
