import { CardArtwork } from '../Card'
import type { CardData } from '../Card'
import { getArtistColor } from '../../engine/constants'

interface GalleryCardProps {
  card: CardData
  cardNumber: string
  onClick: () => void
}

// Card number badge for gallery display
function CardNumberBadge({ cardNumber, color }: { cardNumber: string; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: `${color}E6`,
        color: '#000000',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.5px',
        padding: '3px 6px',
        borderRadius: '4px',
        textTransform: 'uppercase',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      {cardNumber}
    </div>
  )
}

export function GalleryCard({ card, cardNumber, onClick }: GalleryCardProps) {
  const artistColor = getArtistColor(card.artistIndex).color

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3/4',
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
      }}
    >
      <CardNumberBadge cardNumber={cardNumber} color={artistColor} />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <CardArtwork artistIndex={card.artistIndex} cardIndex={card.cardIndex} />
      </div>
    </div>
  )
}
