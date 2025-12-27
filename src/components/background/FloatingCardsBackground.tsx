import { useMemo } from 'react'
import { ALL_CARDS, type AuctionType, type CardData } from '../../shared/services/cardGenerator'
import { ARTIST_COLORS, getArtistFolderName } from '../../engine/constants'

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
            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      )
    case 'one_offer':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill={color}>
            1
          </text>
        </svg>
      )
    case 'hidden':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" fill="none" />
          <path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.5" fill={color} />
          <path d="M12 17.5v1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'fixed_price':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" />
          <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill={color}>
            $
          </text>
        </svg>
      )
    case 'double':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <line x1="5" y1="18" x2="15" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <rect x="9" y="4" width="16" height="5" rx="2.5" fill={color} transform="rotate(45 17 6.5)" />
          <text x="16" y="21" textAnchor="middle" fontSize="6" fontWeight="bold" fill={color}>
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

  const artistFolder = getArtistFolderName(artistIndex)
  const imagePath = `/assets/artworks/${artistFolder}/${artistFolder}_${String(cardIndex).padStart(2, '0')}.png`

  const gradients: Record<number, string> = {
    0: `linear-gradient(${135 + (seed % 90)}deg, hsl(${35 + (seed % 20)}, 75%, ${35 + (seed % 15)}%) 0%, hsl(${25 + (seed % 30)}, 65%, ${25 + (seed % 20)}%) 100%)`,
    1: `linear-gradient(${180 + (seed % 60)}deg, hsl(${0 + (seed % 15)}, 70%, ${30 + (seed % 15)}%) 0%, hsl(${350 + (seed % 20)}, 60%, ${20 + (seed % 15)}%) 100%)`,
    2: `linear-gradient(${160 + (seed % 80)}deg, hsl(${175 + (seed % 20)}, 55%, ${30 + (seed % 15)}%) 0%, hsl(${185 + (seed % 25)}, 45%, ${20 + (seed % 20)}%) 100%)`,
    3: `linear-gradient(${140 + (seed % 70)}deg, hsl(${130 + (seed % 30)}, 50%, ${30 + (seed % 15)}%) 0%, hsl(${110 + (seed % 40)}, 40%, ${20 + (seed % 20)}%) 100%)`,
    4: `linear-gradient(${150 + (seed % 90)}deg, hsl(${280 + (seed % 30)}, 55%, ${35 + (seed % 15)}%) 0%, hsl(${260 + (seed % 40)}, 45%, ${20 + (seed % 20)}%) 100%)`,
  }

  return (
    <div style={{ width: '100%', height: '100%', background: gradients[artistIndex % 5], position: 'relative', overflow: 'hidden' }}>
      <img
        src={imagePath}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <circle cx={25 + (seed % 50)} cy={30 + (seed % 40)} r={8 + (seed % 15)} fill="rgba(255,255,255,0.15)" />
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
// GAME CARD COMPONENT (for background animation)
// ============================================================================

const CARD_WIDTH = 'clamp(120px, 12vw, 200px)'
const CARD_HEIGHT = 'clamp(168px, 16.8vw, 280px)'
const HEADER_HEIGHT = 'clamp(24px, 2.4vw, 36px)'

function GameCard({ card }: { card: CardData }) {
  const artist = ARTIST_COLORS[card.artistIndex]

  return (
    <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: '#1a1a1a', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', flexShrink: 0 }}>
      <div style={{ height: HEADER_HEIGHT, backgroundColor: artist.color, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 8 }}>
        <AuctionIcon type={card.auctionType} color={artist.textColor} />
        <span style={{ color: artist.textColor, fontSize: 'clamp(8px, 0.8vw, 12px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {artist.name}
        </span>
      </div>
      <div style={{ height: `calc(${CARD_HEIGHT} - ${HEADER_HEIGHT})` }}>
        <PlaceholderArt artistIndex={card.artistIndex} cardIndex={card.cardIndex} />
      </div>
    </div>
  )
}

// ============================================================================
// FLOATING CARDS BACKGROUND COMPONENT
// ============================================================================

export function FloatingCardsBackground() {
  const rows = useMemo(() => {
    const rowCount = 4
    const cardsPerRow = Math.ceil(ALL_CARDS.length / rowCount)
    return Array.from({ length: rowCount }, (_, i) => ALL_CARDS.slice(i * cardsPerRow, (i + 1) * cardsPerRow))
  }, [])

  const rowHeight = 'clamp(180px, 18vw, 300px)'

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#0a0a0a', zIndex: 0 }}>
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
            style={{ position: 'absolute', top: yOffset, left: 0, display: 'flex', gap: 'clamp(12px, 1.5vw, 24px)', animation: `${isReverse ? 'scroll-right' : 'scroll-left'} ${duration}s linear infinite`, willChange: 'transform' }}
          >
            {[...rowCards, ...rowCards, ...rowCards].map((card, idx) => (
              <div key={`${card.id}-${idx}`} style={{ opacity: 0.4, transform: `rotate(${((idx % 5) - 2) * 1.5}deg)` }}>
                <GameCard card={card} />
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.3) 50%, rgba(10,10,10,0.7) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,10,0.7) 100%)', pointerEvents: 'none' }} />
    </div>
  )
}
