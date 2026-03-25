import { lazy, Suspense } from 'react'
const StaircaseScene = lazy(() => import('./components/StaircaseScene'))

const PROJECTS = [
  { id: 1, title: 'Project One',   subtitle: 'Coming soon' },
  { id: 2, title: 'Project Two',   subtitle: 'Coming soon' },
  { id: 3, title: 'Project Three', subtitle: 'Coming soon' },
  { id: 4, title: 'Project Four',  subtitle: 'Coming soon' },
  { id: 5, title: 'Project Five',  subtitle: 'Coming soon' },
]

export default function App() {
  return (
    <>
      {/* Fixed Three.js canvas */}
      <Suspense fallback={null}>
        <StaircaseScene />
      </Suspense>

      {/* Scrollable overlay — must be taller than viewport to drive scroll */}
      <div className="relative z-10" style={{ height: '600vh' }}>

        {/* ── Hero ── */}
        <section className="h-screen flex flex-col items-center justify-center pointer-events-none select-none">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-8"
            style={{ color: '#b0a89e' }}
          >
            Portfolio
          </p>
          <h1
            className="text-6xl md:text-8xl font-light leading-none tracking-tight"
            style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}
          >
            Dennis
            <br />
            <span style={{ color: '#8a7f74' }}>Kritchko</span>
          </h1>
          <p
            className="mt-6 text-base font-light tracking-wide"
            style={{ color: '#a09690' }}
          >
            Designer &amp; Developer
          </p>
          <div
            className="mt-14 flex flex-col items-center gap-2"
            style={{ color: '#c0b8b0' }}
          >
            <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
            <svg width="1" height="40" viewBox="0 0 1 40">
              <line x1="0.5" y1="0" x2="0.5" y2="40" stroke="#c8b89a" strokeWidth="1" />
            </svg>
          </div>
        </section>

        {/* ── Projects heading ── */}
        <section
          className="flex flex-col items-center justify-center pointer-events-none select-none"
          style={{ height: '15vh' }}
        >
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: '#a09690' }}
          >
            Selected Work
          </p>
        </section>

        {/* ── Project cards (spaced along the descent) ── */}
        <section className="relative" style={{ height: '370vh' }}>
          {PROJECTS.map((p, i) => {
            const topPct = (i / (PROJECTS.length - 1)) * 85 + 5
            const side   = i % 2 === 0 ? 'left' : 'right'
            return (
              <div
                key={p.id}
                className="absolute pointer-events-none select-none"
                style={{
                  top:   `${topPct}%`,
                  [side]: '6%',
                  transform: 'translateY(-50%)',
                }}
              >
                <div
                  className="px-8 py-5 backdrop-blur-sm"
                  style={{
                    background: 'rgba(247,245,240,0.55)',
                    border: '1px solid rgba(200,184,154,0.35)',
                    maxWidth: 260,
                  }}
                >
                  <p
                    className="text-xs tracking-[0.2em] uppercase mb-1"
                    style={{ color: '#b0a89e' }}
                  >
                    {String(p.id).padStart(2, '0')}
                  </p>
                  <h2
                    className="text-lg font-light"
                    style={{ color: '#2a2520', fontFamily: 'Georgia, serif' }}
                  >
                    {p.title}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#a09690' }}>
                    {p.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── Footer ── */}
        <section className="flex items-end justify-center pb-12" style={{ height: '15vh' }}>
          <p
            className="text-xs tracking-[0.2em] uppercase pointer-events-none select-none"
            style={{ color: '#c0b8b0' }}
          >
            &copy; {new Date().getFullYear()} Dennis Kritchko
          </p>
        </section>

      </div>
    </>
  )
}
