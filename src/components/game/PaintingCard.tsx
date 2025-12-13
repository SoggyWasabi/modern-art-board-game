import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import type { Card, Artist, AuctionType } from '../../types'
import { tokens } from '../../design/tokens'

interface PaintingCardProps {
  card: Card
  size: 'sm' | 'md' | 'lg'
  showAuctionType?: boolean
  interactive?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

const AUCTION_TYPE_ICONS = {
  open: '📢',
  one_offer: '👆',
  hidden: '🤫',
  fixed_price: '💰',
  double: '🎯',
}

const cardDimensions = {
  sm: { width: '60px', height: '84px' },
  md: { width: '120px', height: '168px' },
  lg: { width: '200px', height: '280px' },
}

export const PaintingCard: React.FC<PaintingCardProps> = ({
  card,
  size,
  showAuctionType = false,
  interactive = false,
  selected = false,
  disabled = false,
  onClick,
  orientation = 'vertical',
  className,
}) => {
  const dimensions = cardDimensions[size]
  const artistColor = tokens.colors.artists[card.artist as Artist]
  const auctionIcon = AUCTION_TYPE_ICONS[card.auctionType as AuctionType]

  const cardClasses = clsx(
    'relative bg-white rounded-lg border-2 overflow-hidden transition-all duration-200',
    {
      'border-gray-200 hover:border-gray-400': !selected && !disabled,
      'border-blue-500 shadow-lg': selected,
      'border-gray-300 opacity-60 cursor-not-allowed': disabled,
      'cursor-pointer hover:shadow-xl hover:scale-105': interactive && !disabled,
    },
    className
  )

  return (
    <motion.div
      className={cardClasses}
      style={dimensions}
      whileHover={interactive && !disabled ? { y: -5, rotate: 2 } : {}}
      whileTap={interactive && !disabled ? { scale: 0.98 } : {}}
      onClick={interactive && !disabled ? onClick : undefined}
      layoutId={card.id} // For layout animations
    >
      {/* Card background with artist color hint */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundColor: artistColor[500] }}
      />

      {/* Artist header */}
      <div
        className="absolute top-0 left-0 right-0 p-1 bg-white/90 backdrop-blur-sm border-b border-gray-200"
        style={{ backgroundColor: artistColor[50] }}
      >
        <p className="text-xs font-semibold truncate" style={{ color: artistColor[900] }}>
          {card.artist.split(' ').map((n: string) => n[0]).join('')}
        </p>
      </div>

      {/* Artwork placeholder - replace with actual artwork */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full h-full rounded flex items-center justify-center text-4xl font-bold opacity-20"
          style={{ backgroundColor: artistColor[100], color: artistColor[500] }}
        >
          {card.artist.charAt(0)}
        </div>
      </div>

      {/* Auction type indicator */}
      {showAuctionType && (
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-xs">
          {auctionIcon}
        </div>
      )}

      {/* Card ID for debugging (remove in production) */}
      {import.meta.env.DEV && (
        <div className="absolute top-6 left-1 text-xs text-gray-500 opacity-50">
          {card.id}
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <motion.div
          className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        />
      )}

      {/* Disabled overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-gray-500/30 pointer-events-none" />
      )}
    </motion.div>
  )
}