import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

type AuctionType = 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'

interface CardData {
  id: number
  artist: string
  artistIndex: number
  cardIndex: number
  auctionType: AuctionType
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ARTISTS = [
  { name: 'Manuel Carvalho', color: '#F5C846', textColor: '#000000' },
  { name: 'Daniel Melim', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Sigrid Thaler', color: '#2DD4BF', textColor: '#000000' },
  { name: 'Ramon Martins', color: '#22C55E', textColor: '#000000' },
  { name: 'Rafael Silveira', color: '#A855F7', textColor: '#FFFFFF' },
]

const AUCTION_TYPES: AuctionType[] = ['open', 'one_offer', 'hidden', 'fixed_price', 'double']
const CARD_DISTRIBUTION = [12, 13, 14, 15, 16] // 70 total cards

// ============================================================================
// GENERATE ALL 70 CARDS
// ============================================================================

function generateAllCards(): CardData[] {
  const cards: CardData[] = []
  let globalIndex = 0

  ARTISTS.forEach((artist, artistIndex) => {
    const count = CARD_DISTRIBUTION[artistIndex]
    for (let i = 0; i < count; i++) {
      cards.push({
        id: globalIndex,
        artist: artist.name,
        artistIndex,
        cardIndex: i,
        auctionType: AUCTION_TYPES[globalIndex % 5],
      })
      globalIndex++
    }
  })

  return cards
}

// Deterministic shuffle based on seed
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const ALL_CARDS = seededShuffle(generateAllCards(), 42)

// ============================================================================
// AUCTION ICON COMPONENT
// ============================================================================

function AuctionIcon({ type, color }: { type: AuctionType; color: string }) {
  const iconStyle = { width: 16, height: 16 }

  switch (type) {
    case 'open':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3L14.5 8.5L20.5 9.3L16.3 13.4L17.3 19.3L12 16.5L6.7 19.3L7.7 13.4L3.5 9.3L9.5 8.5L12 3Z"
            fill={color}
          />
        </svg>
      )
    case 'one_offer':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill={color} />
        </svg>
      )
    case 'hidden':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12C3 12 7 5 12 5C17 5 21 12 21 12C21 12 17 19 12 19C7 19 3 12 3 12Z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill={color} />
          <line x1="4" y1="20" x2="20" y2="4" stroke={color} strokeWidth="2" />
        </svg>
      )
    case 'fixed_price':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill={color}
          >
            $
          </text>
        </svg>
      )
    case 'double':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="2" fill={color} />
          <text
            x="12"
            y="15"
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill={color === '#000000' ? '#FFFFFF' : '#000000'}
          >
            x2
          </text>
        </svg>
      )
    default:
      return null
  }
}

// ============================================================================
// PLACEHOLDER ART COMPONENT
// ============================================================================

