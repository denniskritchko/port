import { lazy, Suspense, useState, useCallback } from 'react'

const StaircaseScene = lazy(() => import('./components/StaircaseScene'))

const PROJECTS = [
  { id: 1, title: 'Project One',   subtitle: 'Coming soon' },
  { id: 2, title: 'Project Two',   subtitle: 'Coming soon' },
  { id: 3, title: 'Project Three', subtitle: 'Coming soon' },
  { id: 4, title: 'Project Four',  subtitle: 'Coming soon' },
  { id: 5, title: 'Project Five',  subtitle: 'Coming soon' },
]

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
      {/* Loading overlay — sits above everything, fades out on load */}
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
          {/* Hero content (mirrors the main hero so the transition is seamless) */}
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

          {/* Loading bar */}
          <div style={{ marginTop: '3.5rem', width: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#c8b8a8', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {stage}
              </span>
              <span style={{ color: '#c8b8a8', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                {Math.round(progress * 100)}%
              </span>
            </div>
            {/* Track */}
            <div style={{ height: '1px', background: '#e4dfd8', position: 'relative' }}>
              {/* Fill */}
              <div style={{
                position: 'absolute',
                left: 0, top: 0,
                height: '100%',
                width: `${progress * 100}%`,
                background: '#c8b89a',
                transition: 'width 0.35s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Fixed Three.js canvas */}
      <Suspense fallback={null}>
        <StaircaseScene onProgress={handleProgress} onStage={handleStage} onLoaded={handleLoaded} />
      </Suspense>

      {/* Scrollable overlay */}
      <div className="relative z-10" style={{ height: '600vh' }}>

        {/* ── Hero ── */}
        <section className="h-screen flex flex-col items-center justify-center pointer-events-none select-none">
          <div
            className="flex flex-col items-center"
            style={{
              background: 'rgba(247,245,240,0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '1.5rem',
              padding: '2.5rem 3rem 2rem',
              border: '1px solid rgba(200,184,154,0.25)',
            }}
          >
            <p className="text-xs tracking-[0.3em] uppercase mb-8" style={{ color: '#b0a89e' }}>
              Portfolio
            </p>
            <h1
              className="text-6xl md:text-8xl font-light leading-none tracking-tight"
              style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}
            >
              Dennis<br />
              <span style={{ color: '#8a7f74' }}>Kritchko</span>
            </h1>
            <p className="mt-6 text-base font-light tracking-wide" style={{ color: '#a09690' }}>
              Designer &amp; Developer
            </p>

            {/* About */}
            <p
              className="mt-8 text-sm font-light leading-relaxed text-center"
              style={{ color: '#a09690', maxWidth: 360 }}
            >
              Incoming SWE Intern at Microsoft · Windows &amp; Devices.
              Exploring AI developer tooling and the intersection of fashion and technology.
            </p>

            {/* Social links — pointer-events-auto so they're clickable */}
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
                  style={{ color: '#b0a89e' }}
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

        {/* ── Projects heading ── */}
        <section className="flex flex-col items-center justify-center pointer-events-none select-none" style={{ height: '15vh' }}>
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#a09690' }}>
            Selected Work
          </p>
        </section>

        {/* ── Project cards ── */}
        <section className="relative" style={{ height: '370vh' }}>
          {PROJECTS.map((p, i) => {
            const topPct = (i / (PROJECTS.length - 1)) * 85 + 5
            const side   = i % 2 === 0 ? 'left' : 'right'
            return (
              <div
                key={p.id}
                className="absolute pointer-events-none select-none"
                style={{ top: `${topPct}%`, [side]: '6%', transform: 'translateY(-50%)' }}
              >
                <div
                  className="px-8 py-5 backdrop-blur-sm"
                  style={{ background: 'rgba(247,245,240,0.55)', border: '1px solid rgba(200,184,154,0.35)', maxWidth: 260 }}
                >
                  <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: '#b0a89e' }}>
                    {String(p.id).padStart(2, '0')}
                  </p>
                  <h2 className="text-lg font-light" style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}>
                    {p.title}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#a09690' }}>{p.subtitle}</p>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── Footer ── */}
        <section className="flex items-end justify-center pb-12" style={{ height: '15vh' }}>
          <p className="text-xs tracking-[0.2em] uppercase pointer-events-none select-none" style={{ color: '#c0b8b0' }}>
            &copy; {new Date().getFullYear()} Dennis Kritchko
          </p>
        </section>

      </div>
    </>
  )
}
