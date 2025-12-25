import React, { useEffect, useState } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { colors, shadows } from '../../../design/premiumTokens'
import type { Card } from '../../../types'

interface CardDiscardAnimationProps {
  show: boolean
}

/**
 * Premium animation for when the 5th card is played, ending the round.
 * Visual metaphor: A gallery assistant gently removing a painting from display.
 * The card glows golden, floats elegantly toward a vault, and fades.
 */
const CardDiscardAnimation: React.FC<CardDiscardAnimationProps> = ({ show }) => {
  const { gameState } = useGameStore()
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'discard' | 'exit'>('enter')
  const [visible, setVisible] = useState(false)

  // Get the discarded card from round_ending phase
  const discardedCard = gameState?.round.phase.type === 'round_ending'
    ? gameState.round.phase.unsoldCards?.[0]
    : null

  useEffect(() => {
    if (!show) {
      setVisible(false)
      setAnimationPhase('enter')
      return
    }

    // Phase sequence
    const enterTimer = setTimeout(() => {
      setVisible(true)
      setAnimationPhase('enter')
    }, 100)

    const discardTimer = setTimeout(() => {
      setAnimationPhase('discard')
    }, 600)

    const exitTimer = setTimeout(() => {
      setAnimationPhase('exit')
    }, 1400)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(discardTimer)
      clearTimeout(exitTimer)
    }
  }, [show])

  if (!show || !visible || !discardedCard) return null

  const artistColors = colors.artists[discardedCard.artist]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Ambient golden light fill */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.08) 0%, transparent 70%)',
          opacity: animationPhase !== 'exit' ? 1 : 0,
          transition: 'opacity 0.6s ease-out',
          animation: animationPhase !== 'exit' ? 'ambientPulse 2s ease-in-out infinite' : 'none',
        }}
      />

      {/* Floating card container */}
      <div
        style={{
          position: 'relative',
          width: '200px',
          height: '280px',
          transform: animationPhase === 'enter'
            ? 'scale(0.8) translateY(20px)'
            : animationPhase === 'discard'
            ? 'scale(0.6) translateY(-80px) translateX(120px) rotate(8deg)'
            : 'scale(0.3) translateY(-200px) translateX(200px) rotate(15deg)',
          opacity: animationPhase === 'exit' ? 0 : 1,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
          transitionDelay: animationPhase === 'discard' ? '0.1s' : '0s',
        }}
      >
        {/* Golden glow behind card */}
        <div
          style={{
            position: 'absolute',
            inset: -20,
            background: `radial-gradient(circle, ${artistColors.glow}40 0%, ${artistColors.glow}00 70%)`,
            borderRadius: '16px',
            filter: 'blur(20px)',
            opacity: animationPhase === 'enter' ? 0.6 : animationPhase === 'discard' ? 0.8 : 0.3,
            transition: 'opacity 0.6s ease-out',
          }}
        />

        {/* Card frame with golden border */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '12px',
            border: `3px solid ${colors.accent.gold}`,
            boxShadow: `0 0 40px ${artistColors.glow}60, 0 8px 32px rgba(0,0,0,0.4), inset 0 0 60px ${colors.accent.gold}15`,
            opacity: animationPhase === 'exit' ? 0 : 1,
            transition: 'opacity 0.4s ease-out',
            background: `linear-gradient(135deg, ${artistColors.primary}15 0%, ${artistColors.primary}08 100%)`,
            backdropFilter: 'blur(8px)',
          }}
        />

        {/* Card content */}
        <div
          style={{
            position: 'absolute',
            inset: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {/* Artist icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              background: artistColors.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: 'white',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              boxShadow: `0 4px 20px ${artistColors.primary}50`,
              border: `2px solid ${colors.accent.gold}40`,
            }}
          >
            {discardedCard.artist.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Artist name */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              lineHeight: 1.3,
            }}
          >
            {discardedCard.artist}
          </div>

          {/* Discard badge */}
          <div
            style={{
              marginTop: '8px',
              padding: '6px 14px',
              background: `linear-gradient(135deg, ${colors.accent.gold} 0%, #d97706 100%)`,
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: `0 4px 16px ${colors.accent.gold}50, 0 2px 8px rgba(0,0,0,0.3)`,
            }}
          >
            5th Card
          </div>
        </div>

        {/* Sparkle particles */}
        {animationPhase !== 'exit' && (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  background: colors.accent.gold,
                  borderRadius: '50%',
                  boxShadow: `0 0 8px ${colors.accent.gold}, 0 0 16px ${colors.accent.gold}`,
                  left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 70}%`,
                  top: `${50 + Math.sin(i * 60 * Math.PI / 180) * 70}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0,
                  animation: `sparkle 1.5s ease-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Round ending text */}
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: animationPhase === 'enter' ? 0 : 1,
          transition: 'opacity 0.6s ease-out 0.3s',
        }}
      >
        <div
          style={{
            padding: '12px 28px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '30px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${colors.accent.gold}20`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: colors.accent.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              textAlign: 'center',
            }}
          >
            Round Ending
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          30% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, calc(-50% - 20px)) scale(0.5);
          }
        }
      `}</style>
    </div>
  )
}

export default CardDiscardAnimation
