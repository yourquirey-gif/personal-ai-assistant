import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { sendChatMessage, type ChatMessage } from './api'
import './styles.css'

const suggestions = [
  'Research a topic',
  'Compare two options',
  'Help me study',
  'Find relevant jobs',
]

const legalPages = {
  '/terms': {
    title: 'Terms of Service',
    updated: 'September 16, 2026',
    sections: [
      ['1. About the service', 'Personal AI Assistant is a web-based AI assistant designed to help users research information, understand topics, compare options, and organize everyday tasks. The service is currently evolving and features may change during development.'],
      ['2. Acceptable use', 'You may use the service only for lawful purposes. Do not use it to violate another person’s rights, create harmful or deceptive content, abuse the service, bypass security controls, or interfere with the service or its infrastructure.'],
      ['3. AI-generated information', 'Responses may be incomplete, inaccurate, outdated, or unsuitable for your particular situation. You are responsible for reviewing important information and making your own decisions. The assistant is not a substitute for professional legal, medical, financial, employment, or other specialized advice.'],
      ['4. Accounts', 'If account registration is enabled, you are responsible for keeping your account credentials secure and for activity under your account. Do not provide credentials to other people.'],
      ['5. Availability and changes', 'We may add, remove, suspend, or change features, limits, models, integrations, or availability. We may also perform maintenance or experience outages.'],
      ['6. Intellectual property', 'The service, interface, branding, software, and original materials are protected by applicable intellectual-property laws. You may not copy or redistribute the service itself without permission.'],
      ['7. Disclaimer and limitation', 'The service is provided on an “as is” and “as available” basis to the extent permitted by law. To the extent permitted by applicable law, we are not responsible for decisions or losses arising solely from reliance on AI-generated output.'],
      ['8. Contact', 'Before public launch, publish the project’s official support/legal contact information here for questions about these terms.'],
    ],
  },
  '/privacy': {
    title: 'Privacy Policy',
    updated: 'September 16, 2026',
    sections: [
      ['1. Information we may receive', 'Depending on the features enabled, we may receive information you provide directly, such as account details, prompts, messages, feedback, and support requests. Technical information such as browser, device, IP address, timestamps, and error logs may also be processed for security and reliability.'],
      ['2. How information is used', 'Information may be used to provide and secure the service, respond to requests, maintain reliability, prevent abuse, troubleshoot problems, improve the product, and comply with legal obligations.'],
      ['3. AI providers and service providers', 'When you use AI features, the content needed to generate a response may be sent to the configured AI provider through our backend. API credentials are intended to remain server-side and are not exposed to the browser.'],
      ['4. Retention', 'Retention periods depend on the feature and technical requirements. We aim to keep information only for as long as reasonably necessary for the stated purpose or as required by law.'],
      ['5. Your choices', 'Where applicable, you may request access, correction, deletion, or information about processing. Some requests may be limited by legal, security, or technical requirements.'],
      ['6. Security', 'We use reasonable technical and organizational safeguards, but no internet service can guarantee absolute security. Do not submit passwords, private keys, financial credentials, or other highly sensitive secrets to the assistant.'],
      ['7. Children', 'The service is not designed to knowingly collect personal information from children in violation of applicable law.'],
      ['8. Contact', 'Before public launch, publish the project’s official privacy contact information here for privacy requests.'],
    ],
  },
  '/cookies': {
    title: 'Cookie Policy',
    updated: 'September 16, 2026',
    sections: [
      ['1. What cookies are', 'Cookies are small pieces of data stored by a website or browser. Similar technologies may be used for preferences, security, sessions, analytics, and reliability.'],
      ['2. How we may use them', 'The service may use essential storage or cookies to keep the application working, remember preferences, protect sessions, and understand technical errors. Optional analytics or marketing technologies should only be enabled when configured and legally appropriate.'],
      ['3. Managing cookies', 'You can control or delete cookies through your browser settings. Blocking essential storage may cause some features to stop working.'],
      ['4. Changes', 'This policy may be updated when the website adds or changes cookie or analytics technologies.'],
    ],
  },
  '/acceptable-use': {
    title: 'Acceptable Use Policy',
    updated: 'September 16, 2026',
    sections: [
      ['1. Allowed use', 'Use the assistant for legitimate research, learning, writing, planning, comparison, job research, and other lawful personal or professional activities.'],
      ['2. Prohibited use', 'Do not use the service for fraud, credential theft, harassment, malware, unauthorized access, evasion of security controls, illegal activity, or requests that meaningfully facilitate harm.'],
      ['3. Abuse prevention', 'We may apply rate limits, usage limits, automated safeguards, or account restrictions to protect users and infrastructure.'],
      ['4. Reporting abuse', 'If you discover a security or abuse issue, use the official support/security contact published by the project before public launch.'],
    ],
  },
  '/ai-disclaimer': {
    title: 'AI Disclaimer',
    updated: 'September 16, 2026',
    sections: [
      ['1. AI can make mistakes', 'AI-generated responses can contain factual errors, missing context, hallucinations, incorrect calculations, or outdated information. A confident answer is not proof that the answer is correct.'],
      ['2. Verify important information', 'For important decisions, independently verify facts using reliable primary or authoritative sources. Research features may help you find information but do not guarantee completeness.'],
      ['3. Professional decisions', 'Do not rely on the assistant alone for medical, legal, financial, safety-critical, employment, or other high-impact professional decisions.'],
      ['4. User responsibility', 'You remain responsible for how you use generated content and for checking that it is appropriate for your situation.'],
    ],
  },
} as const

