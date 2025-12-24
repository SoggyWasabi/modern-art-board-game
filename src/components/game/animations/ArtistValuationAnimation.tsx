import React, { useEffect, useState } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { colors, shadows } from '../../../design/premiumTokens'
import type { Artist, ArtistRoundResult } from '../../../types'

interface ArtistValuationAnimationProps {
  show: boolean
}

const ARTIST_ORDER: Artist[] = [
  'Manuel Carvalho',
  'Sigrid Thaler',
  'Daniel Melim',
  'Ramon Martins',
  'Rafael Silveira',
]

/**
 * Animates the top 3 artists lighting up with their new values
 * Displays over the ArtistBoard to highlight rankings
 */
const ArtistValuationAnimation: React.FC<ArtistValuationAnimationProps> = ({ show }) => {
  const { gameState } = useGameStore()
  const [revealedRanks, setRevealedRanks] = useState<Set<Artist>>(new Set())

  useEffect(() => {
    if (show && gameState) {
      // Get the ranking results
      const results =
        gameState.round.phase.type === 'selling_to_bank'
          ? gameState.round.phase.results || []
          : []

      // Reveal each ranked artist one by one
      const rankedArtists = results
        .filter((r) => r.rank !== null)
        .sort((a, b) => a.rank! - b.rank!)
        .map((r) => r.artist)

      let currentIndex = 0
      const revealInterval = setInterval(() => {
        if (currentIndex < rankedArtists.length) {
          setRevealedRanks((prev) => new Set([...prev, rankedArtists[currentIndex]]))
          currentIndex++
        } else {
          clearInterval(revealInterval)
        }
      }, 600) // Reveal each artist every 600ms

      return () => clearInterval(revealInterval)
    } else {
      setRevealedRanks(new Set())
    }
  }, [show, gameState])

  if (!show || !gameState) return null

  const results =
    gameState.round.phase.type === 'selling_to_bank'
      ? gameState.round.phase.results || []
      : []

  const rankedResults = results.filter((r) => r.rank !== null)

  if (rankedResults.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: '16px',
        top: '84px', // Below GameHeader
        width: '320px',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Overlays for each artist row */}
      {ARTIST_ORDER.map((artist, artistIndex) => {
        const result = results.find((r) => r.artist === artist)
        const isRanked = result && result.rank !== null
        const isRevealed = revealedRanks.has(artist)

        if (!isRanked || !isRevealed) return null

        const artistColors = colors.artists[artist]
        const rank = result.rank!
        const value = result.value

        // Calculate position for this artist row
        // ArtistBoard header is ~40px, then ~6px margin, then each row is ~38px
        const rowTop = 40 + 6 + artistIndex * 38

        return (
          <div
            key={artist}
            style={{
              position: 'absolute',
              top: `${rowTop}px`,
              left: 0,
              right: 0,
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              background: `linear-gradient(135deg, ${artistColors.primary}20 0%, ${artistColors.primary}10 100%)`,
              borderRadius: '8px',
              border: `2px solid ${artistColors.primary}60`,
              boxShadow: `0 0 20px ${artistColors.glow}, ${shadows.lg}`,
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'scale(1)' : 'scale(0.95)',
              transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              animation: 'glow 2s ease-in-out infinite',
            }}
          >
            {/* Rank badge */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background:
                  rank === 1
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : rank === 2
                    ? 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)'
                    : 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 800,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                boxShadow: rank === 1 ? shadows.glow.gold : shadows.md,
              }}
            >
              {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
            </div>

            {/* Value display */}
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: colors.accent.gold,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                animation: 'countUp 0.5s ease-out',
              }}
            >
              ${value}k
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px currentColor, ${shadows.lg};
          }
          50% {
            box-shadow: 0 0 30px currentColor, ${shadows.xl};
          }
        }

        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default ArtistValuationAnimation
