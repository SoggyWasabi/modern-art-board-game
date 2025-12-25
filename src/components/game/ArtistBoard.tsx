import React, { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { colors } from '../../design/premiumTokens'
import ArtistValueCell from './ArtistValueCell'

type Artist = 'Manuel Carvalho' | 'Sigrid Thaler' | 'Daniel Melim' | 'Ramon Martins' | 'Rafael Silveira'

const ARTIST_ORDER: Artist[] = [
  'Manuel Carvalho',
  'Sigrid Thaler',
  'Daniel Melim',
  'Ramon Martins',
  'Rafael Silveira',
]

const ARTIST_INITIALS: Record<Artist, string> = {
  'Manuel Carvalho': 'MC',
  'Sigrid Thaler': 'ST',
  'Daniel Melim': 'DM',
  'Ramon Martins': 'RM',
  'Rafael Silveira': 'RS',
}

interface ArtistBoardProps {
  collapsed?: boolean
  onToggle?: () => void
}

/**
 * Premium Artist Board with animated value reveals.
 * Visual metaphor: An auction house display board with elegant value updates.
 */
const ArtistBoard: React.FC<ArtistBoardProps> = ({ collapsed = false, onToggle }) => {
  const { gameState } = useGameStore()
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealTrigger, setRevealTrigger] = useState(0)

  if (!gameState) return null

  const { board, round } = gameState
  const currentRound = round.roundNumber
  const cardsPlayed = round.cardsPlayedPerArtist

  // Trigger reveal animation when entering selling_to_bank phase
  useEffect(() => {
    if (round.phase.type === 'selling_to_bank' && !isRevealing) {
      setIsRevealing(true)
      setRevealTrigger(prev => prev + 1)

      // Reset reveal state after animation completes
      const timer = setTimeout(() => {
        setIsRevealing(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [round.phase.type, isRevealing])

  // Calculate cumulative values for each artist
  const getCumulativeValue = (artist: Artist, upToRound: number) => {
    let total = 0
    for (let i = 0; i < upToRound; i++) {
      total += board.artistValues[artist][i] || 0
    }
    return total
  }

  // Check if this is the round ending phase (for anticipation effect)
  const isRoundEnding = round.phase.type === 'selling_to_bank'

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: `1px solid ${isRoundEnding ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.6s ease-out',
        position: 'relative',
      }}
    >
      {/* Subtle glow effect during round end */}
      {isRoundEnding && (
        <div
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: '12px',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(217, 119, 6, 0.2) 50%, rgba(251, 191, 36, 0.4) 100%)',
            opacity: 0.5,
            animation: 'borderGlow 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: isRoundEnding ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255, 255, 255, 0.05)',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          cursor: onToggle ? 'pointer' : 'default',
          transition: 'background 0.4s ease-out',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: isRoundEnding ? colors.accent.gold : 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'color 0.4s ease-out',
          }}
        >
          Artist Values
        </span>
        {onToggle && (
          <span
            style={{
              fontSize: '10px',
              color: isRoundEnding ? colors.accent.gold : 'rgba(255, 255, 255, 0.5)',
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease, color 0.4s ease-out',
            }}
          >
            ▼
          </span>
        )}
      </div>

      {/* Artist rows */}
      {!collapsed && (
        <div style={{ padding: '8px', width: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          {/* Round headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '90px repeat(4, 32px) 40px',
              gap: '4px',
              marginBottom: '6px',
              paddingLeft: '2px',
            }}
          >
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Artist</span>
            {[1, 2, 3, 4].map((r) => (
              <span
                key={r}
                style={{
                  fontSize: '10px',
                  color: r === currentRound ? colors.accent.gold : 'rgba(255,255,255,0.4)',
                  textAlign: 'center',
                  fontWeight: r === currentRound ? 600 : 400,
                  transition: 'color 0.3s ease-out',
                }}
              >
                R{r}
              </span>
            ))}
            <span
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'right',
              }}
            >
              Total
            </span>
          </div>

          {/* Artist rows */}
          {ARTIST_ORDER.map((artist, artistIndex) => {
            const artistColors = colors.artists[artist]
            const cardsThisRound = cardsPlayed[artist] || 0
            const totalValue = getCumulativeValue(artist, currentRound)

            // Stagger delay for each row
            const rowDelay = artistIndex * 200

            return (
              <div
                key={artist}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px repeat(4, 32px) 40px',
                  gap: '4px',
                  alignItems: 'center',
                  padding: '6px 2px',
                  borderRadius: '4px',
                  background: isRoundEnding && isRevealing
                    ? `linear-gradient(90deg, transparent 0%, ${artistColors.primary}15 50%, transparent 100%)`
                    : cardsThisRound > 0
                    ? 'rgba(255,255,255,0.05)'
                    : 'transparent',
                  marginBottom: '2px',
                  transition: 'background 0.6s ease-out',
                  opacity: isRoundEnding && isRevealing ? 0 : 1,
                  animation: isRoundEnding && isRevealing ? `fadeInRow 0.5s ease-out ${rowDelay}ms forwards` : 'none',
                }}
              >
                {/* Artist name with color indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '3px',
                      background: artistColors.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      flexShrink: 0,
                      transition: isRoundEnding ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                      transform: isRoundEnding && isRevealing ? 'scale(1.1)' : 'scale(1)',
                      animation: isRoundEnding && isRevealing ? `iconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${rowDelay + 100}ms forwards` : 'none',
                    }}
                  >
                    {ARTIST_INITIALS[artist]}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'white',
                        lineHeight: 1.1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {artist.split(' ')[0]}
                    </div>
                    {/* Cards played this round indicator */}
                    {cardsThisRound > 0 && (
                      <div
                        style={{
                          fontSize: '9px',
                          color: cardsThisRound >= 4 ? colors.accent.gold : 'rgba(255,255,255,0.5)',
                          fontWeight: cardsThisRound >= 4 ? 600 : 400,
                          lineHeight: 1,
                        }}
                      >
                        {cardsThisRound}/5
                      </div>
                    )}
                  </div>
                </div>

                {/* Round values - using animated cells */}
                {[0, 1, 2, 3].map((roundIdx) => {
                  const value = board.artistValues[artist][roundIdx]
                  const isCurrentRound = roundIdx === currentRound - 1
                  const isPastRound = roundIdx < currentRound - 1
                  const cellDelay = rowDelay + 100 // Cells animate slightly after row

                  return (
                    <ArtistValueCell
                      key={roundIdx}
                      value={isPastRound ? value : 0}
                      artistColor={artistColors}
                      isRevealing={isRevealing && isPastRound}
                      delay={cellDelay}
                      isCurrentRound={isCurrentRound}
                    />
                  )
                })}

                {/* Total value with animation */}
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: totalValue > 0 ? colors.accent.gold : 'rgba(255,255,255,0.3)',
                    lineHeight: 1.1,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      transform: isRoundEnding && isRevealing ? 'scale(1)' : 'scale(0.8)',
                      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: `${rowDelay + 400}ms`,
                    }}
                  >
                    ${totalValue}k
                  </span>
                  {/* Total sparkle */}
                  {isRoundEnding && totalValue > 0 && isRevealing && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -4,
                        background: `radial-gradient(circle, ${colors.accent.gold}30 0%, transparent 70%)`,
                        borderRadius: '8px',
                        opacity: 0,
                        animation: `totalSparkle 0.6s ease-out ${rowDelay + 400}ms forwards`,
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes borderGlow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes fadeInRow {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes iconPop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1.05);
          }
        }

        @keyframes totalSparkle {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  )
}

export default ArtistBoard