type LegalPath = keyof typeof legalPages

type AuthMode = 'signin' | 'signup'

function Logo() {
  return (
    <a className="brand" href="/" aria-label="Personal AI Assistant home">
      <span className="brand-mark">✦</span>
      <span>Personal AI</span>
    </a>
  )
}

function AuthModal({ mode, onClose, onSwitch }: { mode: AuthMode; onClose: () => void; onSwitch: (mode: AuthMode) => void }) {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="auth-icon">✦</div>
        <p className="eyebrow">PERSONAL AI</p>
        <h2 id="auth-title">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-subtitle">{mode === 'signin' ? 'Sign in to continue your workspace.' : 'Start your personal AI workspace.'}</p>
        {submitted ? (
          <div className="auth-notice">Authentication UI is ready. Account creation and sign-in will be connected to the secure backend in the next development step.</div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }}>
            {mode === 'signup' && <label>Name<input required type="text" placeholder="Your name" /></label>}
            <label>Email<input required type="email" placeholder="you@example.com" /></label>
            <label>Password<input required minLength={8} type="password" placeholder="At least 8 characters" /></label>
            <button className="primary-button" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          </form>
        )}
        <button className="auth-switch" type="button" onClick={() => { setSubmitted(false); onSwitch(mode === 'signin' ? 'signup' : 'signin') }}>
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

