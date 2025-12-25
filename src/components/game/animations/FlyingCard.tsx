import React, { useEffect, useState, useRef } from 'react'
import { Card as GameCardComponent } from '../../Card'
import type { Card } from '../../types'

interface FlyingCardProps {
  card: Card
  sourcePosition: { x: number; y: number } | null
  targetPosition: { x: number; y: number }
  delay: number
  visible: boolean
}

/**
 * A single flying card animation using pure React + CSS transforms.
 *
 * The card appears at its source position, then animates to the target (bank)
 * using GPU-accelerated CSS transforms. No DOM manipulation.
 */
const FlyingCard: React.FC<FlyingCardProps> = ({
  card,
  sourcePosition,
  targetPosition,
  delay,
  visible,
}) => {
  const [isFlying, setIsFlying] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible || !sourcePosition) {
      setIsFlying(false)
      setOpacity(1)
      return
    }

    // Start flying after delay
    const startTimer = setTimeout(() => {
      setIsFlying(true)
    }, delay)

    // Fade out as card arrives
    const fadeTimer = setTimeout(() => {
      setOpacity(0)
    }, delay + 800)

    // Reset for potential re-animation
    const resetTimer = setTimeout(() => {
      setIsFlying(false)
    }, delay + 1200)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(fadeTimer)
      clearTimeout(resetTimer)
    }
  }, [visible, sourcePosition, delay])

  // Don't render until we have source position and are visible
  if (!visible || !sourcePosition) {
    return null
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: isFlying ? targetPosition.x : sourcePosition.x,
        top: isFlying ? targetPosition.y : sourcePosition.y,
        transform: 'translate(-50%, -50%)',
        opacity: opacity,
        transition: 'left 1s cubic-bezier(0.22, 1, 0.36, 1), top 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease-out 0.8s',
        transitionDelay: `${delay}ms`,
        pointerEvents: 'none',
        zIndex: 100,
        willChange: 'left, top, opacity',
      }}
    >
      <div
        style={{
          transform: isFlying ? 'scale(0.3) rotate(15deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 1s cubic-bezier(0.22, 1, 0.36, 1)',
          transitionDelay: `${delay}ms`,
        }}
      >
        <GameCardComponent
          card={{
            id: card.id,
            artist: card.artist,
            artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
            cardIndex: 0,
            auctionType: card.auctionType
          }}
          size="sm"
        />
      </div>
    </div>
  )
}

export default FlyingCard
