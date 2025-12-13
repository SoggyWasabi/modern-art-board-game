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

function GameCard({ card }: { card: CardData }) {
  const artist = ARTISTS[card.artistIndex]
  const width = 100
  const height = 140

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#1a1a1a',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 22,
          backgroundColor: artist.color,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 6,
          paddingRight: 6,
        }}
      >
        <AuctionIcon type={card.auctionType} color={artist.textColor} />
        <span
          style={{
            color: artist.textColor,
            fontSize: 7,
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
      <div style={{ height: height - 22 }}>
        <PlaceholderArt artistIndex={card.artistIndex} cardIndex={card.cardIndex} />
      </div>
    </div>
  )
}

// ============================================================================
// FLOATING CARDS BACKGROUND
// ============================================================================

function FloatingCardsBackground() {
  // Split cards into 5 rows for better distribution
  const rows = useMemo(() => {
    const rowCount = 5
    const cardsPerRow = Math.ceil(ALL_CARDS.length / rowCount)
    return Array.from({ length: rowCount }, (_, i) =>
      ALL_CARDS.slice(i * cardsPerRow, (i + 1) * cardsPerRow)
    )
  }, [])

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
      {rows.map((rowCards, rowIndex) => {
        const isReverse = rowIndex % 2 === 1
        const duration = 80 + rowIndex * 20
        const yPosition = rowIndex * 160 - 40

        return (
          <motion.div
            key={rowIndex}
            style={{
              position: 'absolute',
              top: yPosition,
              left: 0,
              display: 'flex',
              gap: 16,
            }}
            initial={{ x: isReverse ? '-33.33%' : '0%' }}
            animate={{ x: isReverse ? '0%' : '-33.33%' }}
            transition={{
              duration,
              ease: 'linear',
              repeat: Infinity,
            }}
          >
            {/* Triple the cards for seamless loop */}
            {[...rowCards, ...rowCards, ...rowCards].map((card, idx) => (
              <motion.div
                key={`${card.id}-${idx}`}
                style={{
                  opacity: 0.35,
                  transform: `rotate(${((idx % 7) - 3) * 2}deg)`,
                }}
                whileHover={{ opacity: 0.7, scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <GameCard card={card} />
              </motion.div>
            ))}
          </motion.div>
        )
      })}

      {/* Dark gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.4) 50%, rgba(10,10,10,0.8) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,10,0.8) 100%)',
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

        {/* Play button */}
        <motion.button
          onClick={onPlay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(201,162,39,0.3)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '18px 48px',
            fontSize: '1rem',
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#0a0a0a',
            background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #C9A227 100%)',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(201,162,39,0.2)',
            transition: 'all 0.3s ease',
          }}
        >
          Play Offline
        </motion.button>

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
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 200,
            color: '#FFFFFF',
            marginBottom: 48,
            letterSpacing: '0.1em',
          }}
        >
          Select Players
        </motion.h2>

        <div style={{ display: 'flex', gap: 20, marginBottom: 48 }}>
          {[3, 4, 5].map((count, index) => (
            <motion.button
              key={count}
              onClick={() => onSelect(count)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{
                scale: 1.08,
                borderColor: 'rgba(201,162,39,0.8)',
                boxShadow: '0 0 30px rgba(201,162,39,0.2)',
              }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 100,
                height: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '2.5rem', fontWeight: 200 }}>{count}</span>
            </motion.button>
          ))}
        </div>

        <motion.button
          onClick={onBack}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ color: 'rgba(255,255,255,0.8)' }}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            padding: 8,
            transition: 'color 0.3s ease',
          }}
        >
          Back
        </motion.button>
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
