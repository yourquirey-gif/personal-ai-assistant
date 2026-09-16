import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">PERSONAL AI ASSISTANT</p>
        <h1>Research, understand, compare.</h1>
        <p className="subtitle">
          Your web-first AI assistant for research, study, job discovery and everyday planning.
        </p>
        <div className="chat-box">
          <textarea
            aria-label="Ask your assistant"
            placeholder="Ask anything..."
            rows={3}
          />
          <button type="button">Start a conversation</button>
        </div>
        <div className="suggestions">
          <button type="button">Research a topic</button>
          <button type="button">Compare options</button>
          <button type="button">Help me study</button>
          <button type="button">Find relevant jobs</button>
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
