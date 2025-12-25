import React, { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { colors } from '../../../design/premiumTokens'

interface ArtistValuationAnimationProps {
  show: boolean
}

/**
 * Olympic Podium style artist valuation.
 *
 * Visual metaphor: The top 3 artists stand on medal podiums.
 * - Gold (center, highest) with crown
 * - Silver (left) and Bronze (right)
 * - Podiums rise from below with metallic shine
 * - Dramatic spotlight illuminates the winners
 *
 * Positioning: Centered over auction center area
 * Timing: ~3 seconds for full reveal
 */
const ArtistValuationAnimation: React.FC<ArtistValuationAnimationProps> = ({ show }) => {
  const { gameState } = useGameStore()
  const [phase, setPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) {
      setPhase(0)
      return
    }

    // Multi-stage animation sequence - EXTENDED TO 5 SECONDS
    const timers = [
      // Phase 1: Fade in backdrop (100ms)
      setTimeout(() => setPhase(1), 100),

      // Phase 2: Header slides down (400ms)
      setTimeout(() => setPhase(2), 400),

      // Phase 3: Podiums rise up (900ms) - staggered
      setTimeout(() => setPhase(3), 900),

      // Phase 4: Crown appears (1800ms)
      setTimeout(() => setPhase(4), 1800),

      // Phase 5: Spotlight on winner (2200ms)
      setTimeout(() => setPhase(5), 2200),

      // Phase 6: Hold for viewing (5000ms total)
      setTimeout(() => setPhase(6), 5000),
    ]

    return () => timers.forEach(clearTimeout)
  }, [show])

  if (!show || !gameState) return null

  const results =
    gameState.round.phase.type === 'selling_to_bank'
      ? gameState.round.phase.results || []
      : []

  const rankedResults = results.filter((r) => r.rank !== null && r.value > 0)

  if (rankedResults.length === 0) return null

  const first = rankedResults.find((r) => r.rank === 1)
  const second = rankedResults.find((r) => r.rank === 2)
  const third = rankedResults.find((r) => r.rank === 3)

  // No results to show
  if (!first && !second && !third) return null

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        padding: '12px 16px 0',
      }}
    >
      {/* Content - transparent, uses game board background */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '70px',
          zIndex: 1,
          width: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            style={{
              padding: '10px 32px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(12px)',
              borderRadius: '24px',
              border: `1px solid ${colors.accent.gold}40`,
              boxShadow: `0 4px 24px ${colors.accent.gold}20`,
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: colors.accent.gold,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign: 'center',
              }}
            >
              Round Valuation
            </div>
          </div>
        </div>

        {/* Olympic Podium Layout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            height: '280px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {/* Second Place (Silver) - Left */}
          {second && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: phase >= 3 ? 'translateY(0)' : 'translateY(80px)',
                opacity: phase >= 3 ? 1 : 0,
                transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, opacity 0.5s ease-out 0.1s',
              }}
            >
              {/* Artist info above podium */}
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Silver medal badge */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `
                      linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 30%, #A8A8A8 70%, #909090 100%)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#5a5a5a',
                    boxShadow: `
                      0 4px 12px rgba(192, 192, 192, 0.4),
                      inset 0 2px 4px rgba(255, 255, 255, 0.5),
                      inset 0 -2px 4px rgba(0, 0, 0, 0.2)
                    `,
                    border: '2px solid #d4d4d4',
                  }}
                >
                  2
                </div>

                {/* Artist card */}
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '10px',
                    background: colors.artists[second.artist].gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'white',
                    boxShadow: `0 6px 24px ${colors.artists[second.artist].primary}60`,
                    border: `2px solid rgba(255, 255, 255, 0.3)`,
                  }}
                >
                  {second.artist.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Artist name */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'white',
                    textAlign: 'center',
                    maxWidth: '90px',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                >
                  {second.artist.split(' ')[0]}
                </div>
              </div>

              {/* Silver Podium */}
              <div
                style={{
                  width: '110px',
                  height: '90px',
                  background: `
                    linear-gradient(180deg,
                      #E8E8E8 0%,
                      #C0C0C0 20%,
                      #A8A8A8 50%,
                      #909090 80%,
                      #787878 100%
                    )
                  `,
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: '16px',
                  boxShadow: `
                    inset 0 2px 8px rgba(255, 255, 255, 0.4),
                    inset 0 -2px 8px rgba(0, 0, 0, 0.2),
                    0 -6px 24px rgba(192, 192, 192, 0.3),
                    0 8px 32px rgba(0, 0, 0, 0.4)
                  `,
                  border: '1px solid #d4d4d4',
                  position: 'relative',
                }}
              >
                {/* Metallic shine effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                    borderRadius: '10px 10px 0 0',
                  }}
                />

                {/* Value */}
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    color: '#4a4a4a',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  ${second.value}k
                </div>
              </div>
            </div>
          )}

          {/* First Place (Gold) - Center, Tallest */}
          {first && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: phase >= 3 ? 'translateY(0)' : 'translateY(100px)',
                opacity: phase >= 3 ? 1 : 0,
                transition: 'transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s, opacity 0.6s ease-out 0.2s',
              }}
            >
              {/* Crown */}
              <div
                style={{
                  marginBottom: '12px',
                  opacity: phase >= 4 ? 1 : 0,
                  transform: phase >= 4 ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.8)',
                  transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 48 48"
                  fill="none"
                  style={{
                    filter: `drop-shadow(0 0 16px ${colors.accent.gold})`,
                  }}
                >
                  <path
                    d="M4 38L10 16L20 28L24 12L28 28L38 16L44 38H4Z"
                    fill={colors.accent.gold}
                    stroke="#b45309"
                    strokeWidth="2"
                  />
                  <circle cx="10" cy="16" r="4" fill={colors.accent.gold} stroke="#b45309" strokeWidth="1.5" />
                  <circle cx="24" cy="12" r="4" fill={colors.accent.gold} stroke="#b45309" strokeWidth="1.5" />
                  <circle cx="38" cy="16" r="4" fill={colors.accent.gold} stroke="#b45309" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Artist info above podium */}
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Gold medal badge */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `
                      linear-gradient(135deg, #ffd700 0%, ${colors.accent.gold} 30%, #d97706 70%, #b45309 100%)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#5a3a00',
                    boxShadow: `
                      0 6px 20px ${colors.accent.gold}60,
                      inset 0 2px 6px rgba(255, 255, 255, 0.4),
                      inset 0 -2px 6px rgba(0, 0, 0, 0.2)
                    `,
                    border: '2px solid #fcd34d',
                  }}
                >
                  1
                </div>

                {/* Artist card */}
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '12px',
                    background: colors.artists[first.artist].gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'white',
                    boxShadow: `0 8px 32px ${colors.artists[first.artist].primary}70`,
                    border: `3px solid ${colors.accent.gold}50`,
                  }}
                >
                  {first.artist.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Artist name */}
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'white',
                    textAlign: 'center',
                    maxWidth: '110px',
                    textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                  }}
                >
                  {first.artist}
                </div>
              </div>

              {/* Gold Podium */}
              <div
                style={{
                  width: '130px',
                  height: '130px',
                  background: `
                    linear-gradient(180deg,
                      #ffd700 0%,
                      ${colors.accent.gold} 20%,
                      #d97706 50%,
                      #b45309 80%,
                      #92400e 100%
                    )
                  `,
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: '20px',
                  boxShadow: `
                    inset 0 3px 12px rgba(255, 255, 255, 0.4),
                    inset 0 -3px 12px rgba(0, 0, 0, 0.2),
                    0 -8px 32px ${colors.accent.gold}50,
                    0 12px 48px rgba(0, 0, 0, 0.5)
                  `,
                  border: `1px solid ${colors.accent.gold}90`,
                  position: 'relative',
                }}
              >
                {/* Metallic shine effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '45%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                    borderRadius: '12px 12px 0 0',
                  }}
                />

                {/* Winner spotlight */}
                {phase >= 5 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -60,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 200,
                      height: 200,
                      background: `radial-gradient(circle at center, ${colors.accent.gold}30 0%, transparent 60%)`,
                      opacity: phase >= 5 ? 1 : 0,
                      transition: 'opacity 0.6s ease-out',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Value - Large and prominent */}
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    color: '#5a3a00',
                    textShadow: '0 3px 12px rgba(0,0,0,0.4)',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  ${first.value}k
                </div>
              </div>
            </div>
          )}

          {/* Third Place (Bronze) - Right */}
          {third && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: phase >= 3 ? 'translateY(0)' : 'translateY(80px)',
                opacity: phase >= 3 ? 1 : 0,
                transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, opacity 0.5s ease-out 0.3s',
              }}
            >
              {/* Artist info above podium */}
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Bronze medal badge */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `
                      linear-gradient(135deg, #e6a887 0%, #cd7f32 30%, #a0522d 70%, #8b4513 100%)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#4a3020',
                    boxShadow: `
                      0 4px 12px rgba(205, 127, 50, 0.4),
                      inset 0 2px 4px rgba(255, 255, 255, 0.3),
                      inset 0 -2px 4px rgba(0, 0, 0, 0.2)
                    `,
                    border: '2px solid #daa06d',
                  }}
                >
                  3
                </div>

                {/* Artist card */}
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '10px',
                    background: colors.artists[third.artist].gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'white',
                    boxShadow: `0 6px 24px ${colors.artists[third.artist].primary}60`,
                    border: `2px solid rgba(255, 255, 255, 0.3)`,
                  }}
                >
                  {third.artist.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Artist name */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'white',
                    textAlign: 'center',
                    maxWidth: '90px',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                >
                  {third.artist.split(' ')[0]}
                </div>
              </div>

              {/* Bronze Podium */}
              <div
                style={{
                  width: '110px',
                  height: '70px',
                  background: `
                    linear-gradient(180deg,
                      #e6a887 0%,
                      #cd7f32 20%,
                      #a0522d 50%,
                      #8b4513 80%,
                      #703d20 100%
                    )
                  `,
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: '16px',
                  boxShadow: `
                    inset 0 2px 8px rgba(255, 255, 255, 0.3),
                    inset 0 -2px 8px rgba(0, 0, 0, 0.2),
                    0 -6px 24px rgba(205, 127, 50, 0.3),
                    0 8px 32px rgba(0, 0, 0, 0.4)
                  `,
                  border: '1px solid #daa06d',
                  position: 'relative',
                }}
              >
                {/* Metallic shine effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
                    borderRadius: '10px 10px 0 0',
                  }}
                />

                {/* Value */}
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: '#4a3020',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  ${third.value}k
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArtistValuationAnimation
