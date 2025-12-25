import React, { useEffect, useState, useRef } from 'react'
import { colors } from '../../../design/premiumTokens'
import type { Card } from '../../../types'

interface FifthCardCeremonyProps {
  card: Card
}

/**
 * Premium gallery installation ceremony for the 5th card.
 *
 * Visual metaphor: The card is being "hung" in a gallery space.
 * - The card is gently installed with an ornate gold frame
 * - Museum spotlight lighting illuminates it
 * - A brass placard appears below
 * - Uses normal game background (no overlay)
 *
 * Timing: ~4 seconds total for the full sequence
 */
const FifthCardCeremony: React.FC<FifthCardCeremonyProps> = ({ card }) => {
  const [phase, setPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Multi-stage animation sequence - IMMEDIATE start, long hold at end
    const timers = [
      // Phase 1: Card is immediately visible (50ms)
      setTimeout(() => setPhase(1), 50),

      // Phase 2: Frame fully appears (400ms)
      setTimeout(() => setPhase(2), 400),

      // Phase 3: Spotlight turns on (1200ms)
      setTimeout(() => setPhase(3), 1200),

      // Phase 4: Placard slides up (2000ms)
      setTimeout(() => setPhase(4), 2000),

      // Phase 5: Hold for 2+ seconds after plaque (4500ms total)
      setTimeout(() => setPhase(5), 4500),
    ]

    return () => timers.forEach(clearTimeout)
  }, [])

  const artistColors = colors.artists[card.artist]

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient gallery lighting - top down */}
      <div
        style={{
          position: 'absolute',
          top: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 400,
          background: `radial-gradient(ellipse at top, rgba(255, 248, 240, ${phase >= 3 ? 0.08 : 0}) 0%, transparent 60%)`,
          transition: 'background 1.2s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Card Frame with Shadow */}
      <div
        style={{
          position: 'relative',
          transform: phase >= 1 ? 'scale(1)' : 'scale(0.85)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease-out',
        }}
      >
        {/* Wall shadow behind frame */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: -8,
            bottom: -8,
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            filter: 'blur(20px)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
          }}
        />

        {/* Ornate Gallery Frame */}
        <div
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: '18px',
            background: `
              linear-gradient(135deg, #d4a574 0%, #8b6914 50%, #d4a574 100%)
            `,
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(0, 0, 0, 0.3),
              0 20px 60px rgba(0, 0, 0, 0.5),
              0 0 0 4px rgba(139, 105, 20, 0.3),
              0 0 0 8px rgba(139, 105, 20, 0.1)
            `,
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
            transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Inner frame detail */}
          <div
            style={{
              position: 'absolute',
              inset: '6px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>

        {/* The Card */}
        <div
          style={{
            position: 'relative',
            width: '200px',
            height: '280px',
            borderRadius: '12px',
            background: `
              linear-gradient(180deg, ${artistColors.primary}25 0%, ${artistColors.primary}10 100%)
            `,
            border: `2px solid ${colors.accent.gold}60`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            boxShadow: `inset 0 0 60px ${artistColors.glow}30, 0 0 40px ${colors.accent.gold}20`,
            overflow: 'hidden',
          }}
        >
          {/* Canvas texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.03,
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)
              `,
            }}
          />

          {/* Artist icon */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '14px',
              background: artistColors.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: 'white',
              textShadow: '0 3px 12px rgba(0,0,0,0.5)',
              boxShadow: `0 10px 40px ${artistColors.primary}70`,
              border: `3px solid ${colors.accent.gold}50`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {card.artist.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Artist name */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              lineHeight: 1.3,
              padding: '0 16px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {card.artist}
          </div>

          {/* 5th Card badge */}
          <div
            style={{
              padding: '8px 20px',
              background: `linear-gradient(135deg, ${colors.accent.gold} 0%, #b45309 100%)`,
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              boxShadow: `0 4px 20px ${colors.accent.gold}60`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Final Card
          </div>
        </div>
      </div>

      {/* Brass Museum Placard */}
      <div
        style={{
          marginTop: '32px',
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease-out 0.3s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
        }}
      >
        <div
          style={{
            padding: '12px 28px',
            background: `
              linear-gradient(135deg, #c9a227 0%, #a67c00 50%, #8b6914 100%)
            `,
            borderRadius: '4px',
            boxShadow: `
              0 4px 16px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(0, 0, 0, 0.3)
            `,
            border: '1px solid rgba(201, 162, 39, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {/* Engraved title */}
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'rgba(26, 26, 26, 0.7)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textShadow: '0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
          >
            Gallery Notice
          </div>

          {/* Engraved message */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#1a1a1a',
              textAlign: 'center',
              textShadow: '0 1px 0 rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.05em',
            }}
          >
            Round Ending • Card Not Auctioned
          </div>
        </div>
      </div>

      {/* Bottom ambient glow */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: 100,
          background: `radial-gradient(ellipse at top, ${artistColors.glow}20 0%, transparent 70%)`,
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 1s ease-out 0.5s',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default FifthCardCeremony
