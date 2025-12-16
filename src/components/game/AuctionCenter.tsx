import React, { useState } from 'react'
import { Card as GameCardComponent } from '../Card'
import { useGameStore } from '../../store/gameStore'
import { isHumanPlayerTurn, getCurrentAuctionPlayer, getOneOfferTurnOrder } from '../../utils/auctionTurnDetection'
import type { Card, AuctionType } from '../../types'
import type { AuctionState } from '../../types/auction'
import { colors } from '../../design/premiumTokens'

type AuctionTypeInfo = {
  name: string
  description: string
  icon: string
}

interface AuctionCenterProps {
  selectedCard: Card | null
  isPlayerTurn: boolean
  onPlayCard: () => void
  onPass: () => void
}

// Helper to get the primary card from any auction state
const getAuctionCard = (auction: AuctionState): Card => {
  if (auction.type === 'double') {
    return auction.doubleCard
  }
  return auction.card
}

const AUCTION_TYPE_INFO: Record<AuctionType, AuctionTypeInfo> = {
  open: {
    name: 'Open Auction',
    description: 'Players take turns bidding. Highest bid wins.',
    icon: '🔊',
  },
  one_offer: {
    name: 'One Offer',
    description: 'Each player gets one chance to bid, starting left of auctioneer.',
    icon: '☝️',
  },
  hidden: {
    name: 'Hidden Auction',
    description: 'All players submit bids secretly. Highest bid wins.',
    icon: '🙈',
  },
  fixed_price: {
    name: 'Fixed Price',
    description: 'Auctioneer sets a price. First taker gets it, or auctioneer buys.',
    icon: '🏷️',
  },
  double: {
    name: 'Double Auction',
    description: 'Can be combined with another card for a joint auction.',
    icon: '👯',
  },
}

const AuctionCenter: React.FC<AuctionCenterProps> = ({
  selectedCard,
  isPlayerTurn,
  onPlayCard,
  onPass,
}) => {
  const { gameState, placeBid, passBid } = useGameStore()
  const [bidAmount, setBidAmount] = useState<number>(0)

  const currentAuction = gameState?.round.phase.type === 'auction'
    ? (gameState.round.phase as { type: 'auction'; auction: AuctionState }).auction
    : null

  // Check if it's the human player's turn in the current auction
  const isAuctionPlayerTurn = gameState ? isHumanPlayerTurn(gameState) : false
  const currentPlayerInAuction = currentAuction && gameState
    ? getCurrentAuctionPlayer(currentAuction, gameState.players)
    : null

  // Render waiting state (no card played yet)
  if (!currentAuction && !selectedCard) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px', // Match card-selected state
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Empty auction area */}
        <div
          style={{
            width: '176px', // Match card selected state's scaled card width (160px * 1.1)
            height: '246px', // Match card selected state's scaled card height (224px * 1.1)
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px', // Match card selected state's marginBottom
          }}
        >
          <span style={{ fontSize: '48px', opacity: 0.3 }}>🎨</span>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: '8px',
              textAlign: 'center',
            }}
          >
            {isPlayerTurn ? 'Select a card to auction' : 'Waiting for card...'}
          </span>
        </div>

        {/* Instructions */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            maxWidth: '280px',
          }}
        >
          {isPlayerTurn
            ? 'Click a card from your hand, then play it to start an auction.'
            : 'Wait for the current player to play a card.'}
        </p>
      </div>
    )
  }

  // Render card selected but not yet played
  if (!currentAuction && selectedCard) {
    const auctionInfo = AUCTION_TYPE_INFO[selectedCard.auctionType]

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Selected card preview */}
        <div
          style={{
            marginBottom: '16px',
            animation: 'scale-in 0.3s ease-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          <div style={{ transform: 'scale(1.1)' }}>
            <GameCardComponent
              card={{
                id: selectedCard.id,
                artist: selectedCard.artist,
                artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(selectedCard.artist),
                cardIndex: parseInt(selectedCard.id.split('_')[1]) || 0,
                auctionType: selectedCard.auctionType
              }}
              size="lg"
            />
          </div>
        </div>

        {/* Auction type info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '24px' }}>{auctionInfo.icon}</span>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
              }}
            >
              {auctionInfo.name}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                maxWidth: '220px',
              }}
            >
              {auctionInfo.description}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onPlayCard}
            disabled={!isPlayerTurn}
            style={{
              padding: '14px 32px',
              background: colors.accent.gold,
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
              opacity: isPlayerTurn ? 1 : 0.5,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (isPlayerTurn) {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(251, 191, 36, 0.4)`
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Play Card
          </button>
          <button
            onClick={onPass}
            disabled={!isPlayerTurn}
            style={{
              padding: '14px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
              opacity: isPlayerTurn ? 1 : 0.5,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (isPlayerTurn) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            Pass
          </button>
        </div>
      </div>
    )
  }

  // Render active auction with 2-column layout
  if (currentAuction) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: `2px solid ${colors.accent.gold}`,
          animation: 'scale-in 0.3s ease-out',
        }}
      >
        {/* Auction active banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(251, 191, 36, 0.2)',
            borderRadius: '20px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.accent.gold,
              animation: 'pulse-glow 1s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: colors.accent.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Auction in Progress
          </span>
        </div>

        {/* Main auction content - 2 column layout */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            width: '100%',
            maxWidth: '900px',
            alignItems: 'flex-start',
          }}
        >
          {/* Left column - Auction card and bid controls */}
          <div
            style={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {(() => {
              const auctionCard = getAuctionCard(currentAuction)
              return (
                <>
                  <div style={{ transform: 'scale(1.1)', marginBottom: '16px' }}>
                    <GameCardComponent
                      card={{
                        id: auctionCard.id,
                        artist: auctionCard.artist,
                        artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(auctionCard.artist),
                        cardIndex: parseInt(auctionCard.id.split('_')[1]) || 0,
                        auctionType: auctionCard.auctionType
                      }}
                      size="lg"
                    />
                  </div>
                  {/* Auction type */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>
                      {AUCTION_TYPE_INFO[auctionCard.auctionType].icon}
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'white',
                      }}
                    >
                      {AUCTION_TYPE_INFO[auctionCard.auctionType].name}
                    </span>
                  </div>

                  {/* Current bid display */}
                  {(currentAuction.type === 'open' || currentAuction.type === 'one_offer') && (
                    <div
                      style={{
                        textAlign: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        Current Bid
                      </div>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          color: colors.accent.gold,
                        }}
                      >
                        ${'currentBid' in currentAuction ? currentAuction.currentBid : 0}k
                      </div>
                    </div>
                  )}

                  {/* Bid controls */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      maxWidth: '280px',
                    }}
                  >
                    {/* Bid input for regular bidding */}
                    {!(currentAuction.type === 'one_offer' &&
                      currentAuction.phase === 'auctioneer_decision') && (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                          }}
                        >
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                            disabled={!isAuctionPlayerTurn}
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              background: isAuctionPlayerTurn
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: isAuctionPlayerTurn ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              fontSize: '16px',
                              fontWeight: 600,
                              textAlign: 'center',
                              outline: 'none',
                              opacity: isAuctionPlayerTurn ? 1 : 0.6,
                            }}
                            placeholder="Enter bid..."
                          />
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>k</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button
                            onClick={() => isAuctionPlayerTurn && placeBid(bidAmount)}
                            disabled={!isAuctionPlayerTurn}
                            style={{
                              flex: 1,
                              padding: '10px',
                              background: isAuctionPlayerTurn ? colors.accent.gold : 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: '8px',
                              color: isAuctionPlayerTurn ? '#000' : 'rgba(255, 255, 255, 0.5)',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: isAuctionPlayerTurn ? 'pointer' : 'not-allowed',
                              opacity: isAuctionPlayerTurn ? 1 : 0.5,
                            }}
                          >
                            Place Bid
                          </button>
                          <button
                            onClick={() => isAuctionPlayerTurn && passBid()}
                            disabled={!isAuctionPlayerTurn}
                            style={{
                              padding: '10px 16px',
                              background: isAuctionPlayerTurn ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: isAuctionPlayerTurn ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: isAuctionPlayerTurn ? 'pointer' : 'not-allowed',
                              opacity: isAuctionPlayerTurn ? 1 : 0.5,
                            }}
                          >
                            Pass
                          </button>
                        </div>
                      </>
                    )}

                    {/* One Offer Auctioneer Decision Phase */}
                    {currentAuction.type === 'one_offer' &&
                     currentAuction.phase === 'auctioneer_decision' &&
                     isAuctionPlayerTurn && (
                      <div
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(251, 191, 36, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: colors.accent.gold,
                            marginBottom: '12px',
                            textAlign: 'center',
                          }}
                        >
                          Auctioneer Decision
                        </div>

                        {currentAuction.currentBid > 0 ? (
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button
                              onClick={() => placeBid(-1)} // Accept bid
                              style={{
                                flex: 1,
                                padding: '10px',
                                background: 'rgba(76, 175, 80, 0.2)',
                                border: '1px solid rgba(76, 175, 80, 0.4)',
                                borderRadius: '8px',
                                color: '#4CAF50',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Accept
                              <div style={{ fontSize: '9px', marginTop: '1px', opacity: 0.8 }}>
                                +${currentAuction.currentBid}k
                              </div>
                            </button>

                            <button
                              onClick={() => placeBid(currentAuction.currentBid + 1)} // Outbid
                              style={{
                                flex: 1,
                                padding: '10px',
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                borderRadius: '8px',
                                color: colors.accent.gold,
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Buy ${currentAuction.currentBid + 1}k
                              <div style={{ fontSize: '9px', marginTop: '1px', opacity: 0.8 }}>
                                Keep painting
                              </div>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => placeBid(-2)} // Take free
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              border: '1px solid rgba(251, 191, 36, 0.4)',
                              borderRadius: '8px',
                              color: colors.accent.gold,
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Take Free
                          </button>
                        )}
                      </div>
                    )}

                    {/* Turn indicator */}
                    {!isAuctionPlayerTurn && currentPlayerInAuction && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}
                      >
                        Waiting for {currentPlayerInAuction.name}...
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>

          {/* Right column - Bidding info and turn order */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: '0',
            }}
          >
            {/* One Offer Auction - Turn Order Display */}
            {currentAuction.type === 'one_offer' && (
              <div
                style={{
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: colors.accent.gold,
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                  }}
                >
                  Bidding Progress
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {getOneOfferTurnOrder(currentAuction, gameState!.players).map((turn) => {
                    const playerBid = currentAuction.currentBidderId === turn.player.id ? currentAuction.currentBid : null

                    return (
                      <div
                        key={turn.player.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: turn.status === 'current'
                            ? 'rgba(251, 191, 36, 0.2)'
                            : turn.status === 'completed'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          border: turn.status === 'current'
                            ? '1px solid rgba(251, 191, 36, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: turn.status === 'current'
                              ? colors.accent.gold
                              : turn.status === 'completed'
                              ? 'rgba(255, 255, 255, 0.5)'
                              : 'rgba(255, 255, 255, 0.2)',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'white',
                            flex: 1,
                          }}
                        >
                          {turn.player.name}
                          {turn.player.id === currentAuction.auctioneerId && (
                            <span style={{ opacity: 0.7 }}> (Auctioneer)</span>
                          )}
                        </span>
                        {playerBid && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: colors.accent.gold,
                              fontWeight: 600,
                            }}
                          >
                            ${playerBid}k
                          </span>
                        )}
                        {turn.status === 'current' && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: colors.accent.gold,
                              fontWeight: 600,
                            }}
                          >
                            YOUR TURN
                          </span>
                        )}
                        {turn.status === 'completed' && !playerBid && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'rgba(255, 255, 255, 0.5)',
                            }}
                          >
                            PASSED
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default AuctionCenter