function LegalPage({ path, onHome }: { path: LegalPath; onHome: () => void }) {
  const page = legalPages[path]
  return (
    <div className="site-page">
      <header className="site-header"><Logo /><button className="text-button" onClick={onHome}>Back to home</button></header>
      <main className="legal-content">
        <p className="eyebrow">LEGAL</p>
        <h1>{page.title}</h1>
        <p className="legal-updated">Last updated: {page.updated}</p>
        <div className="legal-card">
          {page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
        </div>
        <p className="legal-note">These pages are product-policy drafts for the current MVP and are not legal advice. Review them with qualified counsel before a public commercial launch.</p>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div><Logo /><p>Research. Understand. Compare. Get things done.</p></div>
      <nav aria-label="Legal"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/acceptable-use">Acceptable Use</a><a href="/ai-disclaimer">AI Disclaimer</a></nav>
      <span>© 2026 Personal AI Assistant</span>
    </footer>
  )
}

function LandingPage({ onAuth, onAssistant }: { onAuth: (mode: AuthMode) => void; onAssistant: () => void }) {
  const features = [
    ['⌕', 'Research', 'Turn a question into a clear research starting point and discover useful information.'],
    ['◇', 'Understand', 'Break down difficult topics into simple, structured explanations.'],
    ['⇄', 'Compare', 'Put options side by side so trade-offs are easier to see.'],
    ['✓', 'Get organized', 'Turn everyday ideas, study goals, and tasks into practical next steps.'],
  ]
  return (
    <div className="landing">
      <header className="site-header landing-header">
        <Logo />
        <nav className="desktop-nav"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#use-cases">Use cases</a></nav>
        <div className="header-actions"><button className="signin-button" onClick={() => onAuth('signin')}>Sign in</button><button className="signup-button" onClick={() => onAuth('signup')}>Sign up</button></div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
          <div className="hero-copy">
            <div className="status-pill"><span /> Built for thoughtful work</div>
            <h1>Your AI assistant for <span>real work.</span></h1>
            <p>Research ideas, understand complex topics, compare your options, and turn questions into clear next steps — all in one focused workspace.</p>
            <div className="hero-actions"><button className="primary-cta" onClick={onAssistant}>Try the assistant <span>→</span></button><a className="secondary-cta" href="#features">Explore features</a></div>
            <div className="trust-row"><span>Research</span><i /> <span>Study</span><i /> <span>Jobs</span><i /> <span>Planning</span></div>
          </div>
          <div className="hero-preview" aria-hidden="true">
            <div className="preview-top"><span className="preview-dot" /><span>Personal AI</span><span className="preview-status">Ready</span></div>
            <div className="preview-question"><span>You</span><p>Compare two career paths and show me the key trade-offs.</p></div>
            <div className="preview-answer"><span>AI ASSISTANT</span><p>Absolutely. I’ll structure the comparison around skills, time to qualify, opportunities, costs, and practical next steps.</p><div className="preview-tags"><b>Research</b><b>Compare</b><b>Next steps</b></div></div>
          </div>
        </section>

        <section className="section" id="features"><div className="section-heading"><p className="eyebrow">ONE WORKSPACE</p><h2>Less searching. More understanding.</h2><p>Designed around the way people actually work: ask, explore, compare, and decide what to do next.</p></div><div className="feature-grid">{features.map(([icon, title, text]) => <article className="feature-card" key={title}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}</div></section>

        <section className="section split-section" id="how-it-works"><div><p className="eyebrow">HOW IT WORKS</p><h2>From a rough question to a useful answer.</h2><p className="section-copy">The assistant is built to help you move from uncertainty to a clearer plan without making the workflow complicated.</p></div><div className="steps"><div><b>01</b><span><strong>Ask naturally</strong><small>Type what you need in English, Hindi, or Hinglish.</small></span></div><div><b>02</b><span><strong>Explore and understand</strong><small>Get structured explanations, research directions, and comparisons.</small></span></div><div><b>03</b><span><strong>Take the next step</strong><small>Turn the answer into a practical plan you can act on.</small></span></div></div></section>

        <section className="section use-case-section" id="use-cases"><div className="section-heading"><p className="eyebrow">BUILT FOR EVERYDAY WORK</p><h2>Useful across the things that matter.</h2></div><div className="use-case-grid"><div><span>01</span><h3>Study & research</h3><p>Understand chapters, explore topics, create revision plans, and prepare better questions.</p></div><div><span>02</span><h3>Career & jobs</h3><p>Research roles, compare paths, organize requirements, and prepare your next move.</p></div><div><span>03</span><h3>Everyday planning</h3><p>Break down goals, decisions, errands, and personal projects into manageable steps.</p></div></div></section>

        <section className="final-cta"><p className="eyebrow">START WITH A QUESTION</p><h2>Make your next question useful.</h2><p>Open the assistant and see where the conversation takes you.</p><button className="primary-cta" onClick={onAssistant}>Open Personal AI <span>→</span></button></section>
      </main>
      <Footer />
    </div>
  )
}

function AssistantPage({ onHome }: { onHome: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    const content = input.trim()
    if (!content || loading) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages); setInput(''); setError(''); setLoading(true)
    try {
      const reply = await sendChatMessage(nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  return <main className="assistant-shell"><header className="assistant-header"><button className="brand-button" onClick={onHome}><span className="brand-mark">✦</span> Personal AI</button><span className="assistant-badge">AI ASSISTANT</span></header><section className="assistant-panel"><p className="eyebrow">PERSONAL AI ASSISTANT</p><h1>What can I help you with?</h1><p className="subtitle">Research, understand, compare, and plan.</p><div className="conversation" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`message ${message.role}`}><span className="message-label">{message.role === 'user' ? 'You' : 'Assistant'}</span><p>{message.content}</p></div>)}{loading && <div className="message assistant"><span className="message-label">Assistant</span><p>Thinking…</p></div>}</div><div className="chat-box"><textarea aria-label="Ask your assistant" placeholder="Ask anything..." rows={3} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend() } }} /><button type="button" onClick={() => void handleSend()} disabled={loading || !input.trim()}>{loading ? 'Thinking…' : 'Send'}</button></div>{error && <p className="error-message">{error}</p>}<div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div></section></main>
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(nextPath: string) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (path === '/assistant') return <AssistantPage onHome={() => navigate('/')} />
  if (path in legalPages) return <LegalPage path={path as LegalPath} onHome={() => navigate('/')} />
  return <><LandingPage onAuth={setAuthMode} onAssistant={() => navigate('/assistant')} />{authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />}</>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
