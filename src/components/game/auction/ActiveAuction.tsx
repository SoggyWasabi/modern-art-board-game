import React, { useState, useEffect } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { Card, AuctionType } from '../../../types'
import type { AuctionState } from '../../../types/auction'
import { colors } from '../../../design/premiumTokens'
import FixedPriceAuction from './FixedPriceAuction'
import HiddenAuction from './HiddenAuction'
import OpenAuction from './OpenAuction'
import OneOfferAuction from './OneOfferAuction'
import DoubleAuctionWrapper from './DoubleAuctionWrapper'
import { getArtistIndex } from '../../../engine/constants'

interface ActiveAuctionProps {
  currentAuction: AuctionState
  isAuctionPlayerTurn: boolean
  currentPlayerInAuction: any
  gameState: any
  selectedCard?: Card | null  // For double auction preview
  onClearSelectedCard?: () => void
}

const AUCTION_TYPE_INFO: Record<AuctionType, {
  name: string
  shortName: string
  icon: string
}> = {
  open: {
    name: 'Open Auction',
    shortName: 'Open',
    icon: '🔊',
  },
  one_offer: {
    name: 'One Offer',
    shortName: 'One Offer',
    icon: '☝️',
  },
  hidden: {
    name: 'Hidden Auction',
    shortName: 'Hidden',
    icon: '🙈',
  },
  fixed_price: {
    name: 'Fixed Price',
    shortName: 'Fixed',
    icon: '🏷️',
  },
  double: {
    name: 'Double Auction',
    shortName: 'Double',
    icon: '👯',
  },
}

// Helper to get the primary card from any auction state
const getAuctionCard = (auction: AuctionState): Card => {
  if (auction.type === 'double') {
    return auction.doubleCard
  }
  return auction.card
}

const ActiveAuction: React.FC<ActiveAuctionProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  selectedCard,
  onClearSelectedCard,
}) => {
  const { placeBid, passBid, checkOpenAuctionTimer } = useGameStore()
  const [bidAmount, setBidAmount] = useState<number>(0)
  const auctionCard = getAuctionCard(currentAuction)
  const auctionInfo = AUCTION_TYPE_INFO[auctionCard.auctionType]

  // Set up timer checking for open auctions
  useEffect(() => {
    if (currentAuction.type === 'open' && currentAuction.isActive) {
      const timerInterval = setInterval(() => {
        checkOpenAuctionTimer()
      }, 100) // Check every 100ms

      return () => clearInterval(timerInterval)
    }
  }, [currentAuction, checkOpenAuctionTimer])

  const currentBid = 'currentBid' in currentAuction ? currentAuction.currentBid : 0
  const highestBidder = 'currentBidderId' in currentAuction ? currentAuction.currentBidderId : null

  // Get bidding players (excluding human player "You")
  const biddingPlayers = gameState?.players.filter((p: any) => p.name !== 'You') || []

  // Render specialized auction components
  if (currentAuction.type === 'double') {
    // If in bidding phase with embedded auction, render the embedded auction directly
    // This avoids the visual confusion of showing Double Auction wrapper + inner auction
    if (currentAuction.phase === 'bidding' && currentAuction.embeddedAuction) {
      const embedded = currentAuction.embeddedAuction
      const cards = [currentAuction.doubleCard, currentAuction.secondCard!]

      // Delegate to the appropriate auction component with double context
      switch (embedded.type) {
        case 'one_offer':
          return (
            <OneOfferAuction
              currentAuction={embedded}
              isAuctionPlayerTurn={isAuctionPlayerTurn}
              currentPlayerInAuction={currentPlayerInAuction}
              gameState={gameState}
              cards={cards}
              isDoubleAuction={true}
              doubleAuctionType="one_offer"
            />
          )
        case 'open':
          return (
            <OpenAuction
              currentAuction={embedded}
              isAuctionPlayerTurn={isAuctionPlayerTurn}
              currentPlayerInAuction={currentPlayerInAuction}
              gameState={gameState}
              cards={cards}
              isDoubleAuction={true}
              doubleAuctionType="open"
            />
          )
        case 'hidden':
          return (
            <HiddenAuction
              currentAuction={embedded}
              isAuctionPlayerTurn={isAuctionPlayerTurn}
              currentPlayerInAuction={currentPlayerInAuction}
              gameState={gameState}
              cards={cards}
              isDoubleAuction={true}
              doubleAuctionType="hidden"
            />
          )
        case 'fixed_price':
          return (
            <FixedPriceAuction
              currentAuction={embedded}
              isAuctionPlayerTurn={isAuctionPlayerTurn}
              currentPlayerInAuction={currentPlayerInAuction}
              gameState={gameState}
              cards={cards}
              isDoubleAuction={true}
              doubleAuctionType="fixed_price"
            />
          )
      }
    }

    // Offering phase - render the DoubleAuctionWrapper
    return (
      <DoubleAuctionWrapper
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
        selectedCard={selectedCard}
        onClearSelectedCard={onClearSelectedCard}
      />
    )
  }

  if (currentAuction.type === 'fixed_price') {
    return (
      <FixedPriceAuction
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
      />
    )
  }

  if (currentAuction.type === 'hidden') {
    return (
      <HiddenAuction
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
      />
    )
  }

  if (currentAuction.type === 'one_offer') {
    return (
      <OneOfferAuction
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
      />
    )
  }

  if (currentAuction.type === 'open') {
    return (
      <OpenAuction
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '850px', // 25% wider than previous
        minHeight: '340px', // 10% taller
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
          background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px' }}>{auctionInfo.icon}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {auctionInfo.shortName}
            </div>
            {currentPlayerInAuction && (
              <div style={{ fontSize: '13px', color: colors.accent.gold, fontWeight: 500 }}>
                {currentPlayerInAuction.name}'s turn
              </div>
            )}
          </div>
        </div>

        {(currentAuction.type === 'open' || currentAuction.type === 'one_offer') && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              High Bid
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: colors.accent.gold }}>
              ${currentBid}k
            </div>
          </div>
        )}
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
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ transform: 'scale(1.35)' }}>
            <GameCardComponent
              card={{
                id: auctionCard.id,
                artist: auctionCard.artist,
                artistIndex: getArtistIndex(auctionCard.artist),
                cardIndex: auctionCard.cardIndex,
                auctionType: auctionCard.auctionType,
                artworkId: auctionCard.artworkId || auctionCard.id
              }}
              size="md"
            />
          </div>
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
              } else if (currentAuction.type === 'open') {
                isCurrentTurn = player.id === currentAuction.playerOrder[currentAuction.currentPlayerIndex]
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
                      keep the card
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
                  Take Free
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

export default ActiveAuction
