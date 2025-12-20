import React, { useState } from 'react'
import { Card as GameCardComponent } from '../Card'
import type { Card } from '../../types'
import { colors } from '../../design/premiumTokens'

interface PlayerHandProps {
  cards: Card[]
  selectedCardId: string | null
  onSelectCard: (cardId: string) => void
  money: number
  disabled?: boolean
  purchasedThisRound?: Card[]
  // Double auction highlighting support
  getCardHighlightStatus?: (card: Card) => { isHighlighted: boolean; isDisabled: boolean }
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  money,
  disabled = false,
  purchasedThisRound = [],
  getCardHighlightStatus,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Sort cards by artist for better organization
  const sortedCards = React.useMemo(() => {
    const artistOrder = ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira']
    return [...cards].sort((a, b) => {
      const aIndex = artistOrder.indexOf(a.artist)
      const bIndex = artistOrder.indexOf(b.artist)
      return aIndex - bIndex
    })
  }, [cards])

  // Calculate fan layout for desktop
  const getFanStyle = (index: number, total: number) => {
    const maxAngle = Math.min(20, total * 2) // Reduced from 30 to 20 degrees total spread
    const angleStep = total > 1 ? maxAngle / (total - 1) : 0
    const angle = total > 1 ? -maxAngle / 2 + angleStep * index : 0

    const isHovered = hoveredCard === sortedCards[index]?.id
    const isSelected = selectedCardId === sortedCards[index]?.id

    return {
      transform: `rotate(${angle}deg) translateY(${isHovered || isSelected ? -20 : 0}px)`,
      transformOrigin: 'bottom center',
      zIndex: isHovered || isSelected ? 1000 : index + 100, // Higher z-index to sit above other elements
      transition: 'transform 0.15s ease, z-index 0.15s ease',
    }
  }

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5))',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: 'none',
        padding: '16px 20px 12px',
        height: '140px', // Slightly taller for better card display
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Main content - Cards and meta info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flex: 1,
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Left side - Money and card count */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-start',
            paddingBottom: '8px',
            minWidth: '80px',
          }}
        >
          <div
            style={{
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: colors.accent.gold,
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)',
            }}
          >
            <span style={{ fontSize: '16px' }}>💰</span>
            ${money}k
          </div>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '13px',
              fontWeight: 600,
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {cards.length} cards
          </div>
        </div>

        {/* Center - Cards */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
          {cards.length > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                height: '100%',
                position: 'relative',
              }}
            >
              {sortedCards.map((card, index) => {
                const fanStyle = getFanStyle(index, sortedCards.length)
                const isSelected = selectedCardId === card.id

                return (
                  <div
                    key={card.id}
                    style={{
                      marginLeft: index === 0 ? 0 : '-30px', // Slightly more overlap
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      ...fanStyle,
                    }}
                    onMouseEnter={() => !disabled && setHoveredCard(card.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => !disabled && onSelectCard(card.id)}
                  >
                    <div
                      style={{
                        borderRadius: '8px',
                        boxShadow: isSelected
                          ? `0 0 20px ${colors.accent.gold}, 0 8px 25px rgba(0,0,0,0.5)`
                          : '0 4px 15px rgba(0,0,0,0.4)',
                        border: isSelected ? `2px solid ${colors.accent.gold}` : '1px solid rgba(255,255,255,0.1)',
                        animation: isSelected ? 'card-selected-glow 2s ease-in-out infinite' : 'none',
                        opacity: disabled ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <GameCardComponent
                        card={{
                          id: card.id,
                          artist: card.artist,
                          artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
                          cardIndex: parseInt(card.id.split('_')[1]) || 0,
                          auctionType: card.auctionType
                        }}
                        size="md" // Back to medium size
                        isHighlighted={getCardHighlightStatus?.(card)?.isHighlighted || false}
                        isDisabled={getCardHighlightStatus?.(card)?.isDisabled || disabled}
                        onClick={() => !disabled && onSelectCard(card.id)}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Selected card indicator */}
              {selectedCardId && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(251, 191, 36, 0.25)',
                    color: colors.accent.gold,
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    animation: 'card-selected-glow 2s ease-in-out infinite',
                  }}
                >
                  Card Selected
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: '14px',
                fontStyle: 'italic',
                height: '100%',
              }}
            >
              <div style={{ marginBottom: '8px' }}>No cards in hand</div>
            </div>
          )}
        </div>

        {/* Right side - Purchased cards indicator */}
        {purchasedThisRound.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              paddingBottom: '8px',
              minWidth: '60px',
            }}
          >
            <div
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                color: colors.accent.gold,
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              🖼️ {purchasedThisRound.length}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerHand
