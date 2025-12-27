import { motion } from 'framer-motion'
import { GalleryCard } from './GalleryCard'
import type { CardData } from '../Card'

interface GalleryGridProps {
  cards: Array<{ card: CardData; cardNumber: string }>
  onCardClick: (card: CardData) => void
  filterKey?: string
}

export function GalleryGrid({ cards, onCardClick, filterKey }: GalleryGridProps) {
  if (cards.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <p style={{ fontSize: '1rem', margin: 0 }}>
          No cards found matching your search.
        </p>
      </div>
    )
  }

  // Container variants for stagger animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
      },
    },
  }

  // Item variants
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  }

  return (
    <motion.div
      key={filterKey}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '20px',
        padding: '0 24px',
      }}
    >
      {cards.map(({ card, cardNumber }) => (
        <motion.div key={card.id} variants={itemVariants}>
          <GalleryCard
            card={card}
            cardNumber={cardNumber}
            onClick={() => onCardClick(card)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
