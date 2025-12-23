import React, { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { Card as GameCardComponent } from '../Card'
import { colors } from '../../design/premiumTokens'
import type { Player } from '../../types'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

interface GameStartSequenceProps {
  onComplete: () => void
}

type Phase = 'dealing' | 'selecting' | 'complete'

const GameStartSequence: React.FC<GameStartSequenceProps> = ({ onComplete }) => {
  const { gameState, setGameStartPhase, setFirstPlayerIndex } = useGameStore()
  const [phase, setPhase] = useState<Phase>('dealing')
  const [dealtCards, setDealtCards] = useState<{ playerId: string; cardIndex: number; delay: number }[]>([])
  const [highlightedPlayer, setHighlightedPlayer] = useState<number | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [pulseSpeed, setPulseSpeed] = useState<'slow' | 'medium' | 'fast'>('slow')
  const [hasCompleted, setHasCompleted] = useState(false) // Track completion to prevent multiple calls

  const players = gameState?.players || []
  const playerCount = players.length
  const humanPlayer = players[0] // Human is always index 0
  const aiPlayers = players.slice(1) // AI players are index 1+
  const aiPlayerCount = aiPlayers.length

  // Calculate AI player positions in a semi-circle at the top (excludes human player)
  const getAIPlayerPosition = useCallback((aiIndex: number, totalAI: number) => {
    // Position AI players in an arc at the top of the screen
    if (totalAI === 1) {
      return { x: 50, y: 15 }
    }
    const angleStart = -50 // degrees from top
    const angleEnd = 50
    const angleRange = angleEnd - angleStart
    const angle = angleStart + (angleRange / (totalAI - 1)) * aiIndex
    const radians = (angle * Math.PI) / 180

    // Distance from center
    const radius = 30 // percentage of viewport

    return {
      x: 50 + Math.sin(radians) * radius,
      y: 12 + (1 - Math.cos(radians)) * 15,
    }
  }, [])

  // Calculate card deal destination
  const getCardDealPosition = useCallback((playerIndex: number) => {
    if (playerIndex === 0) {
      // Human player - cards go to bottom center
      return {
        x: `0px`,
        y: `35vh`,
        rotate: `0deg`,
      }
    }
    // AI players - cards go to their position at top
    const aiIndex = playerIndex - 1
    const pos = getAIPlayerPosition(aiIndex, aiPlayerCount)
    return {
      x: `calc(${pos.x}vw - 50vw)`,
      y: `calc(${pos.y}vh - 50vh)`,
      rotate: `${(aiIndex - Math.floor(aiPlayerCount / 2)) * 5}deg`,
    }
  }, [getAIPlayerPosition, aiPlayerCount])

  // Phase 1: Dealing animation
  useEffect(() => {
    if (phase !== 'dealing' || !gameState) return

    setGameStartPhase('dealing')

    // Calculate cards per player
    const cardsPerPlayer = players.map((p: Player) => p.hand.length)

    // Create staggered deal sequence
    const deals: { playerId: string; cardIndex: number; delay: number }[] = []
    let dealIndex = 0
    const maxCards = Math.max(...cardsPerPlayer)

    // Deal cards round-robin style
    for (let cardNum = 0; cardNum < maxCards; cardNum++) {
      for (let playerIdx = 0; playerIdx < playerCount; playerIdx++) {
        if (cardNum < cardsPerPlayer[playerIdx]) {
          deals.push({
            playerId: players[playerIdx].id,
            cardIndex: cardNum,
            delay: dealIndex * 80, // 80ms between each card
          })
          dealIndex++
        }
      }
    }

    // Animate cards one by one
    deals.forEach((deal) => {
      setTimeout(() => {
        setDealtCards(prev => [...prev, deal])
      }, deal.delay)
    })

    // Move to next phase after all cards dealt
    const totalDealTime = deals.length * 80 + 500
    setTimeout(() => {
      setPhase('selecting')
    }, totalDealTime)
  }, [phase, gameState, players, playerCount, setGameStartPhase])

  // Phase 2: First player selection (lottery animation)
  useEffect(() => {
    if (phase !== 'selecting' || hasCompleted) return

    setGameStartPhase('selecting_first_player')

    let interval = 400 // Start slow
    let currentIndex = 0
    let iterations = 0
    const maxIterations = 20 + Math.floor(Math.random() * 10) // Random number of spins
    const winnerIndex = Math.floor(Math.random() * playerCount)

    console.log('[Random First Player] Player count:', playerCount, 'Winner index:', winnerIndex, 'Winner name:', players[winnerIndex]?.name)

    const spin = () => {
      setHighlightedPlayer(currentIndex)
      currentIndex = (currentIndex + 1) % playerCount
      iterations++

      // Speed up as we go
      if (iterations < 5) {
        setPulseSpeed('slow')
        interval = 400
      } else if (iterations < 12) {
        setPulseSpeed('medium')
        interval = 200
      } else if (iterations < maxIterations - 5) {
        setPulseSpeed('fast')
        interval = 100
      } else {
        // Slow down at the end
        interval = 150 + (iterations - (maxIterations - 5)) * 50
      }

      if (iterations < maxIterations) {
        setTimeout(spin, interval)
      } else {
        // Land on winner
        setHighlightedPlayer(winnerIndex)
        setSelectedPlayer(winnerIndex)
        setFirstPlayerIndex(winnerIndex)
        console.log('First player selected:', { winnerIndex, playerName: players[winnerIndex]?.name })

        // Wait for celebration animation then complete
        setTimeout(() => {
          setPhase('complete')
          setGameStartPhase('ready')
          setTimeout(() => {
            if (!hasCompleted) {
              setHasCompleted(true)
              console.log('GameStartSequence: Calling onComplete', { phase, selectedPlayer })
              onComplete()
            }
          }, 1500)
        }, 500)
      }
    }

    setTimeout(spin, 500) // Short delay before starting
  }, [phase, playerCount, hasCompleted])

  // Render deck stack
  const renderDeck = () => {
    const remainingCards = 70 - dealtCards.length
    const stackLayers = Math.min(10, Math.ceil(remainingCards / 7))

    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          perspective: '1000px',
        }}
      >
        {/* Deck stack */}
        {Array.from({ length: stackLayers }).map((_, i) => (
          <div
            key={`stack-${i}`}
            style={{
              position: 'absolute',
              width: '100px',
              height: '140px',
              background: `linear-gradient(135deg, #2d3748 0%, #1a202c 100%)`,
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              transform: `translate(-50%, -50%) translateZ(${i * 2}px) rotate(${(i % 2 === 0 ? -1 : 1) * (i * 0.5)}deg)`,
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              animation: remainingCards > 0 ? 'deck-shuffle 0.3s ease-in-out infinite' : 'none',
            }}
          >
            {/* Card back pattern */}
            <div
              style={{
                position: 'absolute',
                inset: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '4px',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(251,191,36,0.05) 5px, rgba(251,191,36,0.05) 10px)',
              }}
            />
          </div>
        ))}

        {/* Card count */}
        {remainingCards > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '160px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {remainingCards} cards remaining
          </div>
        )}
      </div>
    )
  }

  // Render flying cards (including human player cards)
  const renderFlyingCards = () => {
    return dealtCards.map((deal, index) => {
      const playerIndex = players.findIndex((p: Player) => p.id === deal.playerId)
      const pos = getCardDealPosition(playerIndex)

      return (
        <div
          key={`flying-${deal.playerId}-${deal.cardIndex}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '120px',
            height: '168px',
            background: `linear-gradient(135deg, #2d3748, #1a202c)`,
            border: `2px solid rgba(255,255,255,0.2)`,
            borderRadius: '8px',
            animation: 'deal-card 0.5s ease-out forwards',
            ['--deal-x' as string]: pos.x,
            ['--deal-y' as string]: pos.y,
            ['--deal-rotate' as string]: pos.rotate,
            animationDelay: '0ms',
            zIndex: index,
          }}
        >
          {/* Card back with matching main page style */}
          <div
            style={{
              position: 'absolute',
              inset: '6px',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '6px',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251,191,36,0.05) 8px, rgba(251,191,36,0.05) 16px)',
            }}
          />
          {/* Gold edge decoration */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '30px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))',
              borderRadius: '6px 6px 0 0',
            }}
          />
        </div>
      )
    })
  }

  // Render AI players at top
  const renderAIPlayers = () => {
    return aiPlayers.map((player: Player, aiIndex: number) => {
      const playerIndex = aiIndex + 1 // Real player index
      const pos = getAIPlayerPosition(aiIndex, aiPlayerCount)
      const isHighlighted = highlightedPlayer === playerIndex
      const isSelected = selectedPlayer === playerIndex
      const cardsDealt = dealtCards.filter(d => d.playerId === player.id).length

      let animationStyle = {}
      if (isSelected) {
        animationStyle = {
          animation: 'player-selected 0.8s ease-out forwards',
        }
      } else if (isHighlighted && phase === 'selecting') {
        const animName = pulseSpeed === 'slow' ? 'player-pulse-slow' :
                         pulseSpeed === 'medium' ? 'player-pulse-medium' : 'player-pulse-fast'
        const duration = pulseSpeed === 'slow' ? '0.8s' : pulseSpeed === 'medium' ? '0.4s' : '0.2s'
        animationStyle = {
          animation: `${animName} ${duration} ease-in-out infinite`,
        }
      }

      return (
        <div
          key={player.id}
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            ['--player-color' as string]: PLAYER_COLORS[playerIndex],
            ...animationStyle,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${PLAYER_COLORS[playerIndex]}, ${PLAYER_COLORS[playerIndex]}88)`,
              border: isSelected ? `4px solid ${colors.accent.gold}` : `3px solid rgba(255,255,255,0.3)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white',
              boxShadow: isSelected
                ? `0 0 40px ${PLAYER_COLORS[playerIndex]}, 0 0 60px ${colors.accent.gold}`
                : isHighlighted
                ? `0 0 30px ${PLAYER_COLORS[playerIndex]}`
                : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'box-shadow 0.15s ease, border 0.15s ease',
            }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>

          {/* Name */}
          <div
            style={{
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              opacity: isSelected ? 1 : 0.9,
            }}
          >
            {player.name}
          </div>

          {/* Cards dealt indicator (card backs) */}
          {cardsDealt > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '2px',
                marginTop: '4px',
              }}
            >
              {/* Just show a single card back icon - don't reveal count */}
              <div
                style={{
                  width: '24px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #2d3748, #1a202c)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  opacity: 0.8,
                  animation: 'scale-in 0.2s ease-out',
                }}
              />
            </div>
          )}

          {/* Selected indicator */}
          {isSelected && (
            <div
              style={{
                marginTop: '8px',
                padding: '6px 16px',
                background: colors.accent.gold,
                color: '#000',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '14px',
                animation: 'fade-in-up 0.5s ease-out',
              }}
            >
              Goes First!
            </div>
          )}
        </div>
      )
    })
  }

  // Render human player at bottom with their cards
  const renderHumanPlayer = () => {
    if (!humanPlayer) return null

    const isHighlighted = highlightedPlayer === 0
    const isSelected = selectedPlayer === 0
    const humanCardsDealt = dealtCards.filter(d => d.playerId === humanPlayer.id)

    let animationStyle = {}
    if (isSelected) {
      animationStyle = {
        animation: 'player-selected 0.8s ease-out forwards',
      }
    } else if (isHighlighted && phase === 'selecting') {
      const animName = pulseSpeed === 'slow' ? 'player-pulse-slow' :
                       pulseSpeed === 'medium' ? 'player-pulse-medium' : 'player-pulse-fast'
      const duration = pulseSpeed === 'slow' ? '0.8s' : pulseSpeed === 'medium' ? '0.4s' : '0.2s'
      animationStyle = {
        animation: `${animName} ${duration} ease-in-out infinite`,
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          ...animationStyle,
        }}
      >
        {/* Player info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 20px',
            background: isSelected ? `rgba(251, 191, 36, 0.2)` : 'rgba(0,0,0,0.3)',
            border: isSelected ? `2px solid ${colors.accent.gold}` : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '30px',
            boxShadow: isHighlighted || isSelected ? `0 0 20px ${PLAYER_COLORS[0]}` : 'none',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${PLAYER_COLORS[0]}, ${PLAYER_COLORS[0]}88)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            Y
          </div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
            You
          </span>
          {isSelected && (
            <span
              style={{
                padding: '4px 12px',
                background: colors.accent.gold,
                color: '#000',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              Goes First!
            </span>
          )}
        </div>

        {/* Dealt cards fan */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: '280px',
            width: '100%',
            maxWidth: '900px',
            position: 'relative',
          }}
        >
          {humanCardsDealt.map((deal, i) => {
            const card = humanPlayer.hand[deal.cardIndex]
            if (!card) return null

            const totalCards = humanCardsDealt.length
            const fanAngle = Math.min(8, 40 / totalCards) // Degrees per card
            const rotation = (i - (totalCards - 1) / 2) * fanAngle
            const yOffset = Math.abs(i - (totalCards - 1) / 2) * 8 // Arc effect
            const cardSpacing = 100 // Spacing between cards

            return (
              <div
                key={`human-card-${deal.cardIndex}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 0,
                  transform: `translateX(-50%) translateX(${(i - (totalCards - 1) / 2) * cardSpacing}px) rotate(${rotation}deg) translateY(-${yOffset}px)`,
                  transition: 'all 0.3s ease-out',
                  animation: 'scale-in 0.5s ease-out',
                  animationDelay: `${deal.delay}ms`,
                  animationFillMode: 'backwards',
                  zIndex: i,
                }}
              >
                <GameCardComponent
                  card={{
                    id: card.id,
                    artist: card.artist,
                    artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
                    cardIndex: deal.cardIndex,
                    auctionType: card.auctionType
                  }}
                  size="lg"
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: phase === 'complete'
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1c20 100%)'
          : 'linear-gradient(135deg, #1a1c20 0%, #2d3436 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: phase === 'complete' ? 0.02 : 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 48px)',
            fontWeight: 300,
            color: 'white',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.9,
          }}
        >
          {phase === 'dealing' && 'Dealing Cards...'}
          {phase === 'selecting' && 'Selecting First Player...'}
          {phase === 'complete' && 'Get Ready to Play!'}
        </h1>
      </div>

      {/* Players */}
      {phase !== 'complete' && (
        <>
          {renderAIPlayers()}
          {renderHumanPlayer()}
        </>
      )}

      {/* Deck and flying cards */}
      {phase === 'dealing' && (
        <>
          {renderDeck()}
          {renderFlyingCards()}
        </>
      )}

      {/* Center text for selection phase */}
      {phase === 'selecting' && !selectedPlayer && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              animation: 'pulse-glow 0.5s ease-in-out infinite',
            }}
          >
            🎲
          </div>
        </div>
      )}

      {/* Game starting screen */}
      {phase === 'complete' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              marginBottom: '20px',
              animation: 'pulse-glow 1s ease-in-out infinite',
            }}
          >
            {selectedPlayer === 0 ? '🎮' : '🤖'}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: colors.accent.gold,
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            {players[selectedPlayer || 0]?.name} Goes First!
          </div>
          <div
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Starting game...
          </div>
        </div>
      )}
    </div>
  )
}

export default GameStartSequence
