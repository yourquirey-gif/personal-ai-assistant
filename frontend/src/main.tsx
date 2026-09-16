import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { sendChatMessage, type ChatMessage } from './api'
import './styles.css'

const suggestions = [
  'Research a topic',
  'Compare two options',
  'Help me study',
  'Find relevant jobs',
]

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    const content = input.trim()
    if (!content || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const reply = await sendChatMessage(nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function useSuggestion(text: string) {
    setInput(text)
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">PERSONAL AI ASSISTANT</p>
        <h1>Research, understand, compare.</h1>
        <p className="subtitle">
          Your web-first AI assistant for research, study, job discovery and everyday planning.
        </p>

        <div className="conversation" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <span className="message-label">{message.role === 'user' ? 'You' : 'Assistant'}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {loading && <div className="message assistant"><span className="message-label">Assistant</span><p>Thinking…</p></div>}
        </div>

        <div className="chat-box">
          <textarea
            aria-label="Ask your assistant"
            placeholder="Ask anything..."
            rows={3}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <button type="button" onClick={() => void handleSend()} disabled={loading || !input.trim()}>
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="suggestions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => useSuggestion(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
