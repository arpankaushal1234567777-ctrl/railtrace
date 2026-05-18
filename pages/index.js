import { useState, useRef } from 'react'
import Head from 'next/head'

function detectTab(query) {
  const q = query.trim()
  // PNR: 10 digits
  if (/^\d{10}$/.test(q)) return 'pnr'
  // Train number: 4-5 digits
  if (/^\d{4,5}$/.test(q)) return 'train'
  // Station codes: 2-5 uppercase letters
  if (/^[A-Z]{2,5}$/.test(q)) return 'station'
  // If it looks like a name with numbers it's likely a train
  if (/\d/.test(q)) return 'train'
  // Default: station name lookup
  return 'station'
}

function getHint(query) {
  const q = query.trim()
  if (/^\d{10}$/.test(q)) return '🎫 Detected: PNR lookup'
  if (/^\d{4,5}$/.test(q)) return '🚆 Detected: Train number'
  if (/^[A-Z]{2,5}$/.test(q)) return '🏛️ Detected: Station code'
  if (q.length > 2) return '🔍 Detected: Name search'
  return null
}

const EXAMPLES = [
  { val: '12301', label: 'Howrah Rajdhani' },
  { val: 'NDLS', label: 'New Delhi Station' },
  { val: 'CSMT', label: 'Mumbai CST' },
  { val: '4501234567', label: 'Sample PNR' },
  { val: '12951', label: 'Mumbai Rajdhani' },
  { val: 'MAS', label: 'Chennai Central' },
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

  function handleInput(val) {
    setQuery(val)
  }

  async function doSearch(overrideQuery) {
    const q = (overrideQuery ?? query).trim()
    if (!q || status === 'loading') return
    const tab = detectTab(q)
    setDetectedTab(tab)
    setStatus('loading')
    setResultHtml('')
    setHistory([])

    const userMsg = { role: 'user', content: q }
    const msgs = [userMsg]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, tab }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHistory([userMsg, { role: 'assistant', content: data.reply }])
      setResultHtml(data.reply)
      setStatus('result')
    } catch (err) {
      setResultHtml(`<p style="color:#ef4444;font-size:13px;padding:16px 0">Error: ${err.message}</p>`)
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
      setResultHtml(p => p + '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0"/>' + data.reply)
    } catch (err) {
      setResultHtml(p => p + `<p style="color:#ef4444;margin-top:12px;font-size:13px;">Error: ${err.message}</p>`)
    } finally {
      setFupLoading(false)
    }
  }

  const hint = getHint(query)

  return (
    <>
      <Head>
        <title>RailTrace — Indian Railways AI Tracker</title>
        <meta name="description" content="Track trains, check station boards, and look up PNR status instantly with AI." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="16" rx="2"/>
              <path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/>
            </svg>
            Rail<em>Trace</em>
          </div>
          <span className="nav-tag">Indian Railways · AI</span>
        </nav>

        {/* Hero */}
        <header className="hero">
          <p className="hero-eyebrow">↳ Live Railway Intelligence</p>
          <h1>Track any train,<br /><em>instantly.</em></h1>
          <p className="hero-sub">Enter a train number, station code, or 10-digit PNR — we'll figure out the rest.</p>
        </header>

        {/* Search */}
        <main className="main">
          <div className="search-wrap">
            <div className={`search-box ${status === 'loading' ? 'loading' : ''}`}>
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                value={query}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="12301 · NDLS · 4501234567 · Rajdhani..."
                autoComplete="off"
                spellCheck="false"
              />
              {hint && <span className="detect-badge">{hint}</span>}
              <button
                className="track-btn"
                onClick={() => doSearch()}
                disabled={status === 'loading' || !query.trim()}
              >
                {status === 'loading' ? (
                  <span className="spinner" />
                ) : (
                  <>
                    Track
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Example chips */}
            {status === 'empty' && (
              <div className="chips">
                <span className="chips-label">Try</span>
                {EXAMPLES.map(e => (
                  <button
                    key={e.val}
                    className="chip"
                    onClick={() => { setQuery(e.val); doSearch(e.val) }}
                  >
                    <span className="chip-val">{e.val}</span>
                    <span className="chip-label">{e.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {status === 'empty' && (
            <div className="empty">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="16" rx="2"/>
                  <path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/>
                </svg>
              </div>
              <p className="empty-title">No query yet</p>
              <p className="empty-sub">Search auto-detects trains, stations & PNRs</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="loading-state">
              <div className="rail-loader">
                <div className="rail-track" />
                <div className="rail-train" />
              </div>
              <p className="loading-text">Fetching railway data…</p>
            </div>
          )}

          {status === 'result' && (
            <div className="result-wrap">
              <div className="result-content" dangerouslySetInnerHTML={{ __html: resultHtml }} />
              <div className="followup-bar">
                <input
                  className="followup-input"
                  type="text"
                  value={followup}
                  onChange={e => setFollowup(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doFollowup()}
                  placeholder="Ask a follow-up — coach, delay, next stop…"
                />
                <button
                  className="send-btn"
                  onClick={doFollowup}
                  disabled={fupLoading || !followup.trim()}
                >
                  {fupLoading
                    ? <span className="spinner small" />
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
                  }
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">RailTrace · Indian Railways AI · Built free with Next.js + Groq</footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0f;
          --surface: #13131a;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.18);
          --text: #f0f0f5;
          --muted: #7070a0;
          --accent: #f97316;
          --accent-dim: rgba(249,115,22,0.15);
          --green: #22c55e;
          --red: #ef4444;
          --yellow: #eab308;
          --radius: 14px;
        }

        html, body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

        .page { display: flex; flex-direction: column; min-height: 100vh; max-width: 760px; margin: 0 auto; padding: 0 20px; }

        /* Nav */
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 0; }
        .nav-logo { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .nav-logo svg { color: var(--accent); }
        .nav-logo em { color: var(--accent); font-style: normal; }
        .nav-tag { font-size: 11px; font-family: 'DM Mono', monospace; color: var(--muted); border: 1px solid var(--border); border-radius: 20px; padding: 4px 10px; }

        /* Hero */
        .hero { padding: 64px 0 48px; }
        .hero-eyebrow { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--accent); letter-spacing: 0.05em; margin-bottom: 16px; }
        .hero h1 { font-size: clamp(40px, 7vw, 64px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; color: var(--text); margin-bottom: 16px; }
        .hero h1 em { color: var(--accent); font-style: normal; }
        .hero-sub { font-size: 15px; color: var(--muted); line-height: 1.6; max-width: 480px; }

        /* Search */
        .main { flex: 1; }
        .search-wrap { margin-bottom: 32px; }
        .search-box {
          display: flex; align-items: center; gap: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 10px 10px 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-box:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .search-icon { color: var(--muted); flex-shrink: 0; }
        .search-input {
          flex: 1; background: none; border: none; outline: none;
          font-family: 'Syne', sans-serif; font-size: 15px; color: var(--text);
          min-width: 0;
        }
        .search-input::placeholder { color: var(--muted); }
        .detect-badge {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: var(--accent); background: var(--accent-dim);
          border-radius: 20px; padding: 3px 10px; white-space: nowrap; flex-shrink: 0;
        }
        .track-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--accent); color: #fff;
          border: none; border-radius: 10px;
          padding: 10px 18px; font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s, transform 0.1s; flex-shrink: 0;
        }
        .track-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .track-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* Chips */
        .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
        .chips-label { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
        .chip {
          display: flex; align-items: center; gap: 6px;
          background: none; border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 12px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .chip:hover { border-color: var(--accent); background: var(--accent-dim); }
        .chip-val { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); }
        .chip-label { font-size: 11px; color: var(--muted); }

        /* Empty */
        .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 12px; }
        .empty-icon { color: var(--border); }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--muted); }
        .empty-sub { font-size: 13px; color: var(--muted); opacity: 0.6; }

        /* Loading */
        .loading-state { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 80px 0; }
        .rail-loader { position: relative; width: 200px; height: 20px; }
        .rail-track { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: var(--border); transform: translateY(-50%); border-radius: 2px; }
        .rail-train {
          position: absolute; top: 50%; width: 40px; height: 8px;
          background: var(--accent); border-radius: 4px; transform: translateY(-50%);
          animation: trainMove 1.4s ease-in-out infinite;
        }
        @keyframes trainMove { 0% { left: -40px } 100% { left: 200px } }
        .loading-text { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }

        /* Spinner */
        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .spinner.small { width: 12px; height: 12px; }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Result */
        .result-wrap { display: flex; flex-direction: column; gap: 0; }
        .result-content { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }

        /* Result HTML elements */
        .result-content .train-header { margin-bottom: 20px; }
        .result-content h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); margin-bottom: 4px; }
        .result-content h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 20px 0 12px; }
        .result-content p { font-size: 13px; color: var(--muted); line-height: 1.5; }
        .result-content .train-summary { font-size: 14px; color: var(--text); opacity: 0.8; margin-bottom: 8px; }
        .result-content .rt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .result-content .rt-table th { text-align: left; font-size: 11px; font-family: 'DM Mono', monospace; color: var(--muted); border-bottom: 1px solid var(--border); padding: 6px 10px; }
        .result-content .rt-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text); }
        .result-content .rt-table tr:last-child td { border-bottom: none; }
        .result-content .rt-table tr:hover td { background: rgba(255,255,255,0.03); }
        .result-content .status-bar { margin-top: 20px; display: flex; align-items: center; gap: 10px; }
        .result-content .rt-status-pill { display: inline-block; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; }
        .result-content .rt-status-pill.on-time, .result-content .rt-status-pill.running { background: rgba(34,197,94,0.15); color: var(--green); }
        .result-content .rt-status-pill.delayed, .result-content .rt-status-pill.late { background: rgba(239,68,68,0.15); color: var(--red); }
        .result-content .journey-details { margin-bottom: 16px; }

        /* Follow-up */
        .followup-bar {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--border);
          border-top: none; border-radius: 0 0 var(--radius) var(--radius);
          padding: 10px 10px 10px 16px;
        }
        .followup-input { flex: 1; background: none; border: none; outline: none; font-family: 'Syne', sans-serif; font-size: 13px; color: var(--text); }
        .followup-input::placeholder { color: var(--muted); }
        .send-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          background: var(--accent); border: none; cursor: pointer;
          color: #fff; flex-shrink: 0; transition: opacity 0.15s;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.85; }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Footer */
        .footer { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-align: center; padding: 32px 0; }

        @media (max-width: 520px) {
          .detect-badge { display: none; }
          .hero h1 { font-size: 36px; }
          .result-content { padding: 16px; overflow-x: auto; }
          .result-content .rt-table { font-size: 12px; }
        }
      `}</style>
    </>
  )
}