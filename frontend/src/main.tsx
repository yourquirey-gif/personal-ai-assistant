import { StrictMode, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentUser, requestPasswordReset, resetPassword, sendChatMessage, signInWithEmail, signUpWithEmail, signOut, verifyPasswordResetOtp, type ChatMessage, type User } from './api'
import './styles.css'
import './auth.css'

type AuthMode = 'signin' | 'signup'
type AuthStep = 'auth' | 'forgot-email' | 'otp' | 'new-password'
type LegalPath = '/terms' | '/privacy' | '/cookies' | '/acceptable-use' | '/ai-disclaimer'
type AssistantPanel = 'account' | 'plan' | 'referrals' | null

const legalPages: Record<LegalPath, { title: string; sections: [string, string][] }> = {
  '/terms': { title: 'Terms of Service', sections: [['About the service', 'Personal AI Assistant is a web-based AI service for research, explanations, comparisons, planning, and related productivity use cases. Features may change as the product evolves.'], ['Acceptable use', 'Use the service lawfully. Do not use it for fraud, credential theft, malware, unauthorized access, abuse, harassment, or other harmful or illegal activity.'], ['AI-generated information', 'AI responses can be inaccurate, incomplete, outdated, or unsuitable for your situation. Verify important information independently and do not treat the service as professional advice.'], ['Accounts', 'You are responsible for activity under your account and should keep access to your account secure.'], ['Availability', 'We may change, limit, suspend, or discontinue features and may experience maintenance or outages.'], ['Intellectual property', 'The service, interface, branding, software, and original materials are protected by applicable intellectual-property laws.']] },
  '/privacy': { title: 'Privacy Policy', sections: [['Information we collect', 'Depending on the features you use, we may process your name, email address, profile picture, prompts, conversations, technical information, and security logs.'], ['How we use information', 'Information may be used to provide accounts and AI features, secure the service, prevent abuse, troubleshoot issues, improve reliability, and comply with law.'], ['AI providers', 'Content needed to generate an AI response may be sent from our backend to the configured AI provider. API credentials remain server-side.'], ['Retention and deletion', 'We aim to retain information only as reasonably necessary for the relevant purpose, security, service operation, or legal requirements.'], ['Security', 'We use reasonable safeguards, but no internet service can guarantee absolute security. Never submit passwords, private keys, or other secrets to the assistant.']] },
  '/cookies': { title: 'Cookie Policy', sections: [['Essential cookies', 'The authentication system uses an HTTP-only session cookie so the browser can remain signed in without exposing the session token to page scripts.'], ['Other storage', 'The site may use browser storage for non-sensitive interface preferences.'], ['Managing cookies', 'You can control cookies through browser settings. Blocking essential cookies can prevent sign-in from working.'], ['Changes', 'This policy may be updated when authentication, analytics, or other website technologies change.']] },
  '/acceptable-use': { title: 'Acceptable Use Policy', sections: [['Allowed use', 'Use the assistant for legitimate research, learning, writing, planning, comparison, job research, and other lawful activities.'], ['Prohibited use', 'Do not use the service for fraud, phishing, credential theft, malware, unauthorized access, harassment, evasion of security controls, or illegal activity.'], ['Abuse prevention', 'We may apply rate limits, safeguards, account restrictions, or other measures to protect users and infrastructure.']] },
  '/ai-disclaimer': { title: 'AI Disclaimer', sections: [['AI can make mistakes', 'AI-generated output may contain factual errors, hallucinations, missing context, incorrect calculations, or outdated information.'], ['Verify important information', 'For important decisions, independently verify facts using reliable primary or authoritative sources.'], ['High-impact decisions', 'Do not rely on the assistant alone for medical, legal, financial, safety-critical, employment, or other high-impact professional decisions.'], ['Your responsibility', 'You remain responsible for how you use generated content and for checking that it is appropriate for your situation.']] },
}

function Logo() { return <a className="brand" href="/" aria-label="Personal AI Assistant home"><span className="brand-mark">✦</span><span>Personal AI</span></a> }

