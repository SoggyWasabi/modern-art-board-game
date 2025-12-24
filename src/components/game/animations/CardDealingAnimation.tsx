import React, { useEffect, useState } from 'react'
import { useGameStore } from '../../../store/gameStore'

interface CardDealingAnimationProps {
  show: boolean
}

/**
 * Animates cards being dealt to players at the start of a new round
 * Shows cards sliding from center to each player's hand
 */
const CardDealingAnimation: React.FC<CardDealingAnimationProps> = ({ show }) => {
  const { gameState } = useGameStore()
  const [cardsDealingTo, setCardsDealingTo] = useState<number[]>([])

  useEffect(() => {
    if (show && gameState) {
      // Stagger card dealing animation for each player
      const playerIndices = gameState.players.map((_, i) => i)

      // Deal to each player with a stagger
      playerIndices.forEach((playerIndex, i) => {
        setTimeout(() => {
          setCardsDealingTo((prev) => [...prev, playerIndex])
        }, i * 200) // Stagger by 200ms per player
      })

      // Clear after animation completes
      setTimeout(() => {
        setCardsDealingTo([])
      }, playerIndices.length * 200 + 1000)

      return () => {
        setCardsDealingTo([])
      }
    }
  }, [show, gameState])

  if (!show || !gameState || cardsDealingTo.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 75,
      }}
    >
      {/* Show dealing indicator for each player receiving cards */}
      {cardsDealingTo.map((playerIndex) => {
        const player = gameState.players[playerIndex]
        const isHumanPlayer = playerIndex === 0

        return (
          <div
            key={playerIndex}
            style={{
              position: 'absolute',
              // Position based on player type
              ...(isHumanPlayer
                ? {
                    // Human player - bottom center
                    bottom: '160px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }
                : {
                    // AI players - right side
                    right: '40px',
                    top: `${100 + playerIndex * 120}px`,
                  }),
              animation: 'dealCard 0.8s ease-out',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '8px',
                padding: '8px 16px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  animation: 'cardFlip 0.6s ease-in-out',
                }}
              >
                🃏
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                {isHumanPlayer ? 'Cards dealt!' : `${player.name} dealt`}
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes dealCard {
          0% {
            opacity: 0;
            transform: translate(-50%, -100px) scale(0.5);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes cardFlip {
          0%, 100% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(180deg);
          }
        }
      `}</style>
    </div>
  )
}

export default CardDealingAnimation
