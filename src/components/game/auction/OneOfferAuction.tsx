import React, { useState } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { OneOfferAuctionState } from '../../../types/auction'
import type { OneOfferAuctionProps } from '../../../types/auctionComponents'
import { normalizeCardsForAuction, getAuctionHeaderText } from '../../../types/auctionComponents'
import { colors } from '../../../design/premiumTokens'
import { getArtistIndex } from '../../../engine/constants'

const OneOfferAuction: React.FC<OneOfferAuctionProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  cards,
  isDoubleAuction = false,
  doubleAuctionType,
}) => {
  const { placeBid, passBid } = useGameStore()
  const [bidAmount, setBidAmount] = useState<number>(0)

  // Use helper to normalize cards for display
  const displayCards = normalizeCardsForAuction({ currentAuction, cards, isDoubleAuction, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const headerText = getAuctionHeaderText({ currentAuction, cards, isDoubleAuction, doubleAuctionType, isAuctionPlayerTurn, currentPlayerInAuction, gameState })

  const currentBid = 'currentBid' in currentAuction ? currentAuction.currentBid : 0
  const highestBidder = 'currentBidderId' in currentAuction ? currentAuction.currentBidderId : null

  // Get bidding players (excluding human player "You")
  const biddingPlayers = gameState?.players.filter((p: any) => p.name !== 'You') || []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '850px',
        minHeight: '390px',
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
          <span style={{ fontSize: '24px' }}>{isDoubleAuction ? '👯' : '☝️'}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {headerText.title}
            </div>
            {headerText.subtitle && (
              <div style={{ fontSize: '13px', color: isDoubleAuction ? colors.accent.gold : 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                {headerText.subtitle}
              </div>
            )}
            {currentPlayerInAuction && (
              <div style={{ fontSize: '13px', color: colors.accent.gold, fontWeight: 500 }}>
                {currentPlayerInAuction.name}'s turn
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isDoubleAuction ? 'Package Bid' : 'High Bid'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: colors.accent.gold }}>
            ${currentBid}k
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal Layout */}
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
                      +{card.auctionType === 'one_offer' ? '☝️' : card.auctionType === 'open' ? '🔊' : card.auctionType === 'hidden' ? '🙈' : '🏷️'}
                    </div>
                  )}
                  <GameCardComponent
                    card={{
                      id: card.id,
                      artist: card.artist,
                      artistIndex: getArtistIndex(card.artist),
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

        {/* Bidders Column */}
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
            {biddingPlayers.map((player: any) => {
              const bidHistory = currentAuction.type === 'one_offer' ? currentAuction.bidHistory || {} : {}
              const playerBid = bidHistory[player.id] || 0
              const isHighestBidder = highestBidder === player.id

              // Check if it's this player's turn
              let isCurrentTurn = false
              if (currentAuction.type === 'one_offer' && currentAuction.phase === 'bidding') {
                const currentPlayerId = currentAuction.turnOrder[currentAuction.currentTurnIndex]
                isCurrentTurn = player.id === currentPlayerId
              }

              // Check if player has passed
              const hasPassed = currentAuction.type === 'one_offer' && bidHistory[player.id] === 0

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isCurrentTurn
                      ? 'rgba(251, 191, 36, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrentTurn
                      ? `1px solid rgba(251, 191, 36, 0.4)`
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
                        background: isCurrentTurn
                          ? colors.accent.gold
                          : isHighestBidder
                            ? '#4CAF50'
                            : 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isCurrentTurn ? `0 0 8px ${colors.accent.gold}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                      {player.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: playerBid > 0
                        ? colors.accent.gold
                        : hasPassed
                          ? 'rgba(239, 68, 68, 0.7)'
                          : 'rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    {playerBid > 0 ? `$${playerBid}k` : hasPassed ? 'Pass' : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action Bar - Only when it's player's turn */}
      {isAuctionPlayerTurn && (
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderTop: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          {currentAuction.type === 'one_offer' && currentAuction.phase === 'auctioneer_decision' ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {currentBid > 0 ? (
                <>
                  <button
                    onClick={() => placeBid(-1)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1))',
                      border: '1px solid rgba(76, 175, 80, 0.5)',
                      borderRadius: '10px',
                      color: '#4CAF50',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>Sell ${currentBid}k</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 400, marginTop: '2px' }}>
                      to {gameState?.players.find((p: any) => p.id === highestBidder)?.name || 'highest bidder'}
                    </div>
                  </button>
                  <button
                    onClick={() => placeBid(currentBid + 1)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1))',
                      border: '1px solid rgba(251, 191, 36, 0.5)',
                      borderRadius: '10px',
                      color: colors.accent.gold,
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>Buy ${currentBid + 1}k</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 400, marginTop: '2px' }}>
                      keep {isDoubleAuction ? 'both cards' : 'the card'}
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => placeBid(-2)}
                  style={{
                    padding: '14px 40px',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1))',
                    border: '1px solid rgba(251, 191, 36, 0.5)',
                    borderRadius: '10px',
                    color: colors.accent.gold,
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Take {isDoubleAuction ? 'Both Cards' : 'Free'}
                </button>
              )}
            </div>
          ) : (
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
                    width: '60px',
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
                />
                <span style={{ padding: '0 10px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>k</span>
              </div>

              <button
                onClick={() => placeBid(bidAmount)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: colors.accent.gold,
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Place Bid
              </button>

              <button
                onClick={() => passBid()}
                style={{
                  padding: '14px 20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Pass
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OneOfferAuction