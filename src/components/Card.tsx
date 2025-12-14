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
}

// Auction icon component
function AuctionIcon({ type, color, size = 16 }: { type: AuctionType; color: string; size?: number }) {
  const iconStyle = { width: size, height: size }

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

export function Card({ card, size = 'md', className = '' }: CardProps) {
  const artist = ARTISTS[card.artistIndex] || ARTISTS[0]
  const config = sizeConfig[size]

  return (
    <div
      className={className}
      style={{
        width: config.width,
        height: config.height,
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
      </div>
    </div>
  )
}