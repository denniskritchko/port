import { lazy, Suspense, useState, useCallback } from 'react'

const StaircaseScene = lazy(() => import('./components/StaircaseScene'))

const PROJECTS = [
  {
    id: 1,
    title: 'FitPicifiy',
    tag: 'Mobile App',
    desc: 'AI-powered outfit curation. More work coming soon — launching as a mobile app.',
    href: 'https://github.com/denniskritchko/FitPicifiy',
  },
  {
    id: 2,
    title: 'Fast Fashion Market Analysis',
    tag: 'Data Science',
    desc: 'Sentiment analysis on the fast fashion industry using NLP and market data.',
    href: 'https://github.com/denniskritchko/FastFashionMarketAnalysis',
  },
  {
    id: 3,
    title: 'NoScroll',
    tag: 'Chrome Extension',
    desc: 'Replace mindless scrolling with timed updates on your own projects.',
    href: 'https://github.com/denniskritchko/NoScroll',
  },
  {
    id: 4,
    title: '3D Tic-Tac-Toe',
    tag: 'Game',
    desc: 'Classic game reimagined in three dimensions.',
    href: 'https://github.com/denniskritchko/3d-tictactoe',
  },
  {
    id: 5,
    title: 'Mutect',
    tag: 'ML · Big Data',
    desc: 'Short tandem repeat detector built on big data pipelines and machine learning.',
    href: 'https://github.com/denniskritchko/Mutect',
  },
]

const glassStyle: React.CSSProperties = {
  background: 'rgba(247,245,240,0.72)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '1.5rem',
  border: '1px solid rgba(200,184,154,0.25)',
}

export default function App() {
  const [progress, setProgress] = useState(0)
  const [stage,    setStage]    = useState('Initializing')
  const [loaded,   setLoaded]   = useState(false)
  const [gone,     setGone]     = useState(false)

  const handleProgress = useCallback((p: number) => setProgress(p), [])
  const handleStage    = useCallback((s: string)  => setStage(s),    [])
  const handleLoaded   = useCallback(() => setLoaded(true),          [])

  return (
    <>
      {/* Loading overlay */}
      {!gone && (
        <div
          onTransitionEnd={() => { if (loaded) setGone(true) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: '#f7f5f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loaded ? 0 : 1,
            transition: 'opacity 0.9s ease',
            pointerEvents: loaded ? 'none' : 'all',
            userSelect: 'none',
          }}
        >
          <p style={{ color: '#b0a89e', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '2rem' }}>
            Portfolio
          </p>
          <h1 style={{ color: '#2a2520', fontFamily: 'Georgia, serif', fontSize: 'clamp(3rem, 9vw, 6rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', textAlign: 'center', margin: 0 }}>
            Dennis<br />
            <span style={{ color: '#8a7f74' }}>Kritchko</span>
          </h1>
          <p style={{ color: '#a09690', marginTop: '1.5rem', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1rem' }}>
            Designer &amp; Developer
          </p>
          <div style={{ marginTop: '3.5rem', width: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#c8b8a8', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{stage}</span>
              <span style={{ color: '#c8b8a8', fontSize: '0.6rem', letterSpacing: '0.05em' }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ height: '1px', background: '#e4dfd8', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress * 100}%`, background: '#c8b89a', transition: 'width 0.35s ease' }} />
            </div>
          </div>
        </div>
      )}

      {/* Fixed Three.js canvas */}
      <Suspense fallback={null}>
        <StaircaseScene onProgress={handleProgress} onStage={handleStage} onLoaded={handleLoaded} />
      </Suspense>

      {/* Scrollable overlay — 6 snap sections: hero + 5 projects */}
      <div className="relative z-10" style={{ height: '600vh' }}>

        {/* ── Hero ── */}
        <section
          className="h-screen flex flex-col items-center justify-center pointer-events-none select-none"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="flex flex-col items-center" style={{ ...glassStyle, padding: '2.5rem 3rem 2rem' }}>
            <p className="text-xs tracking-[0.3em] uppercase mb-8" style={{ color: '#2a2520' }}>
              Portfolio
            </p>
            <h1
              className="text-6xl md:text-8xl font-light leading-none tracking-tight"
              style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}
            >
              Dennis<br />
              <span style={{ color: '#8a7f74' }}>Kritchko</span>
            </h1>
            <p className="mt-6 text-base font-light tracking-wide" style={{ color: '#2a2520' }}>
              Designer &amp; Developer
            </p>
            <p className="mt-8 text-sm font-light leading-relaxed text-center" style={{ color: '#2a2520', maxWidth: 360 }}>
              Incoming SWE Intern at Microsoft · Windows &amp; Devices.
              Exploring AI developer tooling and the intersection of fashion and technology.
            </p>
            <div className="mt-6 flex items-center gap-7 pointer-events-auto">
              {[
                { label: 'LinkedIn',  href: 'https://linkedin.com/in/dennis-kritchko' },
                { label: 'GitHub',    href: 'https://github.com/denniskritchko'       },
                { label: 'Instagram', href: 'https://instagram.com/kritchko'           },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-40"
                  style={{ color: '#2a2520' }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-2" style={{ color: '#c0b8b0' }}>
            <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
            <svg width="1" height="40" viewBox="0 0 1 40">
              <line x1="0.5" y1="0" x2="0.5" y2="40" stroke="#c8b89a" strokeWidth="1" />
            </svg>
          </div>
        </section>

        {/* ── Projects — one snap section each ── */}
        {PROJECTS.map((p) => (
          <section
            key={p.id}
            className="h-screen flex flex-col items-center justify-end pb-16 pointer-events-none select-none"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div style={{ ...glassStyle, padding: '1.75rem 2.25rem', maxWidth: 340, width: '90%' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#8a7f74' }}>
                  {String(p.id).padStart(2, '0')}
                </span>
                <span className="text-xs tracking-[0.15em] uppercase" style={{ color: '#a09690' }}>
                  {p.tag}
                </span>
              </div>
              <h2 className="text-xl font-light mb-2" style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}>
                {p.title}
              </h2>
              <p className="text-sm font-light leading-relaxed" style={{ color: '#2a2520' }}>
                {p.desc}
              </p>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-xs tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-40 pointer-events-auto"
                style={{ color: '#8a7f74' }}
              >
                View on GitHub →
              </a>
            </div>
          </section>
        ))}

      </div>
    </>
  )
}