function GoogleUnavailable() {
  return <div className="google-unavailable" aria-disabled="true"><div className="google-unavailable-inner"><span className="google-g-mark">G</span><span>Google</span></div><strong>Not available right now</strong></div>
}

function AuthModal({ mode, onClose, onSwitch, onSuccess }: { mode: AuthMode; onClose: () => void; onSwitch: (mode: AuthMode) => void; onSuccess: (user: User) => void }) {
  const [step, setStep] = useState<AuthStep>('auth')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const handleSuccess = (user: User) => { onSuccess(user); onClose() }

  async function submitAuth(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try { const user = mode === 'signup' ? await signUpWithEmail(name, email, password) : await signInWithEmail(email, password); handleSuccess(user) }
    catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed.') } finally { setLoading(false) }
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try { const result = await requestPasswordReset(email); setMessage(result.message); setStep('otp') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to send the reset code.') } finally { setLoading(false) }
  }

  async function resendOtp() {
    setError(''); setMessage(''); setResending(true)
    try { const result = await requestPasswordReset(email); setMessage(result.message) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to resend the reset code.') } finally { setResending(false) }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { setResetToken(await verifyPasswordResetOtp(email, otp)); setStep('new-password') }
    catch (e) { setError(e instanceof Error ? e.message : 'Invalid or expired code.') } finally { setLoading(false) }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try { const result = await resetPassword(email, resetToken, newPassword); setMessage(result.message); setPassword(''); setNewPassword(''); setOtp(''); setStep('auth'); onSwitch('signin') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update the password.') } finally { setLoading(false) }
  }

  const title = step === 'forgot-email' ? 'Forgot your password?' : step === 'otp' ? 'Enter your reset code' : step === 'new-password' ? 'Create a new password' : mode === 'signin' ? 'Welcome back' : 'Create your account'
  const subtitle = step === 'forgot-email' ? 'We’ll send a one-time code to your email.' : step === 'otp' ? `Enter the 6-digit code sent to ${email}.` : step === 'new-password' ? 'Choose a strong password with at least 8 characters.' : mode === 'signin' ? 'Sign in to your Personal AI workspace.' : 'Create your Personal AI account in seconds.'

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button><div className="auth-icon">✦</div><p className="eyebrow">SECURE ACCOUNT</p><h2 id="auth-title">{title}</h2><p className="auth-subtitle">{subtitle}</p>
    {step === 'auth' && <><form className="auth-form" onSubmit={submitAuth}>{mode === 'signup' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required />}<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" autoComplete="email" required /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /><button className="auth-primary" type="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button></form>{mode === 'signin' && <button className="forgot-link" type="button" onClick={() => { setStep('forgot-email'); setError(''); setMessage('') }}>Forgot password?</button>}<div className="auth-divider"><span>or continue with</span></div><GoogleUnavailable /><button className="auth-switch" type="button" onClick={() => onSwitch(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Sign up' : 'Already have an account? Sign in'}</button></>}
    {step === 'forgot-email' && <form className="auth-form" onSubmit={sendOtp}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" autoComplete="email" required /><button className="auth-primary" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button><button className="auth-back" type="button" onClick={() => setStep('auth')}>Back to sign in</button></form>}
    {step === 'otp' && <form className="auth-form" onSubmit={verifyOtp}><input className="otp-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /><button className="auth-primary" type="submit" disabled={loading || otp.length !== 6}>{loading ? 'Verifying…' : 'Verify code'}</button><button className="auth-resend" type="button" onClick={() => void resendOtp()} disabled={resending || loading}>{resending ? 'Resending…' : 'Resend code'}</button><button className="auth-back" type="button" onClick={() => setStep('forgot-email')}>Use another email</button></form>}
    {step === 'new-password' && <form className="auth-form" onSubmit={updatePassword}><input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" type="password" autoComplete="new-password" minLength={8} required /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm new password" type="password" autoComplete="new-password" minLength={8} required /><button className="auth-primary" type="submit" disabled={loading || newPassword !== password}>{loading ? 'Updating…' : 'Update password'}</button></form>}
    {error && <p className="auth-error">{error}</p>}{message && <p className="auth-success">{message}</p>}<p className="auth-terms">By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p></div></div>
}

function Footer() { return <footer className="footer"><div><Logo /><p>Research. Understand. Compare. Get things done.</p></div><nav aria-label="Legal"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/acceptable-use">Acceptable Use</a><a href="/ai-disclaimer">AI Disclaimer</a></nav><span>© 2026 Personal AI Assistant</span></footer> }
function LegalPage({ path }: { path: LegalPath }) { const page = legalPages[path]; return <div className="site-page"><header className="site-header"><Logo /><a className="text-button" href="/">Back to home</a></header><main className="legal-content"><p className="eyebrow">LEGAL</p><h1>{page.title}</h1><p className="legal-updated">Last updated: September 16, 2026</p><div className="legal-card">{page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div><p className="legal-note">These are MVP policy drafts. Review them with qualified counsel before a public commercial launch.</p></main><Footer /></div> }
function LandingPage({ user, onAuth, onAssistant, onLogout }: { user: User | null; onAuth: (mode: AuthMode) => void; onAssistant: () => void; onLogout: () => void }) { return <div className="landing"><header className="site-header landing-header"><Logo /><nav className="desktop-nav"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#use-cases">Use cases</a></nav><div className="header-actions">{user ? <><button className="user-chip" onClick={onAssistant}>{user.picture && <img src={user.picture} alt="" />}{user.name}</button><button className="signin-button" onClick={onLogout}>Sign out</button></> : <><button className="signin-button" onClick={() => onAuth('signin')}>Sign in</button><button className="signup-button" onClick={() => onAuth('signup')}>Sign up</button></>}</div></header><main><section className="hero-section"><div className="hero-glow glow-one" /><div className="hero-glow glow-two" /><div className="hero-copy"><div className="status-pill"><span /> Built for thoughtful work</div><h1>Your AI assistant for <span>real work.</span></h1><p>Research ideas, understand complex topics, compare your options, and turn questions into clear next steps — all in one focused workspace.</p><div className="hero-actions"><button className="primary-cta" onClick={onAssistant}>Try the assistant <span>→</span></button><a className="secondary-cta" href="#features">Explore features</a></div><div className="trust-row"><span>Research</span><i /><span>Study</span><i /><span>Jobs</span><i /><span>Planning</span></div></div><div className="hero-preview"><div className="preview-top"><span className="preview-dot" /><span>Personal AI</span><span className="preview-status">Ready</span></div><div className="preview-question"><span>You</span><p>Compare two career paths and show me the key trade-offs.</p></div><div className="preview-answer"><span>AI ASSISTANT</span><p>Absolutely. I’ll structure the comparison around skills, time to qualify, opportunities, costs, and practical next steps.</p><div className="preview-tags"><b>Research</b><b>Compare</b><b>Next steps</b></div></div></div></section><section className="section" id="features"><div className="section-heading"><p className="eyebrow">ONE WORKSPACE</p><h2>Less searching. More understanding.</h2><p>Designed around the way people actually work: ask, explore, compare, and decide what to do next.</p></div><div className="feature-grid">{[['⌕','Research','Turn a question into a clear research starting point.'],['◇','Understand','Break down difficult topics into simple explanations.'],['⇄','Compare','Put options side by side and see the trade-offs.'],['✓','Get organized','Turn goals and tasks into practical next steps.']].map(([icon,title,text]) => <article className="feature-card" key={title}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="section split-section" id="how-it-works"><div><p className="eyebrow">HOW IT WORKS</p><h2>From a rough question to a useful answer.</h2><p className="section-copy">The assistant helps you move from uncertainty to a clearer plan without making the workflow complicated.</p></div><div className="steps"><div><b>01</b><span><strong>Ask naturally</strong><small>English, Hindi, or Hinglish.</small></span></div><div><b>02</b><span><strong>Explore and understand</strong><small>Get structured explanations and comparisons.</small></span></div><div><b>03</b><span><strong>Take the next step</strong><small>Turn the answer into a practical plan.</small></span></div></div></section><section className="section use-case-section" id="use-cases"><div className="section-heading"><p className="eyebrow">BUILT FOR EVERYDAY WORK</p><h2>Useful across the things that matter.</h2></div><div className="use-case-grid"><div><span>01</span><h3>Study & research</h3><p>Understand chapters, explore topics, and create revision plans.</p></div><div><span>02</span><h3>Career & jobs</h3><p>Research roles, compare paths, and organize requirements.</p></div><div><span>03</span><h3>Everyday planning</h3><p>Break down goals, decisions, errands, and personal projects.</p></div></div></section><section className="final-cta"><p className="eyebrow">START WITH A QUESTION</p><h2>Make your next question useful.</h2><p>Open the assistant and start a focused conversation.</p><button className="primary-cta" onClick={onAssistant}>Open Personal AI <span>→</span></button></section></main><Footer /></div> }

function AssistantMenu({ user, onClose, onNewChat, onPanel, onLogout }: { user: User; onClose: () => void; onNewChat: () => void; onPanel: (panel: Exclude<AssistantPanel, null>) => void; onLogout: () => void }) {
  return <>
    <div className="assistant-menu-backdrop" onClick={onClose} />
    <aside className="assistant-menu" aria-label="Assistant menu">
      <div className="assistant-menu-head"><div className="assistant-menu-brand"><span className="brand-mark">✦</span><div><strong>Personal AI</strong><small>Workspace</small></div></div><button className="menu-close" onClick={onClose} aria-label="Close menu">×</button></div>
      <button className="menu-new-chat" onClick={onNewChat}><span>＋</span> New chat</button>
      <nav className="menu-nav">
        <button onClick={onNewChat}><span>⌕</span><div><strong>Research</strong><small>Search and understand</small></div></button>
        <button onClick={onNewChat}><span>◇</span><div><strong>Study & research</strong><small>Learn and revise</small></div></button>
        <button onClick={onNewChat}><span>⇄</span><div><strong>Compare</strong><small>Explore trade-offs</small></div></button>
        <button onClick={onNewChat}><span>✓</span><div><strong>Planning</strong><small>Organize next steps</small></div></button>
      </nav>
      <div className="menu-divider" />
      <div className="menu-label">ACCOUNT</div>
      <nav className="menu-nav menu-account">
        <button onClick={() => onPanel('account')}><span>◉</span><div><strong>Account</strong><small>{user.email}</small></div></button>
        <button onClick={() => onPanel('plan')}><span>◇</span><div><strong>Plan</strong><small>Free plan</small></div></button>
        <button onClick={() => onPanel('referrals')}><span>↗</span><div><strong>Refer & earn</strong><small>Invite friends</small></div></button>
      </nav>
      <div className="menu-spacer" />
      <div className="menu-profile"><div className="menu-avatar">{user.picture ? <img src={user.picture} alt="" /> : <span>{user.name.charAt(0).toUpperCase()}</span>}</div><div className="menu-profile-copy"><strong>{user.name}</strong><small>Signed in</small></div><button onClick={onLogout}>Sign out</button></div>
    </aside>
  </>
}

function AssistantPanel({ type, user, onClose }: { type: Exclude<AssistantPanel, null>; user: User; onClose: () => void }) {
  const content = type === 'account'
    ? { title: 'Account', eyebrow: 'YOUR PROFILE', body: <><div className="account-profile"><div className="account-avatar">{user.picture ? <img src={user.picture} alt="" /> : <span>{user.name.charAt(0).toUpperCase()}</span>}</div><div><h3>{user.name}</h3><p>{user.email}</p></div></div><div className="panel-list"><div><span>Account type</span><strong>Email account</strong></div><div><span>Security</span><strong>Password protected</strong></div></div></> }
    : type === 'plan'
      ? { title: 'Your plan', eyebrow: 'PLAN & USAGE', body: <><div className="plan-card"><div><span>Current plan</span><strong>Free</strong></div><b>ACTIVE</b></div><div className="panel-list"><div><span>AI assistant</span><strong>Available</strong></div><div><span>Web research</span><strong>Available when configured</strong></div><div><span>Billing</span><strong>No payment required for MVP</strong></div></div><p className="panel-note">Paid plans and billing will be added later. Nothing is charged from this screen.</p></> }
      : { title: 'Refer & earn', eyebrow: 'REFERRAL PROGRAM', body: <><div className="referral-card"><span>↗</span><h3>Invite people to Personal AI</h3><p>Referral rewards are being prepared. Your referral dashboard will appear here when the program launches.</p></div><button className="panel-secondary" disabled>Referral link coming soon</button></> }
  return <div className="panel-backdrop" onMouseDown={onClose}><section className="assistant-panel-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true"><button className="panel-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">{content.eyebrow}</p><h2>{content.title}</h2>{content.body}</section></div>
}

function AssistantPage({ user, onHome, onLogout }: { user: User; onHome: () => void; onLogout: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [panel, setPanel] = useState<AssistantPanel>(null)

  async function handleSend() {
    const content = input.trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next); setInput(''); setError(''); setLoading(true)
    try { const reply = await sendChatMessage(next); setMessages([...next, { role: 'assistant', content: reply }]) }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
    finally { setLoading(false) }
  }

  const newChat = () => { setMessages([]); setInput(''); setError(''); setMenuOpen(false) }

  return <main className="assistant-shell">
    <header className="assistant-header">
      <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><i /><i /><i /></button>
      <button className="brand-button" onClick={onHome}><span className="brand-mark">✦</span><span>Personal AI</span></button>
      <div className="assistant-header-right"><button className="header-new-chat" onClick={newChat}>＋ New chat</button>{user.picture ? <img className="header-avatar" src={user.picture} alt="" /> : <span className="header-avatar-fallback">{user.name.charAt(0).toUpperCase()}</span>}</div>
    </header>
    <section className="assistant-main">
      <div className="assistant-intro"><p className="eyebrow">PERSONAL AI</p><h1>{messages.length ? 'Keep going.' : 'What can I help you with?'}</h1><p>Research, understand, compare, and plan — all from one conversation.</p></div>
      <div className="conversation">{messages.length === 0 && <div className="empty-chat"><span>✦</span><p>Ask your first question to get started.</p><div className="quick-prompts"><button onClick={() => setInput('Research the latest important news today')}>Latest news</button><button onClick={() => setInput('Explain this topic simply')}>Explain a topic</button><button onClick={() => setInput('Compare two options for me')}>Compare options</button></div></div>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`message ${message.role}`}><span className="message-label">{message.role === 'user' ? 'You' : 'Assistant'}</span><p>{message.content}</p></div>)}{loading && <div className="message assistant"><span className="message-label">Assistant</span><p>Thinking…</p></div>}</div>
      <div className="chat-box"><textarea aria-label="Ask your assistant" placeholder="Ask anything…" rows={3} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }} /><div className="composer-row"><span>Enter to send · Shift + Enter for new line</span><button type="button" onClick={() => void handleSend()} disabled={loading || !input.trim()}>{loading ? 'Thinking…' : 'Send'}</button></div></div>
      {error && <p className="error-message">{error}</p>}
    </section>
    {menuOpen && <AssistantMenu user={user} onClose={() => setMenuOpen(false)} onNewChat={newChat} onPanel={(next) => { setMenuOpen(false); setPanel(next) }} onLogout={onLogout} />}
    {panel && <AssistantPanel type={panel} user={user} onClose={() => setPanel(null)} />}
  </main>
}

function App() { const [user, setUser] = useState<User | null>(null); const [authMode, setAuthMode] = useState<AuthMode | null>(null); const [path, setPath] = useState(window.location.pathname); useEffect(() => { void getCurrentUser().then(setUser) }, []); useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, []); const openAssistant = () => { if (!user) { setAuthMode('signin'); return }; window.history.pushState({}, '', '/assistant'); setPath('/assistant') }; const home = () => { window.history.pushState({}, '', '/'); setPath('/') }; const logout = async () => { await signOut(); setUser(null); home() }; if (path in legalPages) return <LegalPage path={path as LegalPath} />; if (path === '/assistant' && user) return <AssistantPage user={user} onHome={home} onLogout={logout} />; return <><LandingPage user={user} onAuth={setAuthMode} onAssistant={openAssistant} onLogout={logout} />{authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} onSuccess={setUser} />}</> }
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
