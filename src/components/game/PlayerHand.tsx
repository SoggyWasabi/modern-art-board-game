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
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  money,
  disabled = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Calculate fan layout for desktop
  const getFanStyle = (index: number, total: number) => {
    const maxAngle = Math.min(30, total * 4) // Cap at 30 degrees total spread
    const angleStep = total > 1 ? maxAngle / (total - 1) : 0
    const angle = total > 1 ? -maxAngle / 2 + angleStep * index : 0

    const isHovered = hoveredCard === cards[index]?.id
    const isSelected = selectedCardId === cards[index]?.id

    return {
      transform: `rotate(${angle}deg) translateY(${isHovered || isSelected ? -16 : 0}px)`,
      transformOrigin: 'bottom center',
      zIndex: isHovered || isSelected ? 100 : index,
      transition: 'transform 0.15s ease, z-index 0.15s ease',
    }
  }

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: 'none',
        padding: '16px 24px 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Your Hand
          </span>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        {/* Money display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '20px',
          }}
        >
          <span style={{ fontSize: '14px' }}>💰</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: colors.accent.gold,
            }}
          >
            ${money}k
          </span>
        </div>
      </div>

      {/* Cards */}
      {cards.length > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            minHeight: '180px',
            paddingTop: '20px',
            // For mobile: horizontal scroll
            overflowX: 'auto',
            overflowY: 'visible',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              position: 'relative',
              paddingBottom: '10px',
            }}
          >
            {cards.map((card, index) => {
              const fanStyle = getFanStyle(index, cards.length)
              const isSelected = selectedCardId === card.id

              return (
                <div
                  key={card.id}
                  style={{
                    marginLeft: index === 0 ? 0 : '-30px', // Overlap cards
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
                        ? `0 0 20px ${colors.accent.gold}, 0 8px 24px rgba(0,0,0,0.4)`
                        : '0 4px 12px rgba(0,0,0,0.3)',
                      border: isSelected ? `3px solid ${colors.accent.gold}` : 'none',
                      animation: isSelected ? 'card-selected-glow 2s ease-in-out infinite' : 'none',
                      opacity: disabled ? 0.5 : 1,
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
                      size="lg"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '180px',
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '14px',
            fontStyle: 'italic',
          }}
        >
          No cards in hand
        </div>
      )}

      {/* Selected card action hint */}
      {selectedCardId && !disabled && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '12px',
            animation: 'fade-in-up 0.3s ease-out',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: colors.accent.gold,
              fontWeight: 500,
            }}
          >
            Card selected - Click "Play Card" to start auction
          </span>
        </div>
      )}
    </div>
  )
}

export default PlayerHand
