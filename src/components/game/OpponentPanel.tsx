import React from 'react'
import CardBack from './CardBack'
import { Card as GameCardComponent } from '../Card'
import { AIStatusBadge, AIThinkingIndicator } from '../ai/AIThinkingIndicator'
import type { Player, Card } from '../../types'
import { colors } from '../../design/premiumTokens'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

interface OpponentPanelProps {
  players: Player[]
  currentPlayerIndex: number // The human player index (to exclude)
  activePlayerIndex?: number // Whose turn it is
  aiThinkingPlayers?: Set<number> // Set of AI player indices currently thinking
  registerCardRef?: (cardId: string, element: HTMLDivElement | null) => void
  isFlyingCards?: boolean // Hide purchased cards during flying animation
}

const OpponentPanel: React.FC<OpponentPanelProps> = ({
  players,
  currentPlayerIndex,
  activePlayerIndex,
  aiThinkingPlayers = new Set(),
  registerCardRef,
  isFlyingCards = false,
}) => {
  // Filter out the current (human) player
  const opponents = players.filter((_, idx) => idx !== currentPlayerIndex)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {opponents.map((opponent) => {
        const playerIndex = players.findIndex((p) => p.id === opponent.id)
        const isActive = playerIndex === activePlayerIndex
        const hasCards = opponent.hand.length > 0
        const purchasedCards = opponent.purchasedThisRound || []

        return (
          <div
            key={opponent.id}
            style={{
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: isActive
                ? `2px solid ${colors.accent.gold}`
                : '1px solid rgba(255, 255, 255, 0.1)',
              animation: isActive ? 'active-turn-pulse 2s ease-in-out infinite' : 'none',
              ['--player-color' as string]: PLAYER_COLORS[playerIndex],
            }}
          >
            {/* Header: Avatar + Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${PLAYER_COLORS[playerIndex]}, ${PLAYER_COLORS[playerIndex]}88)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {opponent.name.charAt(0).toUpperCase()}
              </div>

              {/* Name and AI badge */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {opponent.name}
                  {opponent.isAI && (
                    <>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: 'rgba(139, 92, 246, 0.3)',
                          color: '#a78bfa',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 500,
                        }}
                      >
                        {opponent.aiDifficulty}
                      </span>
                      {aiThinkingPlayers.has(playerIndex) && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#fbbf24',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        >
                          ⚡
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Card indicator (just shows if they have cards) */}
              {hasCards && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CardBack size="sm" style={{ width: 24, height: 34 }} />
                </div>
              )}
            </div>

            {/* Purchased cards this round */}
            {purchasedCards.length > 0 && !isFlyingCards ? (
              <>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '6px',
                  }}
                >
                  Bought This Round
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  {purchasedCards.map((card: Card, idx: number) => (
                    <div
                      key={`${card.id}-${idx}`}
                      ref={(el) => registerCardRef?.(card.id, el)}
                      style={{ transform: 'scale(0.6)' }}
                    >
                      <GameCardComponent
                        card={{
                          id: card.id,
                          artist: card.artist,
                          artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
                          cardIndex: card.cardIndex,
                          auctionType: card.auctionType
                        }}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Empty state */
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontStyle: 'italic',
                }}
              >
                No purchases this round
              </div>
            )}

            {/* AI Thinking Indicator */}
            {opponent.isAI && aiThinkingPlayers.has(playerIndex) && (
              <div style={{ marginTop: '8px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#fbbf24',
                    textAlign: 'center',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  AI is thinking...
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default OpponentPanel
