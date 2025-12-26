import { useState } from 'react'

export interface PlayerCountSelectionProps {
  onSelect: (count: number, playerStarts?: boolean, debugMode?: boolean) => void
  onBack: () => void
}

export function PlayerCountSelection({
  onSelect,
  onBack,
}: PlayerCountSelectionProps) {
  const [playerStarts, setPlayerStarts] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 200,
            color: '#FFFFFF',
            marginBottom: 48,
            letterSpacing: '0.1em',
          }}
        >
          Select Players
        </h2>

        {/* Who should start option */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Who should start the game?
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: playerStarts ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: playerStarts ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="radio"
                name="whoStarts"
                checked={playerStarts}
                onChange={() => setPlayerStarts(true)}
                style={{ margin: 0 }}
              />
              <span style={{
                color: playerStarts ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem'
              }}>
                You go first
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: !playerStarts ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: !playerStarts ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="radio"
                name="whoStarts"
                checked={!playerStarts}
                onChange={() => setPlayerStarts(false)}
                style={{ margin: 0 }}
              />
              <span style={{
                color: !playerStarts ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem'
              }}>
                Random
              </span>
            </label>
          </div>
        </div>

        {/* Debug Mode option */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '10px 16px',
            borderRadius: 8,
            backgroundColor: debugMode ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.03)',
            border: debugMode ? '1px solid rgba(201,162,39,0.5)' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = debugMode ? 'rgba(201,162,39,0.2)' : 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = debugMode ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.03)'
          }}>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              style={{
                margin: 0,
                width: 18,
                height: 18,
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                color: debugMode ? '#C9A227' : 'rgba(255,255,255,0.8)',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                Debug / Test Mode
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem'
              }}>
                Skip to round 1 → 2 transition (4/5 cards played)
              </span>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
          {[3, 4, 5].map((count) => (
            <button
              key={count}
              onClick={() => onSelect(count, playerStarts, debugMode)}
              style={{
                width: 120,
                height: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
                e.currentTarget.style.borderColor = 'rgba(201,162,39,0.8)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(201,162,39,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
            >
              <span style={{ fontSize: '3rem', fontWeight: 200 }}>{count}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            padding: 12,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
          }}
        >
          Back
        </button>
      </div>
    </div>
  )
}
