import React, { useEffect, useState } from 'react'
import { colors, shadows } from '../../../design/premiumTokens'
import type { GameState, Player } from '../../../types'

interface GameEndDisplayProps {
  gameState: GameState
  onReturnToMenu: () => void
}

const GameEndDisplay: React.FC<GameEndDisplayProps> = ({
  gameState,
  onReturnToMenu,
}) => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [revealedPlayers, setRevealedPlayers] = useState<Set<number>>(new Set())

  const { players, winner } = gameState

  // Sort players by money (descending), then by paintings count
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.money !== a.money) {
      return b.money - a.money
    }
    return (b.purchases?.length || 0) - (a.purchases?.length || 0)
  })

  const winnerPlayer = winner || sortedPlayers[0]
  const maxMoney = Math.max(...players.map(p => p.money))
  const winners = players.filter(p => p.money === maxMoney)
  const isTie = winners.length > 1

  useEffect(() => {
    // Trigger confetti after a short delay
    const confettiTimer = setTimeout(() => {
      setShowConfetti(true)
    }, 500)

    // Reveal players one by one
    let playerIndex = 0
    const revealTimer = setInterval(() => {
      if (playerIndex < sortedPlayers.length) {
        setRevealedPlayers(prev => new Set([...prev, playerIndex]))
        playerIndex++
      } else {
        clearInterval(revealTimer)
      }
    }, 300)

    return () => {
      clearTimeout(confettiTimer)
      clearInterval(revealTimer)
    }
  }, [sortedPlayers.length])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        padding: '40px',
        overflow: 'hidden',
      }}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: '-20px',
                width: '10px',
                height: '10px',
                background: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 6)],
                opacity: 0.7,
                animation: `fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          animation: 'fadeIn 0.6s ease-out',
        }}
      >
        {/* Winner Announcement */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
            animation: 'slideDown 0.8s ease-out',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '16px',
            }}
          >
            Game Over
          </div>

          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textShadow: '0 0 60px rgba(251, 191, 36, 0.5)',
              animation: 'glow 2s ease-in-out infinite',
            }}
          >
            {isTie ? 'It\'s a Tie!' : 'Winner!'}
          </div>

          {!isTie && (
            <div
              style={{
                fontSize: '42px',
                fontWeight: 800,
                color: winnerPlayer.id === 'player_0' ? colors.accent.gold : 'white',
                marginBottom: '12px',
              }}
            >
              {winnerPlayer.name}
            </div>
          )}

          {isTie && (
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: colors.accent.gold,
                marginBottom: '12px',
              }}
            >
              {winners.map(w => w.name).join(' & ')}
            </div>
          )}

          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Final Score: ${winnerPlayer.money}k
            {!isTie && winners.length === 1 && (
              <span style={{ marginLeft: '12px', fontSize: '14px', opacity: 0.7 }}>
                ({winnerPlayer.purchases?.length || 0} painting{winnerPlayer.purchases?.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>

        {/* Final Rankings */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '32px',
            boxShadow: shadows['2xl'],
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            Final Standings
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedPlayers.map((player, idx) => {
              const isRevealed = revealedPlayers.has(idx)
              const isWinner = player.money === maxMoney
              const paintingCount = player.purchases?.length || 0

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px 24px',
                    background: idx === 0
                      ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.05) 100%)'
                      : idx === 1
                      ? 'linear-gradient(135deg, rgba(229, 231, 235, 0.15) 0%, rgba(229, 231, 235, 0.03) 100%)'
                      : idx === 2
                      ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.03) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    border: idx === 0
                      ? '2px solid rgba(251, 191, 36, 0.5)'
                      : idx === 1
                      ? '2px solid rgba(229, 231, 235, 0.3)'
                      : idx === 2
                      ? '2px solid rgba(217, 119, 6, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: idx === 0
                      ? `${shadows.xl}, ${shadows.glow.gold}`
                      : idx === 1
                      ? shadows.lg
                      : idx === 2
                      ? shadows.md
                      : 'none',
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  {/* Rank Badge */}
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: idx === 0
                        ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        : idx === 1
                        ? 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)'
                        : idx === 2
                        ? 'linear-gradient(135deg, #d97706 0%, #92400e 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 900,
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      flexShrink: 0,
                      boxShadow: idx < 3 ? shadows.lg : 'none',
                    }}
                  >
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>

                  {/* Player Info */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: idx === 0 ? colors.accent.gold : 'white',
                        marginBottom: '4px',
                      }}
                    >
                      {player.name}
                      {isWinner && isTie && idx > 0 && (
                        <span style={{ marginLeft: '8px', fontSize: '14px', color: colors.accent.gold }}>
                          (Tied)
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      {paintingCount} painting{paintingCount !== 1 ? 's' : ''} owned
                    </div>
                  </div>

                  {/* Final Money */}
                  <div
                    style={{
                      textAlign: 'right',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        color: idx === 0 ? colors.accent.gold : 'white',
                        lineHeight: 1,
                      }}
                    >
                      ${player.money}k
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Return to Menu Button */}
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <button
            onClick={onReturnToMenu}
            style={{
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: shadows.xl,
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
              e.currentTarget.style.boxShadow = shadows['2xl']
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)'
              e.currentTarget.style.boxShadow = shadows.xl
            }}
          >
            Return to Menu
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default GameEndDisplay
