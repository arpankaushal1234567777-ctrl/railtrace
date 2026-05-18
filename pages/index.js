import { useState, useRef } from 'react'
import Head from 'next/head'

const TABS = [
  {
    id: 'train',
    label: 'Train Status',
    placeholder: 'Train number or name — e.g. 12301',
    hints: [
      { val: '12301', label: 'Howrah Rajdhani' },
      { val: '12951', label: 'Mumbai Rajdhani' },
      { val: '22691', label: 'Karnataka Rajdhani' },
      { val: '12002', label: 'Bhopal Shatabdi' },
    ],
    icon: <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/></svg>,
  },
  {
    id: 'station',
    label: 'Station Board',
    placeholder: 'Station code or name — e.g. NDLS',
    hints: [
      { val: 'NDLS', label: 'New Delhi' },
      { val: 'CSMT', label: 'Mumbai CST' },
      { val: 'MAS', label: 'Chennai Central' },
      { val: 'HWH', label: 'Howrah' },
    ],
    icon: <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 0 1 6 0v4"/></svg>,
  },
  {
    id: 'pnr',
    label: 'PNR Status',
    placeholder: '10-digit PNR number',
    hints: [
      { val: '4501234567', label: 'Sample PNR' },
      { val: '2398761234', label: 'Sample PNR' },
    ],
    icon: <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h2M12 15h5"/></svg>,
  },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('train')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('empty') // empty | loading | result
  const [resultHtml, setResultHtml] = useState('')
  const [history, setHistory] = useState([])
  const [followup, setFollowup] = useState('')
  const [fupLoading, setFupLoading] = useState(false)
  const inputRef = useRef(null)

  const tab = TABS.find(t => t.id === activeTab)

  function switchTab(id) {
    setActiveTab(id)
    setQuery('')
    setStatus('empty')
    setResultHtml('')
    setHistory([])
  }

  async function doSearch() {
    if (!query.trim() || status === 'loading') return
    setStatus('loading')
    setResultHtml('')
    setHistory([])

    const userMsg = { role: 'user', content: query.trim() }
    const msgs = [userMsg]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, tab: activeTab }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHistory([userMsg, { role: 'assistant', content: data.reply }])
      setResultHtml(data.reply)
      setStatus('result')
    } catch (err) {
      setResultHtml(`<p style="color:#EF4444;font-size:13px;">Error: ${err.message}</p>`)
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
        body: JSON.stringify({ messages: newHistory, tab: activeTab }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHistory([...newHistory, { role: 'assistant', content: data.reply }])
      setResultHtml(p => p + '<hr/>' + data.reply)
    } catch (err) {
      setResultHtml(p => p + `<p style="color:#EF4444;margin-top:12px;font-size:13px;">Error: ${err.message}</p>`)
    } finally {
      setFupLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>RailTrace — Indian Railways AI Tracker</title>
        <meta name="description" content="Real-time Indian Railways intelligence. Track trains, check station boards, and look up PNR status instantly." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-mark">
            <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/></svg>
          </div>
          <span className="nav-logo-text">Rail<em>Trace</em></span>
        </div>
        <div className="nav-pill">Indian Railways · AI</div>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow">
          <span></span>
          Live Railway Intelligence
        </div>
        <h1>Track any train,<br /><em>instantly.</em></h1>
        <p className="hero-sub">Real-time status, station boards, and PNR lookup — powered by AI.</p>
      </section>

      <main className="container">
        {/* Tabs */}
        <div className="tab-switcher">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => switchTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Search card */}
        <div className="search-card">
          <div className="search-inner">
            <div className="input-wrap">
              <svg className="input-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder={tab.placeholder}
              />
            </div>
            <button
              className="track-btn"
              onClick={doSearch}
              disabled={status === 'loading' || !query.trim()}
            >
              <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Track
            </button>
          </div>

          <div className="hints-bar">
            <span className="hints-label">Try</span>
            {tab.hints.map(h => (
              <button
                key={h.val}
                className="hint-chip"
                onClick={() => { setQuery(h.val); inputRef.current?.focus() }}
              >
                {h.val} · {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="result-area">
          {status === 'empty' && (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 3v8M16 3v8M4 19l-2 2M20 19l2 2M12 19v2"/></svg>
              <h3>No train selected</h3>
              <p>Enter a train number, station code, or PNR number to begin tracking</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="loading-state">
              <div className="track-loader">
                <div className="track-rails"></div>
              </div>
              <div className="loading-label">fetching railway data...</div>
            </div>
          )}

          {status === 'result' && (
            <>
              <div
                className="response-content"
                dangerouslySetInnerHTML={{ __html: resultHtml }}
              />
              <div className="followup-bar">
                <input
                  className="followup-input"
                  type="text"
                  value={followup}
                  onChange={e => setFollowup(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doFollowup()}
                  placeholder="Ask a follow-up — coach details, delay reason, next stop..."
                />
                <button
                  className="send-btn"
                  onClick={doFollowup}
                  disabled={fupLoading || !followup.trim()}
                  aria-label="Send"
                >
                  <svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <footer>
        RailTrace · Indian Railways AI · Built free with Next.js + Gemini
      </footer>
    </>
  )
}
