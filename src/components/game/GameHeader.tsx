import React from 'react'
import { Settings, Home } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import { colors } from '../../design/premiumTokens'

interface GameHeaderProps {
  onMenuClick?: () => void
  onSettingsClick?: () => void
}

const GameHeader: React.FC<GameHeaderProps> = ({ onMenuClick, onSettingsClick }) => {
  const { gameState } = useGameStore()

  if (!gameState) return null

  const { round } = gameState
  const roundNumber = round.roundNumber
  const phaseType = round.phase.type

  // Format phase name for display
  const formatPhase = (phase: string) => {
    switch (phase) {
      case 'awaiting_card_play':
        return 'Play a Card'
      case 'auction':
        return 'Auction'
      case 'round_ending':
        return 'Round Ending'
      case 'selling_to_bank':
        return 'Selling Phase'
      case 'round_complete':
        return 'Round Complete'
      default:
        return phase.replace(/_/g, ' ')
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Left: Logo/Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Home size={18} />
        </button>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 300,
            color: 'white',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Modern Art
        </span>
      </div>

      {/* Center: Round & Phase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {/* Round indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Round
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4].map((r) => (
              <div
                key={r}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background:
                    r < roundNumber
                      ? 'rgba(251, 191, 36, 0.3)'
                      : r === roundNumber
                      ? colors.accent.gold
                      : 'rgba(255, 255, 255, 0.1)',
                  border:
                    r === roundNumber
                      ? `2px solid ${colors.accent.gold}`
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: r === roundNumber ? 700 : 500,
                  color: r === roundNumber ? '#000' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Phase indicator */}
        <div
          style={{
            padding: '8px 20px',
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '20px',
            color: colors.accent.gold,
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {formatPhase(phaseType)}
        </div>
      </div>

      {/* Right: Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onSettingsClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}

export default GameHeader
