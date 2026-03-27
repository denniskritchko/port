import { lazy, Suspense, useState, useCallback, useEffect } from 'react'

const StaircaseScene = lazy(() => import('./components/StaircaseScene'))

const PROJECTS = [
  {
    id: 1,
    title: 'FitPicifiy',
    tag: 'Mobile App',
    desc: 'AI-powered outfit curation — your digital wardrobe. Mobile app in progress.',
    tech: ['React Native', 'Python', 'AI / ML'],
    href: 'https://github.com/denniskritchko/FitPicifiy',
  },
  {
    id: 2,
    title: 'Fast Fashion Market Analysis',
    tag: 'Data Science',
    desc: 'Sentiment analysis across social media and market data to map the pulse of fast fashion.',
    tech: ['Python', 'pandas', 'NLP', 'matplotlib'],
    href: 'https://github.com/denniskritchko/FastFashionMarketAnalysis',
  },
  {
    id: 3,
    title: 'NoScroll',
    tag: 'Chrome Extension',
    desc: 'Replace mindless social scrolling with timed updates on your own projects.',
    tech: ['JavaScript', 'Chrome Extension API'],
    href: 'https://github.com/denniskritchko/NoScroll',
  },
  {
    id: 4,
    title: '3D Tic-Tac-Toe',
    tag: 'Game',
    desc: 'The classic game reimagined in three dimensions.',
    tech: ['Three.js', 'JavaScript'],
    href: 'https://github.com/denniskritchko/3d-tictactoe',
  },
  {
    id: 5,
    title: 'Mutect',
    tag: 'ML · Big Data',
    desc: 'Short tandem repeat detector built on distributed data pipelines and machine learning.',
    tech: ['Python', 'Apache Spark', 'scikit-learn'],
    href: 'https://github.com/denniskritchko/Mutect',
    videoHref: 'https://www.youtube.com/watch?v=J_UsRXKDjb4',
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
  const [progress,       setProgress]       = useState(0)
  const [stage,          setStage]          = useState('Initializing')
  const [loaded,         setLoaded]         = useState(false)
  const [gone,           setGone]           = useState(false)
  const [activeProject,  setActiveProject]  = useState<number | null>(null)
  const [currentSection, setCurrentSection] = useState(0)

  const handleProgress       = useCallback((p: number) => setProgress(p), [])
  const handleStage          = useCallback((s: string)  => setStage(s),   [])
  const handleLoaded         = useCallback(() => setLoaded(true),          [])
  const handleProjectClick   = useCallback((i: number)  => setActiveProject(i), [])
  const handleSectionChange  = useCallback((s: number)  => setCurrentSection(s), [])

  // Close project modal on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveProject(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const proj = activeProject !== null ? PROJECTS[activeProject] : null

  return (
    <>
      {/* Loading overlay */}
      {!gone && (
        <div
          onTransitionEnd={() => { if (loaded) setGone(true) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: '#f7f5f0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
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
            Dennis<br /><span style={{ color: '#8a7f74' }}>Kritchko</span>
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
        <StaircaseScene
          onProgress={handleProgress}
          onStage={handleStage}
          onLoaded={handleLoaded}
          onProjectClick={handleProjectClick}
          onSectionChange={handleSectionChange}
        />
      </Suspense>

      {/* Intro nameplate — only visible at section 0 */}
      {currentSection === 0 && (
        <div
          className="fixed inset-0 z-10 flex flex-col items-center justify-center select-none"
          style={{ pointerEvents: 'none' }}
        >
          <h1
            className="font-light leading-none tracking-tight text-center"
            style={{
              color: '#2a2520',
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(3rem, 9vw, 6rem)',
              letterSpacing: '-0.02em',
            }}
          >
            Dennis<br /><span style={{ color: '#8a7f74' }}>Kritchko</span>
          </h1>
          <div className="mt-10 flex flex-col items-center gap-2" style={{ color: '#c0b8b0' }}>
            <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
            <svg width="1" height="40" viewBox="0 0 1 40">
              <line x1="0.5" y1="0" x2="0.5" y2="40" stroke="#c8b89a" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Project info overlay — shown on painting click ── */}
      {proj && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '2rem',
            background: 'rgba(42,37,32,0.35)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setActiveProject(null)}
        >
          <div
            style={{ ...glassStyle, padding: '2.5rem', maxWidth: 380, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: '#8a7f74' }}>
                  {String(proj.id).padStart(2, '0')} · {proj.tag}
                </p>
                <h2 className="text-2xl font-light" style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}>
                  {proj.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveProject(null)}
                className="text-xs tracking-widest uppercase hover:opacity-50 transition-opacity ml-4 mt-1"
                style={{ color: '#8a7f74' }}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-sm font-light leading-relaxed mb-5" style={{ color: '#2a2520' }}>
              {proj.desc}
            </p>

            {/* Tech stack */}
            <div className="mb-5">
              <p className="text-xs tracking-[0.18em] uppercase mb-2" style={{ color: '#8a7f74' }}>Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {proj.tech.map(t => (
                  <span key={t} className="text-xs px-3 py-1" style={{
                    background: 'rgba(200,184,154,0.2)',
                    border: '1px solid rgba(200,184,154,0.4)',
                    borderRadius: '2rem',
                    color: '#2a2520',
                    letterSpacing: '0.04em',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <a
                href={proj.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-50"
                style={{ color: '#8a7f74' }}
              >
                View on GitHub →
              </a>
              {'videoHref' in proj && (
                <a
                  href={(proj as typeof proj & { videoHref: string }).videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-50"
                  style={{ color: '#8a7f74' }}
                >
                  Watch Demo →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
