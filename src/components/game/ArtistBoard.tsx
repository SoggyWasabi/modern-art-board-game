import React from 'react'
import { useGameStore } from '../../store/gameStore'
import { colors } from '../../design/premiumTokens'

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

const ArtistBoard: React.FC<ArtistBoardProps> = ({ collapsed = false, onToggle }) => {
  const { gameState } = useGameStore()

  if (!gameState) return null

  const { board, round } = gameState
  const currentRound = round.roundNumber
  const cardsPlayed = round.cardsPlayedPerArtist

  // Calculate cumulative values for each artist
  const getCumulativeValue = (artist: Artist, upToRound: number) => {
    let total = 0
    for (let i = 0; i < upToRound; i++) {
      total += board.artistValues[artist][i] || 0
    }
    return total
  }

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          cursor: onToggle ? 'pointer' : 'default',
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
          Artist Values
        </span>
        {onToggle && (
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            ▼
          </span>
        )}
      </div>

      {/* Artist rows */}
      {!collapsed && (
        <div style={{ padding: '12px' }}>
          {/* Round headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr repeat(4, 36px) 48px',
              gap: '4px',
              marginBottom: '8px',
              paddingLeft: '4px',
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
          {ARTIST_ORDER.map((artist) => {
            const artistColors = colors.artists[artist]
            const cardsThisRound = cardsPlayed[artist] || 0
            const totalValue = getCumulativeValue(artist, currentRound)

            return (
              <div
                key={artist}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr repeat(4, 36px) 48px',
                  gap: '4px',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: '6px',
                  background: cardsThisRound > 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  marginBottom: '4px',
                }}
              >
                {/* Artist name with color indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: artistColors.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {ARTIST_INITIALS[artist]}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'white',
                        lineHeight: 1.2,
                      }}
                    >
                      {artist.split(' ')[0]}
                    </div>
                    {/* Cards played this round indicator */}
                    {cardsThisRound > 0 && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: cardsThisRound >= 4 ? colors.accent.gold : 'rgba(255,255,255,0.5)',
                          fontWeight: cardsThisRound >= 4 ? 600 : 400,
                        }}
                      >
                        {cardsThisRound}/5 cards
                      </div>
                    )}
                  </div>
                </div>

                {/* Round values */}
                {[0, 1, 2, 3].map((roundIdx) => {
                  const value = board.artistValues[artist][roundIdx]
                  const isCurrentRound = roundIdx === currentRound - 1
                  const isPastRound = roundIdx < currentRound - 1

                  return (
                    <div
                      key={roundIdx}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        background: isPastRound
                          ? value > 0
                            ? `${artistColors.primary}30`
                            : 'rgba(255,255,255,0.05)'
                          : isCurrentRound
                          ? 'rgba(251, 191, 36, 0.1)'
                          : 'rgba(255,255,255,0.03)',
                        border: isCurrentRound
                          ? '1px solid rgba(251, 191, 36, 0.3)'
                          : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: value > 0 ? 600 : 400,
                        color: value > 0 ? artistColors.primary : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {isPastRound ? (value > 0 ? `$${value}` : '-') : ''}
                    </div>
                  )
                })}

                {/* Total value */}
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: totalValue > 0 ? colors.accent.gold : 'rgba(255,255,255,0.3)',
                  }}
                >
                  ${totalValue}k
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ArtistBoard
