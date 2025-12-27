import { motion } from 'framer-motion'

// ============================================================================
// COLOR BAR NAVIGATION
// ============================================================================

const NAV_ITEMS = [
  { label: 'Rules', color: '#F5C846' },      // Manuel yellow
  { label: 'Gallery', color: '#DC2626' },    // Daniel red
  { label: 'Tutorial', color: '#2DD4BF' },   // Sigrid teal
  { label: 'Settings', color: '#22C55E' },   // Ramon green
  { label: 'Buy', color: '#A855F7' },        // Rafael purple
]

interface ColorBarNavProps {
  onNavigate: (item: string) => void
}

function ColorBarNav({ onNavigate }: ColorBarNavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 32,
        left: 24,
        zIndex: 100,
        display: 'flex',
        gap: '32px',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <div
          key={item.label}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            cursor: item.label === 'Rules' || item.label === 'Gallery' ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (item.label === 'Rules') {
              onNavigate('rules')
            } else if (item.label === 'Gallery') {
              onNavigate('gallery')
            }
          }}
          onMouseEnter={(e) => {
            const bar = e.currentTarget.querySelector('[data-bar]')
            if (bar) {
              ;(bar as HTMLDivElement).style.width = '100%'
            }
          }}
          onMouseLeave={(e) => {
            const bar = e.currentTarget.querySelector('[data-bar]')
            if (bar) {
              ;(bar as HTMLDivElement).style.width = '20%'
            }
          }}
        >
          {/* Text label - always visible */}
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 400,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: item.label === 'Rules' || item.label === 'Gallery' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              transition: 'color 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
          {/* Colored bar - grows on hover */}
          <div
            data-bar
            style={{
              width: '20%',
              height: '2px',
              backgroundColor: item.color,
              marginTop: '4px',
              transition: 'width 0.3s ease',
              boxShadow: `0 0 8px ${item.color}80`,
            }}
          />
        </div>
      ))}
    </nav>
  )
}

// ============================================================================
// LANDING PAGE
// ============================================================================

export interface LandingPageProps {
  onPlay: () => void
}

export function LandingPage({ onPlay }: LandingPageProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ textAlign: 'center', marginBottom: 60 }}
        >
          <h1
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 9rem)',
              fontWeight: 200,
              letterSpacing: '0.15em',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1,
              textShadow: '0 4px 30px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            MODERN
          </h1>
          <h1
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 9rem)',
              fontWeight: 200,
              letterSpacing: '0.15em',
              margin: 0,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #C9A227 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            ART
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 24,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontWeight: 300,
            }}
          >
            The Auction Game
          </p>
        </motion.div>

        {/* Play button - using CSS for snappy interactions */}
        <button
          onClick={onPlay}
          style={{
            padding: '20px 56px',
            fontSize: '1.1rem',
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#0a0a0a',
            background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #C9A227 100%)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(201,162,39,0.25)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(201,162,39,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 30px rgba(201,162,39,0.25)'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
        >
          Play Offline
        </button>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{
            position: 'absolute',
            bottom: 32,
            color: 'rgba(255,255,255,0.25)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          70 Unique Artworks
        </motion.div>
      </div>
    </div>
  )
}

export { ColorBarNav }
