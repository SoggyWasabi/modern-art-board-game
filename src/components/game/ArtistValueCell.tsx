import React, { useState, useEffect, useRef } from 'react'
import { colors } from '../../design/premiumTokens'

interface ArtistValueCellProps {
  value: number
  artistColor: { primary: string; glow: string }
  isRevealing: boolean
  delay: number
  isCurrentRound?: boolean
}

/**
 * Premium animated value cell for the Artist Board.
 * Features count-up animation, golden particles, and elegant reveal.
 * Visual metaphor: Gold dust coalescing into the value number.
 */
const ArtistValueCell: React.FC<ArtistValueCellProps> = ({
  value,
  artistColor,
  isRevealing,
  delay,
  isCurrentRound = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [hasRevealed, setHasRevealed] = useState(false)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!isRevealing) {
      setDisplayValue(value)
      return
    }

    // Trigger animation after delay
    const startTimer = setTimeout(() => {
      setShowParticles(true)
      setHasRevealed(true)

      // Count-up animation
      const duration = 800
      const startTime = performance.now()
      const startValue = 0

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing: cubic-bezier(0.34, 1.56, 0.64, 1) - slight overshoot
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        const bounceEased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        const newValue = Math.round(startValue + (value - startValue) * bounceEased)
        setDisplayValue(newValue)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setShowParticles(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(startTimer)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRevealing, value, delay])

  const cellStyle: React.CSSProperties = {
    width: '28px',
    height: '26px',
    borderRadius: '3px',
    background: isCurrentRound
      ? 'rgba(251, 191, 36, 0.1)'
      : value > 0
        ? `${artistColor.primary}30`
        : 'rgba(255,255,255,0.05)',
    border: isCurrentRound
      ? '1px solid rgba(251, 191, 36, 0.3)'
      : '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: value > 0 ? 600 : 400,
    color: value > 0 ? artistColor.primary : 'rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'visible',
    transition: 'background 0.4s ease-out, border-color 0.4s ease-out',
  }

  // Add golden glow during reveal
  if (hasRevealed && showParticles) {
    Object.assign(cellStyle, {
      boxShadow: `0 0 20px ${colors.accent.gold}40, inset 0 0 20px ${artistColor.glow}20`,
    })
  }

  return (
    <div style={cellStyle}>
      {/* Value display */}
      <span
        style={{
          transform: hasRevealed && isRevealing ? 'scale(1)' : 'scale(0.8)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDelay: isRevealing ? `${delay}ms` : '0s',
          opacity: (!isRevealing || hasRevealed) ? 1 : 0.5,
        }}
      >
        {value > 0 ? `$${displayValue}` : '-'}
      </span>

      {/* Golden particles */}
      {showParticles && (
        <>
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180
            const distance = 18
            const x = Math.cos(angle) * distance
            const y = Math.sin(angle) * distance
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '3px',
                  height: '3px',
                  background: colors.accent.gold,
                  borderRadius: '50%',
                  boxShadow: `0 0 6px ${colors.accent.gold}, 0 0 12px ${colors.accent.gold}`,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-1.5px',
                  marginTop: '-1.5px',
                  opacity: 0,
                  animation: `particleOut${i} 0.8s ease-out ${delay + i * 30}ms forwards`,
                }}
              />
            )
          })}

          {/* Central burst */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '3px',
              background: `radial-gradient(circle, ${colors.accent.gold}40 0%, transparent 70%)`,
              opacity: 0,
              animation: `burst 0.5s ease-out ${delay}ms forwards`,
            }}
          />
        </>
      )}

      <style>{`
        ${[...Array(8)].map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180
          const x = Math.cos(angle) * 18
          const y = Math.sin(angle) * 18
          return `@keyframes particleOut${i} {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.3);
            }
          }`
        }).join('\n')}

        @keyframes burst {
          0% {
            opacity: 0.8;
            transform: scale(0.5);
          }
          100% {
            opacity: 0;
            transform: scale(1.8);
          }
        }
      `}</style>
    </div>
  )
}

export default ArtistValueCell
