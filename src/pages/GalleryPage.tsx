import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ALL_CARDS, ARTISTS } from '../shared/services/cardGenerator'
import { getArtistInitials } from '../engine/constants'
import type { CardData } from '../components/Card'
import { GalleryGrid } from '../components/gallery/GalleryGrid'
import { ArtistFilterTabs } from '../components/gallery/ArtistFilterTabs'
import { CardLightbox } from '../components/gallery/CardLightbox'

// Helper to get card number (e.g., "M-01", "D-07")
function getCardNumber(card: CardData): string {
  const initial = getArtistInitials(card.artistIndex)
  return `${initial}-${String(card.cardIndex).padStart(2, '0')}`
}

// Sort cards by artist then card index for gallery display
const sortedCards = [...ALL_CARDS].sort((a, b) => {
  if (a.artistIndex !== b.artistIndex) {
    return a.artistIndex - b.artistIndex
  }
  return a.cardIndex - b.cardIndex
})

// Create enriched card data with numbers
const enrichedCards = sortedCards.map((card) => ({
  card,
  cardNumber: getCardNumber(card),
}))

interface GalleryPageProps {
  onBack: () => void
}

export function GalleryPage({ onBack }: GalleryPageProps) {
  const [selectedArtist, setSelectedArtist] = useState<string>('all')
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)

  // Filter cards based on artist selection
  const filteredCards = useMemo(() => {
    if (selectedArtist === 'all') {
      return enrichedCards
    }
    return enrichedCards.filter(({ card }) => card.artist === selectedArtist)
  }, [selectedArtist])

  // Handle card click - open lightbox
  const handleCardClick = (card: CardData) => {
    setSelectedCard(card)
  }

  // Navigate to next card
  const handleNext = () => {
    if (!selectedCard) return
    const currentIndex = filteredCards.findIndex((c) => c.card.id === selectedCard.id)
    const nextIndex = (currentIndex + 1) % filteredCards.length
    setSelectedCard(filteredCards[nextIndex].card)
  }

  // Navigate to previous card
  const handlePrevious = () => {
    if (!selectedCard) return
    const currentIndex = filteredCards.findIndex((c) => c.card.id === selectedCard.id)
    const prevIndex = currentIndex === 0 ? filteredCards.length - 1 : currentIndex - 1
    setSelectedCard(filteredCards[prevIndex].card)
  }

  // Get current selected card data for lightbox
  const selectedCardData = selectedCard
    ? filteredCards.find((c) => c.card.id === selectedCard.id)
    : null
  const currentIndex = selectedCardData
    ? filteredCards.findIndex((c) => c.card.id === selectedCard?.id)
    : 0

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#C9A227'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 200,
                letterSpacing: '0.15em',
                margin: 0,
                background:
                  'linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #C9A227 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              GALLERY
            </h1>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '4px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              {filteredCards.length} of {enrichedCards.length} artworks
            </div>
          </div>

          <div style={{ width: '80px' }} />
        </div>
      </motion.header>

      {/* Main Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '24px',
        }}
      >
        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <ArtistFilterTabs
            selectedArtist={selectedArtist}
            onSelect={setSelectedArtist}
          />
        </motion.div>

        {/* Gallery Grid */}
        <GalleryGrid
          cards={filteredCards}
          onCardClick={handleCardClick}
          filterKey={selectedArtist}
        />
      </main>

      {/* Lightbox */}
      {selectedCardData && selectedCard && (
        <CardLightbox
          card={selectedCard}
          cardNumber={selectedCardData.cardNumber}
          allCards={filteredCards.map((c) => c.card)}
          currentIndex={currentIndex}
          onClose={() => setSelectedCard(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </div>
  )
}