function PlaceholderArt({ artistIndex, cardIndex }: { artistIndex: number; cardIndex: number }) {
  const seed = artistIndex * 100 + cardIndex

  const gradients: Record<number, string> = {
    0: `linear-gradient(${135 + (seed % 90)}deg,
        hsl(${35 + (seed % 20)}, 75%, ${35 + (seed % 15)}%) 0%,
        hsl(${25 + (seed % 30)}, 65%, ${25 + (seed % 20)}%) 100%)`,
    1: `linear-gradient(${180 + (seed % 60)}deg,
        hsl(${0 + (seed % 15)}, 70%, ${30 + (seed % 15)}%) 0%,
        hsl(${350 + (seed % 20)}, 60%, ${20 + (seed % 15)}%) 100%)`,
    2: `linear-gradient(${160 + (seed % 80)}deg,
        hsl(${175 + (seed % 20)}, 55%, ${30 + (seed % 15)}%) 0%,
        hsl(${185 + (seed % 25)}, 45%, ${20 + (seed % 20)}%) 100%)`,
    3: `linear-gradient(${140 + (seed % 70)}deg,
        hsl(${130 + (seed % 30)}, 50%, ${30 + (seed % 15)}%) 0%,
        hsl(${110 + (seed % 40)}, 40%, ${20 + (seed % 20)}%) 100%)`,
    4: `linear-gradient(${150 + (seed % 90)}deg,
        hsl(${280 + (seed % 30)}, 55%, ${35 + (seed % 15)}%) 0%,
        hsl(${260 + (seed % 40)}, 45%, ${20 + (seed % 20)}%) 100%)`,
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: gradients[artistIndex % 5],
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Abstract shapes */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.4,
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <circle
          cx={25 + (seed % 50)}
          cy={30 + (seed % 40)}
          r={8 + (seed % 15)}
          fill="rgba(255,255,255,0.15)"
        />
        <rect
          x={55 + (seed % 25)}
          y={50 + (seed % 30)}
          width={12 + (seed % 18)}
          height={15 + (seed % 20)}
          fill="rgba(0,0,0,0.2)"
          transform={`rotate(${(seed % 30) - 15} ${60 + (seed % 25)} ${55 + (seed % 30)})`}
        />
        <path
          d={`M ${5 + (seed % 15)} ${75 - (seed % 20)}
              Q ${45 + (seed % 25)} ${35 + (seed % 35)}
              ${95 - (seed % 15)} ${60 + (seed % 25)}`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  )
}

// ============================================================================
// GAME CARD COMPONENT
// ============================================================================

// Responsive card sizes based on viewport
const CARD_WIDTH = 'clamp(120px, 12vw, 200px)'
const CARD_HEIGHT = 'clamp(168px, 16.8vw, 280px)'
const HEADER_HEIGHT = 'clamp(24px, 2.4vw, 36px)'

function GameCard({ card }: { card: CardData }) {
  const artist = ARTISTS[card.artistIndex]

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: HEADER_HEIGHT,
          backgroundColor: artist.color,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        <AuctionIcon type={card.auctionType} color={artist.textColor} />
        <span
          style={{
            color: artist.textColor,
            fontSize: 'clamp(8px, 0.8vw, 12px)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {artist.name}
        </span>
      </div>

      {/* Artwork */}
      <div style={{ height: `calc(${CARD_HEIGHT} - ${HEADER_HEIGHT})` }}>
        <PlaceholderArt artistIndex={card.artistIndex} cardIndex={card.cardIndex} />
      </div>
    </div>
  )
}

// ============================================================================
// FLOATING CARDS BACKGROUND (CSS animations for performance)
// ============================================================================

function FloatingCardsBackground() {
  // Split cards into 4 rows (fewer rows, bigger cards)
  const rows = useMemo(() => {
    const rowCount = 4
    const cardsPerRow = Math.ceil(ALL_CARDS.length / rowCount)
    return Array.from({ length: rowCount }, (_, i) =>
      ALL_CARDS.slice(i * cardsPerRow, (i + 1) * cardsPerRow)
    )
  }, [])

  // Row height responsive to viewport
  const rowHeight = 'clamp(180px, 18vw, 300px)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        zIndex: 0,
      }}
    >
      {/* CSS Keyframes for smooth scrolling */}
      <style>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        @keyframes scroll-right {
          from { transform: translateX(-33.333%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {rows.map((rowCards, rowIndex) => {
        const isReverse = rowIndex % 2 === 1
        const duration = 60 + rowIndex * 15
        const yOffset = `calc(${rowIndex} * ${rowHeight})`

        return (
          <div
            key={rowIndex}
            style={{
              position: 'absolute',
              top: yOffset,
              left: 0,
              display: 'flex',
              gap: 'clamp(12px, 1.5vw, 24px)',
              animation: `${isReverse ? 'scroll-right' : 'scroll-left'} ${duration}s linear infinite`,
              willChange: 'transform',
            }}
          >
            {/* Triple the cards for seamless loop */}
            {[...rowCards, ...rowCards, ...rowCards].map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                style={{
                  opacity: 0.4,
                  transform: `rotate(${((idx % 5) - 2) * 1.5}deg)`,
                }}
              >
                <GameCard card={card} />
              </div>
            ))}
          </div>
        )
      })}

      {/* Dark gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.3) 50%, rgba(10,10,10,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,10,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ============================================================================
// LANDING PAGE
// ============================================================================

function LandingPage({ onPlay }: { onPlay: () => void }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FloatingCardsBackground />

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

// ============================================================================
// PLAYER COUNT SELECTION
// ============================================================================

function PlayerCountSelection({
  onSelect,
  onBack,
}: {
  onSelect: (count: number) => void
  onBack: () => void
}) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FloatingCardsBackground />

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
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 200,
            color: '#FFFFFF',
            marginBottom: 48,
            letterSpacing: '0.1em',
          }}
        >
          Select Players
        </h2>

        <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
          {[3, 4, 5].map((count) => (
            <button
              key={count}
              onClick={() => onSelect(count)}
              style={{
                width: 120,
                height: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
                e.currentTarget.style.borderColor = 'rgba(201,162,39,0.8)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(201,162,39,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
            >
              <span style={{ fontSize: '3rem', fontWeight: 200 }}>{count}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            padding: 12,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
          }}
        >
          Back
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// GAME SCREEN (PLACEHOLDER)
// ============================================================================

function GameScreen({ playerCount, onBack }: { playerCount: number; onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <h2
        style={{
          fontSize: '2rem',
          fontWeight: 200,
          color: '#FFFFFF',
          marginBottom: 16,
          letterSpacing: '0.1em',
        }}
      >
        Game Starting...
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
        {playerCount} players ready
      </p>
      <button
        onClick={onBack}
        style={{
          padding: '12px 32px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          color: '#FFFFFF',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
        }}
      >
        Back to Menu
      </button>
    </div>
  )
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

type Screen = 'menu' | 'playerCount' | 'game'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu')
  const [playerCount, setPlayerCount] = useState<number>(3)

  if (currentScreen === 'menu') {
    return <LandingPage onPlay={() => setCurrentScreen('playerCount')} />
  }

  if (currentScreen === 'playerCount') {
    return (
      <PlayerCountSelection
        onSelect={(count) => {
          setPlayerCount(count)
          setCurrentScreen('game')
        }}
        onBack={() => setCurrentScreen('menu')}
      />
    )
  }

  if (currentScreen === 'game') {
    return <GameScreen playerCount={playerCount} onBack={() => setCurrentScreen('menu')} />
  }

  return null
}

export default App
