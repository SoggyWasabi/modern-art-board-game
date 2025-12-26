import React, { useState } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { HiddenAuctionProps } from '../../../types/auctionComponents'
import { normalizeCardsForAuction, getAuctionHeaderText } from '../../../types/auctionComponents'
import { colors } from '../../../design/premiumTokens'

const HiddenAuction: React.FC<HiddenAuctionProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  cards,
  isDoubleAuction = false,
  doubleAuctionType,
}) => {
  const { submitHiddenBid, passBid } = useGameStore()
  const [bidAmount, setBidAmount] = useState<number>(0)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false)

  // Use helper to normalize cards for display
  const displayCards = normalizeCardsForAuction({ currentAuction, cards, isDoubleAuction, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const headerText = getAuctionHeaderText({ currentAuction, cards, isDoubleAuction, doubleAuctionType, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const humanPlayerId = 'player_0' // Assuming player 0 is the human
  const hasHumanSubmitted = currentAuction.bids[humanPlayerId] !== undefined
  const allBidsSubmitted = currentAuction.readyToReveal
  const bidsRevealed = currentAuction.revealedBids

  // Get player info with their bid status
  const players = gameState?.players || []
  const playerBids = players.map((player: any) => ({
    ...player,
    bid: currentAuction.bids[player.id] || null,
    hasSubmitted: currentAuction.bids[player.id] !== undefined,
    isHuman: player.id === humanPlayerId,
  }))

  // Find winner once bids are revealed
  const winner = bidsRevealed ? players.reduce((highest: any, player: any) => {
    const playerBid = currentAuction.bids[player.id] || 0
    const highestBid = currentAuction.bids[highest?.id] || 0
    return playerBid > highestBid ? player : highest
  }, null) : null

  const highestBid = bidsRevealed ? Math.max(...Object.values(currentAuction.bids)) : 0

  // Handle bid submission
  const handleSubmitBid = () => {
    if (bidAmount > 0 && !hasHumanSubmitted) {
      submitHiddenBid(bidAmount)
      setHasSubmitted(true)
    }
  }

  // Handle pass (bid 0)
  const handlePass = () => {
    if (!hasHumanSubmitted) {
      submitHiddenBid(0)
      setHasSubmitted(true)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '900px',
        minHeight: '450px',
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: `1px solid rgba(251, 191, 36, 0.3)`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: isDoubleAuction ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))' : 'rgba(0, 0, 0, 0.4)',
          borderBottom: `1px solid ${isDoubleAuction ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px' }}>{isDoubleAuction ? '👯' : '🙈'}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {headerText.title}
            </div>
            <div style={{ fontSize: '13px', color: isDoubleAuction ? colors.accent.gold : colors.accent.gold, fontWeight: 500 }}>
              {isDoubleAuction && headerText.subtitle && !allBidsSubmitted ? (
                `${headerText.subtitle} • ${playerBids.filter(p => p.hasSubmitted).length} of ${playerBids.length} bids submitted`
              ) : !allBidsSubmitted
                ? `${playerBids.filter(p => p.hasSubmitted).length} of ${playerBids.length} bids submitted`
                : bidsRevealed
                  ? 'Bids revealed'
                  : 'All bids submitted - revealing...'
              }
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: allBidsSubmitted ? colors.accent.gold : 'white' }}>
            {hasHumanSubmitted ? 'Submitted' : 'Waiting...'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          padding: '20px 24px',
          gap: '24px',
          flex: 1,
        }}
      >
        {/* Card Display */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '14px',
              border: `1px solid ${isDoubleAuction ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {displayCards.map((card, index) => (
                <div
                  key={card.id}
                  style={{
                    transform: `scale(${displayCards.length > 1 ? '1.1' : '1.35'})`,
                    position: 'relative'
                  }}
                >
                  {isDoubleAuction && index === 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        background: colors.accent.gold,
                        color: '#000',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        zIndex: 10
                      }}
                    >
                      +🙈
                    </div>
                  )}
                  <GameCardComponent
                    card={{
                      id: card.id,
                      artist: card.artist,
                      artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
                      cardIndex: card.cardIndex,
                      auctionType: card.auctionType
                    }}
                    size="md"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Package Deal Badge */}
          {isDoubleAuction && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(251, 191, 36, 0.2)',
                borderRadius: '20px',
                border: '1px solid rgba(251, 191, 36, 0.4)',
              }}
            >
              <span style={{ fontSize: '12px' }}>🎁</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: colors.accent.gold }}>
                Package Deal - {displayCards.length} Cards!
              </span>
            </div>
          )}
        </div>

        {/* Players Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
            }}
          >
            Bidders
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {playerBids.map((player: any) => {
              const isWinner = bidsRevealed && winner && player.id === winner.id

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isWinner
                      ? 'rgba(251, 191, 36, 0.2)'
                      : player.hasSubmitted
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                    border: isWinner
                      ? `2px solid ${colors.accent.gold}`
                      : player.hasSubmitted
                        ? '1px solid rgba(76, 175, 80, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: player.hasSubmitted
                          ? bidsRevealed && isWinner
                            ? colors.accent.gold
                            : '#4CAF50'
                          : 'rgba(255, 255, 255, 0.2)',
                        boxShadow: player.hasSubmitted && isWinner ? `0 0 8px ${colors.accent.gold}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                      {player.name}
                    </span>
                    {player.isHuman && !player.hasSubmitted && (
                      <span style={{ fontSize: '12px', color: colors.accent.gold, marginLeft: '8px' }}>
                        (Your turn)
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: bidsRevealed
                        ? player.bid > 0
                          ? colors.accent.gold
                          : 'rgba(239, 68, 68, 0.7)'
                        : player.hasSubmitted
                          ? '#4CAF50'
                          : 'rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    {bidsRevealed
                      ? player.bid > 0
                        ? `$${player.bid}k`
                        : 'Pass'
                      : player.hasSubmitted
                        ? 'Submitted ✓'
                        : !player.isHuman && hasHumanSubmitted
                          ? 'Thinking...'
                          : 'Waiting...'
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action Bar - Always present for consistent height, but content is conditional */}
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderTop: '1px solid rgba(251, 191, 36, 0.2)',
          minHeight: '70px',
        }}
      >
        {isAuctionPlayerTurn && !hasHumanSubmitted && !bidsRevealed ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              <span style={{ padding: '0 10px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>$</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: '80px',
                  padding: '12px 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                }}
                placeholder="0"
                min="0"
                max={gameState?.players[0]?.money || 0}
              />
              <span style={{ padding: '0 10px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>k</span>
            </div>

            <button
              onClick={handlePass}
              style={{
                padding: '14px 24px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '10px',
                color: '#ef4444',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              }}
            >
              Pass (Bid $0)
            </button>

            <button
              onClick={handleSubmitBid}
              disabled={bidAmount <= 0}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: bidAmount > 0 ? colors.accent.gold : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                borderRadius: '10px',
                color: bidAmount > 0 ? '#000' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: bidAmount > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              Submit Secret {isDoubleAuction ? 'Package' : 'Bid'}
            </button>
          </div>
        ) : hasHumanSubmitted && !bidsRevealed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', height: '38px' }}>
            {/* Animated waiting indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: colors.accent.gold,
                    opacity: 0.4 + (i * 0.2),
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              Waiting for AI players to decide...
            </span>
          </div>
        ) : null}
      </div>

      {/* Winner Display - Show when bids are revealed */}
      {bidsRevealed && winner && (
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderTop: `2px solid ${colors.accent.gold}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: colors.accent.gold, marginBottom: '4px' }}>
            🎉 {winner.name} wins {isDoubleAuction ? 'BOTH cards' : 'the auction'}!
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
            Winning bid: ${highestBid}k
          </div>
        </div>
      )}
    </div>
  )
}

export default HiddenAuction