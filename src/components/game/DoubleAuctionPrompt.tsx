import React from 'react'
import { useGameStore } from '../../store/gameStore'
import type { DoubleAuctionState } from '../../types/auction'
import type { Card } from '../../types/game'

interface DoubleAuctionPromptProps {
  auction: DoubleAuctionState
  onOfferCard: (cardId: string) => void
  onDecline: () => void
}

/**
 * Component for prompting user to offer a second card in Double auction
 */
const DoubleAuctionPrompt: React.FC<DoubleAuctionPromptProps> = ({
  auction,
  onOfferCard,
  onDecline
}) => {
  const { gameState } = useGameStore()

  if (!gameState) return null

  const currentPlayer = gameState.players[0] // Assuming player 0 is human
  const isPlayerTurn = auction.currentAuctioneerId === currentPlayer.id && !auction.secondCard

  // Find matching cards in player's hand (same artist, not Double type)
  const matchingCards = currentPlayer.hand.filter(card =>
    card.artist === auction.doubleCard.artist && card.auctionType !== 'double'
  )

  if (!isPlayerTurn || matchingCards.length === 0) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #2d3436 0%, #1a1c20 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          color: 'white',
        }}
      >
        <h2
          style={{
            marginBottom: '16px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#f59e0b',
            textAlign: 'center',
          }}
        >
          Double Auction!
        </h2>

        <div
          style={{
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '16px',
            lineHeight: 1.5,
          }}
        >
          You played a <strong>Double</strong> card for <strong>{auction.doubleCard.artist}</strong>.<br/>
          You may offer a second card of the same artist to auction both cards together.<br/>
          The auction type will follow the second card's type.
        </div>

        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <h3
            style={{
              marginBottom: '12px',
              fontSize: '18px',
              color: '#f59e0b',
            }}
          >
            Matching Cards in Your Hand:
          </h3>

          {matchingCards.length === 0 ? (
            <p style={{ color: '#ff6b6b', fontStyle: 'italic' }}>
              You have no matching cards of this artist.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
              }}
            >
              {matchingCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onOfferCard(card.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'white',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.3)'
                    e.currentTarget.style.borderColor = '#f59e0b'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    {card.artist}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {card.auctionType}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>
                    Auction Type
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onDecline}
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 107, 107, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Decline to Offer
          </button>
        </div>

        <div
          style={{
            marginTop: '16px',
            fontSize: '12px',
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          If you decline, the offer passes clockwise to other players.
          If no one offers, you get the Double card for free.
        </div>
      </div>
    </div>
  )
}

export default DoubleAuctionPrompt