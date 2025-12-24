import React, { useEffect, useState } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { calculatePlayerSaleEarnings } from '../../../engine/selling'
import type { Player } from '../../../types'

interface PurchaseSaleAnimationProps {
  show: boolean
}

/**
 * Displays $$ indicators over purchased cards for all players
 * Clears purchased cards and shows money animation for 10 seconds
 */
const PurchaseSaleAnimation: React.FC<PurchaseSaleAnimationProps> = ({ show }) => {
  const { gameState } = useGameStore()
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      setFadeOut(false)

      // Start fade out after 9 seconds (total 10s display)
      const fadeTimer = setTimeout(() => {
        setFadeOut(true)
      }, 9000)

      // Hide completely after 10 seconds
      const hideTimer = setTimeout(() => {
        setVisible(false)
      }, 10000)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    } else {
      setVisible(false)
      setFadeOut(false)
    }
  }, [show])

  if (!visible || !gameState) return null

  const playersWithPurchases = gameState.players.filter(
    (player: Player) => player.purchasedThisRound.length > 0
  )

  if (playersWithPurchases.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-out',
      }}
    >
      {/* Overlay $$ indicators for each player's purchased cards */}
      {playersWithPurchases.map((player: Player, playerIndex: number) => {
        // Calculate earnings from selling paintings purchased this round
        const soldValue = calculatePlayerSaleEarnings(gameState, player.id)

        return (
          <div
            key={player.id}
            style={{
              position: 'absolute',
              // Position based on whether it's the human player (bottom) or opponent (right panel)
              // This is a simplified positioning - you may need to adjust based on actual layout
              ...(playerIndex === 0
                ? {
                    // Human player - bottom right
                    bottom: '20px',
                    right: '20px',
                  }
                : {
                    // AI players - right side, stacked
                    right: '20px',
                    top: `${100 + playerIndex * 120}px`,
                  }),
              animation: 'moneyPulse 2s ease-in-out infinite',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                borderRadius: '12px',
                padding: '16px 24px',
                boxShadow: '0 0 40px rgba(251, 191, 36, 0.6), 0 8px 16px rgba(0, 0, 0, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  letterSpacing: '0.05em',
                }}
              >
                $$
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}
              >
                +${soldValue}k
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {player.name}
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes moneyPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}

export default PurchaseSaleAnimation
