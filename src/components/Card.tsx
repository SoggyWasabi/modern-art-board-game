// Artist configurations
const ARTISTS = [
  { name: 'Manuel Carvalho', color: '#F5C846', textColor: '#000000' },
  { name: 'Daniel Melim', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Sigrid Thaler', color: '#2DD4BF', textColor: '#000000' },
  { name: 'Ramon Martins', color: '#22C55E', textColor: '#000000' },
  { name: 'Rafael Silveira', color: '#A855F7', textColor: '#FFFFFF' },
]

type AuctionType = 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'

// Card interface
export interface CardData {
  id: string
  artist: string
  artistIndex: number
  cardIndex: number
  auctionType: AuctionType
}

interface CardProps {
  card: CardData
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  isHighlighted?: boolean  // Golden glow for matching cards in double auction
  isDisabled?: boolean     // Dimmed for non-matching cards in double auction
  onClick?: () => void     // Click handler for card selection
}

// Auction icon component
function AuctionIcon({ type, color, size = 16 }: { type: AuctionType; color: string; size?: number }) {
  const iconStyle = { width: size, height: size }

  switch (type) {
    case 'open':
      // Eye icon (simple, elegant)
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
      // Padlock icon
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
          {/* Gavel handle at 45 degrees - moved slightly left */}
          <line
            x1="5"
            y1="18"
            x2="15"
            y2="8"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Hammer head - rounded rectangle at top of handle, tilted 45 degrees - doubled in width - moved left */}
          <rect
            x="9"
            y="4"
            width="16"
            height="5"
            rx="2.5"
            fill={color}
            transform="rotate(45 17 6.5)"
          />
          {/* x2 text - moved left */}
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

// Placeholder art component
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

// Size configurations
const sizeConfig = {
  sm: { width: '80px', height: '112px', headerHeight: '20px', fontSize: 10, iconSize: 14 },
  md: { width: '120px', height: '168px', headerHeight: '24px', fontSize: 12, iconSize: 16 },
  lg: { width: '160px', height: '224px', headerHeight: '30px', fontSize: 14, iconSize: 18 },
  xl: { width: '200px', height: '280px', headerHeight: '36px', fontSize: 16, iconSize: 20 },
}

export function Card({
  card,
  size = 'md',
  className = '',
  isHighlighted = false,
  isDisabled = false,
  onClick
}: CardProps) {
  const artist = ARTISTS[card.artistIndex] || ARTISTS[0]
  const config = sizeConfig[size]

  // Base styles
  const baseStyles = {
    width: config.width,
    height: config.height,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    flexShrink: 0,
    position: 'relative' as const,
    transition: 'all 0.3s ease',
    cursor: onClick ? 'pointer' : 'default',
  }

  // Highlighted styles (golden glow + animation)
  const highlightedStyles = isHighlighted ? {
    boxShadow: `
      0 0 20px rgba(251, 191, 36, 0.6),
      0 0 40px rgba(251, 191, 36, 0.4),
      0 8px 32px rgba(0,0,0,0.6)
    `,
    transform: 'scale(1.05)',
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      inset: -2,
      borderRadius: 10,
      padding: 2,
      background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #fbbf24)',
      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'xor',
      animation: 'pulse 2s ease-in-out infinite',
    }
  } : {}

  // Disabled styles (dimmed + grayscale)
  const disabledStyles = isDisabled ? {
    opacity: 0.4,
    filter: 'grayscale(80%)',
    cursor: 'not-allowed',
    transform: 'scale(0.95)',
  } : {}

  // Hover effects for highlighted cards
  const hoverStyles = isHighlighted && onClick ? {
    '&:hover': {
      transform: 'scale(1.08)',
      boxShadow: `
        0 0 25px rgba(251, 191, 36, 0.8),
        0 0 50px rgba(251, 191, 36, 0.6),
        0 8px 32px rgba(0,0,0,0.6)
      `,
    }
  } : {}

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
      <div
        className={className}
        onClick={isDisabled ? undefined : onClick}
        style={{
          ...baseStyles,
          ...highlightedStyles,
          ...disabledStyles,
        }}
      >
      {/* Header */}
      <div
        style={{
          height: config.headerHeight,
          backgroundColor: artist.color,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        <AuctionIcon type={card.auctionType} color={artist.textColor} size={config.iconSize} />
        <span
          style={{
            color: artist.textColor,
            fontSize: config.fontSize,
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
      <div style={{ height: `calc(${config.height} - ${config.headerHeight})` }}>
        <PlaceholderArt artistIndex={card.artistIndex} cardIndex={card.cardIndex} />

        {/* Selection indicator for highlighted cards */}
        {isHighlighted && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              backgroundColor: 'rgba(251, 191, 36, 0.9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid #1a1a1a',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8l3 3 7-7"
                stroke="#1a1a1a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* "Double Auction" hint overlay */}
        {isHighlighted && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fbbf24',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '4px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Offer This
          </div>
        )}
      </div>
      </div>
    </>
  )
}