import { useState, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import MainGameplay from './components/game/MainGameplay'
import { ErrorBoundary } from './components/game/ErrorBoundary'
import { RulesPage } from './components/rules/RulesPage'
import { LandingPage, ColorBarNav } from './pages/LandingPage'
import { PlayerCountSelection } from './pages/PlayerCountSelection'
import { CARD_DISTRIBUTION, ARTIST_COLORS } from './engine/constants'

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
// CONSTANTS (imported from engine/constants where available)
// ============================================================================

// NOTE: ARTIST_COLORS imported from engine/constants
// NOTE: CARD_DISTRIBUTION imported from engine/constants (using Record<Artist, number> format)

// Convert the Record format to array for legacy code
const DISTRIBUTION_ARRAY = Object.values(CARD_DISTRIBUTION) // [12, 13, 14, 15, 16]

const AUCTION_TYPES: AuctionType[] = ['open', 'one_offer', 'hidden', 'fixed_price', 'double']

// ============================================================================
// GENERATE ALL 70 CARDS
// ============================================================================

function generateAllCards(): CardData[] {
  const cards: CardData[] = []
  let globalIndex = 0

  ARTIST_COLORS.forEach((artist, artistIndex) => {
    const count = DISTRIBUTION_ARRAY[artistIndex]
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
      // Eye icon (everyone can see/open bids)
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      )
    case 'one_offer':
      // Star with "1" inside
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={color}
          >
            1
          </text>
        </svg>
      )
    case 'hidden':
      // Padlock icon (sealed bids)
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" fill="none" />
          <path
            d="M7 11V7a5 5 0 0110 0v4"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.5" fill={color} />
          <path d="M12 17.5v1" stroke={color} strokeWidth="2" strokeLinecap="round" />
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
      // Gavel with hammer head and x2 text
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <line
            x1="5"
            y1="18"
            x2="15"
            y2="8"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect
            x="9"
            y="4"
            width="16"
            height="5"
            rx="2.5"
            fill={color}
            transform="rotate(45 17 6.5)"
          />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fontSize="6"
            fontWeight="bold"
            fill={color}
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
// CARD ARTWORK COMPONENT (with image loading)
// ============================================================================

function PlaceholderArt({ artistIndex, cardIndex }: { artistIndex: number; cardIndex: number }) {
  const seed = artistIndex * 100 + cardIndex

  // Artist folder names (lowercase, underscored)
  const artistFolders: Record<number, string> = {
    0: 'manuel_carvalho',
    1: 'daniel_melim',
    2: 'sigrid_thaler',
    3: 'ramon_martins',
    4: 'rafael_silveira',
  }

  const artistFolder = artistFolders[artistIndex] || 'manuel_carvalho'
  const imagePath = `/assets/artworks/${artistFolder}/${artistFolder}_${String(cardIndex).padStart(2, '0')}.png`

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
      {/* Try to load image, hide on error to show gradient */}
      <img
        src={imagePath}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      {/* Abstract shapes overlay (subtle) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.15,
          pointerEvents: 'none',
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
          fill="rgba(0,0,0,0.1)"
          transform={`rotate(${(seed % 30) - 15} ${60 + (seed % 25)} ${55 + (seed % 30)})`}
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
  const artist = ARTIST_COLORS[card.artistIndex]

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
// PAGE WRAPPERS
// ============================================================================

function LandingPageWrapper() {
  const navigate = useNavigate()

  return (
    <>
      <FloatingCardsBackground />
      <ColorBarNav onNavigate={(item) => {
        if (item === 'rules') navigate('/rules')
      }} />
      <LandingPage onPlay={() => navigate('/player-count')} />
    </>
  )
}

function PlayerCountSelectionWrapper() {
  const navigate = useNavigate()
  const { startGameFromSetup, setPlayerCount: storeSetPlayerCount } = useGameStore()

  const handlePlayerCountSelect = (count: number, playerStarts: boolean = false, debugMode: boolean = false) => {
    storeSetPlayerCount(count as 3 | 4 | 5)

    if (debugMode) {
      console.log('[handlePlayerCountSelect] Loading debug mode scenario')
      useGameStore.getState().loadDebugScenario(count as 3 | 4 | 5)
    } else {
      startGameFromSetup()

      const { gameState } = useGameStore.getState()
      if (gameState) {
        if (playerStarts) {
          console.log('[handlePlayerCountSelect] Human selected to go first')
          useGameStore.getState().setFirstPlayerIndex(0)
        } else {
          const randomIndex = Math.floor(Math.random() * count)
          console.log('[handlePlayerCountSelect] Randomly selected first player:', randomIndex, 'Player:', gameState.players[randomIndex]?.name)
          useGameStore.getState().setFirstPlayerIndex(randomIndex)
        }
      }
    }

    navigate('/game')
  }

  return (
    <>
      <FloatingCardsBackground />
      <ColorBarNav onNavigate={(item) => {
        if (item === 'rules') navigate('/rules')
      }} />
      <PlayerCountSelection
        onSelect={handlePlayerCountSelect}
        onBack={() => navigate('/')}
      />
    </>
  )
}

function RulesPageWrapper() {
  const navigate = useNavigate()
  return (
    <>
      <FloatingCardsBackground />
      <RulesPage onBack={() => navigate('/')} />
    </>
  )
}

function GamePageWrapper() {
  const navigate = useNavigate()
  const { resetGame, gameState } = useGameStore()

  const handleReturnToMenu = () => {
    navigate('/')
  }

  // Route guard: redirect if game not initialized
  if (!gameState) {
    return <Navigate to="/player-count" replace />
  }

  return (
    <ErrorBoundary>
      <MainGameplay onExitToMenu={handleReturnToMenu} />
    </ErrorBoundary>
  )
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageWrapper />} />
      <Route path="/player-count" element={<PlayerCountSelectionWrapper />} />
      <Route path="/rules" element={<RulesPageWrapper />} />
      <Route path="/game" element={<GamePageWrapper />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
