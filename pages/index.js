import { useState, useRef } from 'react'
import Head from 'next/head'

function detectTab(query) {
  const q = query.trim()
  if (/^\d{10}$/.test(q)) return 'pnr'
  if (/^\d{4,5}$/.test(q)) return 'train'
  if (/^[A-Z]{2,5}$/.test(q)) return 'station'
  if (/\d/.test(q)) return 'train'
  return 'station'
}

function getHint(query) {
  const q = query.trim()
  if (/^\d{10}$/.test(q)) return { icon: '🎫', text: 'PNR lookup' }
  if (/^\d{4,5}$/.test(q)) return { icon: '🚆', text: 'Train number' }
  if (/^[A-Z]{2,5}$/.test(q)) return { icon: '🏛️', text: 'Station code' }
  if (q.length > 2) return { icon: '🔍', text: 'Name search' }
  return null
}

const EXAMPLES = [
  { val: '12301', label: 'Howrah Raj.' },
  { val: 'NDLS', label: 'New Delhi' },
  { val: '12951', label: 'Mumbai Raj.' },
  { val: 'CSMT', label: 'Mumbai CST' },
  { val: '4501234567', label: 'PNR' },
  { val: 'MAS', label: 'Chennai' },
]

export default function Home() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('empty')
  const [resultHtml, setResultHtml] = useState('')
  const [history, setHistory] = useState([])
  const [followup, setFollowup] = useState('')
  const [fupLoading, setFupLoading] = useState(false)
  const [detectedTab, setDetectedTab] = useState(null)
  const inputRef = useRef(null)

  async function doSearch(overrideQuery) {
    const q = (overrideQuery ?? query).trim()
    if (!q || status === 'loading') return
    const tab = detectTab(q)
    setDetectedTab(tab)
    setStatus('loading')
    setResultHtml('')
    setHistory([])
    const userMsg = { role: 'user', content: q }
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [userMsg], tab }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHistory([userMsg, { role: 'assistant', content: data.reply }])
      setResultHtml(data.reply)
      setStatus('result')
    } catch (err) {
      setResultHtml(`<p class="err-msg">Error: ${err.message}</p>`)
      setStatus('result')
    }
  }

  async function doFollowup() {
    if (!followup.trim() || fupLoading) return
    setFupLoading(true)
    const userMsg = { role: 'user', content: followup.trim() }
    const newHistory = [...history, userMsg]
    setFollowup('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, tab: detectedTab }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHistory([...newHistory, { role: 'assistant', content: data.reply }])
      setResultHtml(p => p + '<div class="rt-divider"></div>' + data.reply)
    } catch (err) {
      setResultHtml(p => p + `<p class="err-msg" style="margin-top:12px">Error: ${err.message}</p>`)
    } finally {
      setFupLoading(false)
    }
  }

  const hint = getHint(query)

  return (
    <>
      <Head>
        <title>RailTrace — Indian Railways AI</title>
        <meta name="description" content="Track trains, check station boards, and look up PNR status instantly with AI." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        <div className="bg-grid" aria-hidden="true" />

        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="16" rx="2"/>
                <path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/>
              </svg>
            </div>
            <span>Rail<strong>Trace</strong></span>
          </div>
          <div className="nav-badge">
            <span className="live-dot" />
            AI · Indian Railways
          </div>
        </nav>

        {/* Hero */}
        <header className="hero">
          <div className="hero-label">Live Railway Intelligence</div>
          <h1>Track any train,<br /><span className="gradient-text">instantly.</span></h1>
          <p className="hero-sub">
            Enter a train number, station code, or 10-digit PNR — we auto-detect and fetch everything.
          </p>
        </header>

        {/* Search */}
        <main className="main">
          <div className="search-section">
            <div className={`search-card ${status === 'loading' ? 'is-loading' : ''}`}>
              <div className="search-row">
                <svg className="s-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={inputRef}
                  className="s-input"
                  type="text"
                  inputMode="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="12301 · NDLS · 4501234567 · Rajdhani…"
                  autoComplete="off"
                  spellCheck="false"
                />
                {hint && (
                  <span className="hint-pill">
                    {hint.icon} {hint.text}
                  </span>
                )}
                <button
                  className="go-btn"
                  onClick={() => doSearch()}
                  disabled={status === 'loading' || !query.trim()}
                  aria-label="Track"
                >
                  {status === 'loading'
                    ? <span className="btn-spinner" />
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  }
                </button>
              </div>
            </div>

            {status === 'empty' && (
              <div className="chips-row">
                <span className="chips-try">Try</span>
                {EXAMPLES.map(e => (
                  <button
                    key={e.val}
                    className="chip"
                    onClick={() => { setQuery(e.val); doSearch(e.val) }}
                  >
                    <span className="chip-code">{e.val}</span>
                    <span className="chip-name">{e.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {status === 'empty' && (
            <div className="empty-state">
              <div className="empty-graphic">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="16" rx="2"/>
                  <path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/>
                </svg>
              </div>
              <p className="empty-h">No query yet</p>
              <p className="empty-p">Supports train numbers, station codes &amp; PNR</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="loading-block">
              <div className="train-anim">
                <div className="train-rail" />
                <div className="train-car" />
              </div>
              <p className="loading-lbl">Fetching railway data…</p>
            </div>
          )}

          {status === 'result' && (
            <div className="result-block">
              <div className="result-body" dangerouslySetInnerHTML={{ __html: resultHtml }} />
              <div className="fup-row">
                <input
                  className="fup-input"
                  type="text"
                  value={followup}
                  onChange={e => setFollowup(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doFollowup()}
                  placeholder="Ask a follow-up — coach, delay, next stop…"
                />
                <button
                  className="fup-btn"
                  onClick={doFollowup}
                  disabled={fupLoading || !followup.trim()}
                >
                  {fupLoading
                    ? <span className="btn-spinner dark" />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
                  }
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="site-footer">
          RailTrace · Indian Railways AI · Next.js + Groq · Free forever
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #0d0d0d;
          --surface:   #161616;
          --surface2:  #1c1c1c;
          --border:    rgba(255,255,255,0.07);
          --border2:   rgba(255,255,255,0.12);
          --text:      #f0ede8;
          --text2:     #948f88;
          --text3:     #525048;
          --accent:    #e8a838;
          --accent2:   #c8872a;
          --accent-bg: rgba(232,168,56,0.1);
          --green:     #4ade80;
          --green-bg:  rgba(74,222,128,0.1);
          --red:       #f87171;
          --red-bg:    rgba(248,113,113,0.1);
          --r:         14px;
          --r-sm:      9px;
        }

        html { -webkit-text-size-adjust: 100%; }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .page {
          position: relative;
          display: flex; flex-direction: column;
          min-height: 100vh;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 30%, transparent 100%);
        }

        nav, header, main, footer { position: relative; z-index: 1; }

        /* Nav */
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0 0;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 16px; color: var(--text); letter-spacing: -0.2px;
        }
        .nav-logo strong { font-weight: 800; }
        .logo-mark {
          width: 32px; height: 32px;
          background: var(--accent-bg);
          border: 1px solid rgba(232,168,56,0.2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: var(--accent); flex-shrink: 0;
        }
        .nav-badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: var(--text3);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 11px;
          background: var(--surface);
        }
        .live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
          animation: pulse 2s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* Hero */
        .hero { padding: 52px 0 36px; }
        .hero-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: var(--accent); letter-spacing: 0.07em;
          margin-bottom: 16px;
        }
        .hero-label::before {
          content: ''; display: inline-block;
          width: 18px; height: 1px; background: var(--accent);
        }
        h1 {
          font-size: clamp(32px, 7.5vw, 58px);
          font-weight: 800; line-height: 1.08;
          letter-spacing: -1.5px; color: var(--text);
          margin-bottom: 14px;
        }
        .gradient-text {
          background: linear-gradient(120deg, var(--accent) 0%, #f5c540 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub { font-size: 15px; color: var(--text2); line-height: 1.65; max-width: 420px; }

        /* Search */
        .main { flex: 1; }
        .search-section { margin-bottom: 24px; }

        .search-card {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: var(--r);
          padding: 5px 5px 5px 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 28px rgba(0,0,0,0.45);
        }
        .search-card:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-bg), 0 2px 28px rgba(0,0,0,0.45);
        }
        .search-row { display: flex; align-items: center; gap: 8px; min-height: 46px; }
        .s-icon { color: var(--text3); flex-shrink: 0; }
        .s-input {
          flex: 1; min-width: 0;
          background: none; border: none; outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; color: var(--text);
        }
        .s-input::placeholder { color: var(--text3); }

        .hint-pill {
          display: none;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          color: var(--accent); background: var(--accent-bg);
          border: 1px solid rgba(232,168,56,0.18);
          border-radius: 20px; padding: 3px 10px;
          white-space: nowrap; flex-shrink: 0;
        }
        @media(min-width:460px){ .hint-pill { display: inline-block; } }

        .go-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; flex-shrink: 0;
          background: var(--accent); border: none; border-radius: var(--r-sm);
          color: #1a1000; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .go-btn:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }
        .go-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

        /* Chips */
        .chips-row {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: 6px; margin-top: 11px;
        }
        .chips-try { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text3); }
        .chip {
          display: flex; align-items: center; gap: 5px;
          background: none; border: 1px solid var(--border);
          border-radius: 20px; padding: 4px 10px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .chip:hover { border-color: var(--accent); background: var(--accent-bg); }
        .chip-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text); }
        .chip-name { font-size: 11px; color: var(--text3); }

        /* Empty */
        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 64px 0; }
        .empty-graphic { color: var(--border2); margin-bottom: 4px; }
        .empty-h { font-size: 14px; font-weight: 700; color: var(--text3); }
        .empty-p { font-size: 12px; color: var(--text3); opacity: 0.55; text-align: center; }

        /* Loading */
        .loading-block { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 0; }
        .train-anim { position: relative; width: 160px; height: 14px; }
        .train-rail { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: var(--border2); transform: translateY(-50%); border-radius: 2px; }
        .train-car {
          position: absolute; top: 50%; width: 40px; height: 9px;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          border-radius: 5px; transform: translateY(-50%);
          animation: trainRun 1.3s cubic-bezier(0.45,0,0.55,1) infinite;
        }
        @keyframes trainRun { 0%{left:-40px} 100%{left:160px} }
        .loading-lbl { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text3); }

        /* Spinners */
        .btn-spinner {
          display: inline-block; width: 15px; height: 15px;
          border: 2px solid rgba(26,16,0,0.25); border-top-color: #1a1000;
          border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        .btn-spinner.dark { border-color: rgba(255,255,255,0.15); border-top-color: var(--text); }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Result */
        .result-block { display: flex; flex-direction: column; }
        .result-body {
          background: var(--surface);
          border: 1px solid var(--border2); border-bottom: none;
          border-radius: var(--r) var(--r) 0 0;
          padding: 20px; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* AI-generated HTML */
        .result-body .train-header { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .result-body h2 { font-size: 19px; font-weight: 800; letter-spacing: -0.3px; color: var(--text); margin-bottom: 3px; }
        .result-body h3 { font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin: 16px 0 9px; }
        .result-body p { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .result-body .train-summary { font-size: 13px; color: var(--text2); margin-bottom: 3px; }
        .result-body .journey-details { margin-bottom: 12px; }
        .result-body .rt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 440px; }
        .result-body .rt-table th { text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: var(--text3); border-bottom: 1px solid var(--border); padding: 6px 10px; white-space: nowrap; }
        .result-body .rt-table td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,0.025); color: var(--text); white-space: nowrap; }
        .result-body .rt-table tr:last-child td { border-bottom: none; }
        .result-body .rt-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
        .result-body .status-bar { margin-top: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .result-body .rt-status-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500;
          padding: 3px 11px; border-radius: 20px;
        }
        .result-body .rt-status-pill.on-time,
        .result-body .rt-status-pill.running { background: var(--green-bg); color: var(--green); border: 1px solid rgba(74,222,128,0.12); }
        .result-body .rt-status-pill.delayed,
        .result-body .rt-status-pill.late { background: var(--red-bg); color: var(--red); border: 1px solid rgba(248,113,113,0.12); }
        .result-body .rt-divider { height: 1px; background: var(--border); margin: 18px 0; }
        .result-body .err-msg { color: var(--red); font-size: 13px; }

        /* Follow-up */
        .fup-row {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 0 0 var(--r) var(--r);
          padding: 9px 9px 9px 14px;
        }
        .fup-input {
          flex: 1; min-width: 0;
          background: none; border: none; outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; color: var(--text);
        }
        .fup-input::placeholder { color: var(--text3); }
        .fup-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; flex-shrink: 0;
          background: var(--accent); border: none; border-radius: 8px;
          color: #1a1000; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .fup-btn:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }
        .fup-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Footer */
        .site-footer {
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: var(--text3); text-align: center;
          padding: 24px 0 20px;
          border-top: 1px solid var(--border);
          margin-top: 36px;
        }

        /* ── Tablet ── */
        @media (max-width: 600px) {
          .page { padding: 0 16px; }
          h1 { font-size: clamp(28px, 8vw, 40px); }
          .hero-sub { font-size: 14px; }
        }

        /* ── Mobile ── */
        @media (max-width: 420px) {
          .page { padding: 0 14px; }
          .nav { padding-top: 14px; }
          .nav-badge { font-size: 10px; padding: 4px 9px; gap: 5px; }
          .hero { padding: 36px 0 24px; }
          h1 { font-size: 30px; letter-spacing: -1px; line-height: 1.1; }
          .hero-sub { font-size: 13px; }
          .search-card { padding: 4px 4px 4px 12px; }
          .s-input { font-size: 14px; }
          .go-btn { width: 38px; height: 38px; }
          .chip { padding: 4px 9px; }
          .chip-name { display: none; }
          .result-body { padding: 14px 12px; }
          .result-body h2 { font-size: 16px; }
          .result-body .rt-table { font-size: 11.5px; min-width: 380px; }
          .fup-row { padding: 8px 8px 8px 12px; }
          .empty-state, .loading-block { padding: 44px 0; }
        }
      `}</style>
    </>
  )
}