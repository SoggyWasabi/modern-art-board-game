import React from 'react'
import { Card as GameCardComponent } from '../../../components/Card'
import { useGameStore } from '../../../store/gameStore'
import { isHumanPlayerTurn, getCurrentAuctionPlayer, getOneOfferTurnOrder } from '../../../utils/auctionTurnDetection'
import type { Card, AuctionState } from '../../../types'
import { colors } from '../../../design/premiumTokens'

interface CompactAuctionCenterProps {
  selectedCard: Card | null
  isPlayerTurn: boolean
  onPlayCard: () => void
  onPass: () => void
}

// Get the primary card from any auction state
const getAuctionCard = (auction: AuctionState): Card => {
  if (auction.type === 'double') {
    const doubleAuction = auction as any
    return doubleAuction.doubleCard
  }
  const singleAuction = auction as any
  return singleAuction.card
}

const AUCTION_TYPE_INFO = {
  open: { name: 'Open Auction', icon: '🔊' },
  one_offer: { name: 'One Offer', icon: '☝️' },
  hidden: { name: 'Hidden', icon: '🙈' },
  fixed_price: { name: 'Fixed Price', icon: '🏷️' },
  double: { name: 'Double', icon: '👯' },
}

export const CompactAuctionCenter: React.FC<CompactAuctionCenterProps> = ({
  selectedCard,
  isPlayerTurn,
  onPlayCard,
  onPass,
}) => {
  const { gameState, placeBid, passBid } = useGameStore()
  const [bidAmount, setBidAmount] = React.useState<number>(0)

  const currentAuction = gameState?.round.phase.type === 'auction'
    ? (gameState.round.phase as { type: 'auction'; auction: AuctionState }).auction
    : null

  const isAuctionPlayerTurn = gameState ? isHumanPlayerTurn(gameState) : false

  // Empty state - no card selected
  if (!currentAuction && !selectedCard) {
    return (
      <div
        style={{
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          padding: '32px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '64px', opacity: 0.3 }}>🎨</span>
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '16px',
            }}
          >
            {isPlayerTurn ? 'Select a card from your hand to start an auction' : 'Waiting for a card to be played...'}
          </div>
        </div>
      </div>
    )
  }

  // Card selected state
  if (!currentAuction && selectedCard) {
    const auctionInfo = AUCTION_TYPE_INFO[selectedCard.auctionType]

    return (
      <div
        style={{
          height: '380px', // Fixed height to match other states
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Card at top */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ transform: 'scale(1.1)' }}>
            <GameCardComponent
              card={{
                id: selectedCard.id,
                artist: selectedCard.artist,
                artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(selectedCard.artist),
                cardIndex: selectedCard.cardIndex,
                auctionType: selectedCard.auctionType
              }}
              size="lg"
            />
          </div>
        </div>

        {/* Auction type info */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '8px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{auctionInfo.icon}</span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'white',
              }}
            >
              {auctionInfo.name}
            </span>
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {selectedCard.artist} • Card #{selectedCard.cardIndex + 1}
          </div>
        </div>

              {/* Auction type info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
            borderRadius: '8px',
            border: `1px solid ${colors.accent.gold}20`,
            marginBottom: '12px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              opacity: 0.8,
            }}
          >
            {selectedCard.auctionType === 'open' && '🔊'}
            {selectedCard.auctionType === 'one_offer' && '☝️'}
            {selectedCard.auctionType === 'hidden' && '🙈'}
            {selectedCard.auctionType === 'fixed_price' && '💰'}
            {selectedCard.auctionType === 'double' && '👯'}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '2px',
              }}
            >
              {selectedCard.auctionType === 'open' && 'Open Bidding'}
              {selectedCard.auctionType === 'one_offer' && 'One Offer Only'}
              {selectedCard.auctionType === 'hidden' && 'Secret Bids'}
              {selectedCard.auctionType === 'fixed_price' && 'Fixed Price'}
              {selectedCard.auctionType === 'double' && 'Double Auction'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.3',
              }}
            >
              {selectedCard.auctionType === 'open' && 'Take turns bidding. Highest bid wins the painting.'}
              {selectedCard.auctionType === 'one_offer' && 'Each player gets one chance to bid left of auctioneer.'}
              {selectedCard.auctionType === 'hidden' && 'Submit secret bids. Highest bidder pays their amount.'}
              {selectedCard.auctionType === 'fixed_price' && 'Set price. First to accept buys it.'}
              {selectedCard.auctionType === 'double' && 'Can be paired with another card of this artist.'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: 'auto', // Push buttons to bottom
        }}>
          <button
            onClick={onPlayCard}
            disabled={!isPlayerTurn}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: isPlayerTurn ? colors.accent.gold : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: isPlayerTurn ? '#000' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
              opacity: isPlayerTurn ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (isPlayerTurn) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Start Auction
          </button>
          <button
            onClick={onPass}
            disabled={!isPlayerTurn}
            style={{
              padding: '12px 24px',
              background: isPlayerTurn ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: isPlayerTurn ? 'white' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
              opacity: isPlayerTurn ? 1 : 0.5,
              transition: 'background 0.2s ease',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Active auction state
  if (currentAuction) {
    const auctionCard = getAuctionCard(currentAuction)
    const auctionInfo = AUCTION_TYPE_INFO[auctionCard.auctionType]

    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: `2px solid ${colors.accent.gold}`,
          padding: '30px',
          height: '100%', // Use full available height
          minHeight: '500px', // Ensure minimum height
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1200px', // Allow wider if available
          margin: '0 auto', // Center if narrower than available
        }}
      >
        {/* Header - Big and impactful */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>{auctionInfo.icon}</span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'white',
              }}
            >
              {auctionInfo.name} Auction
            </span>
          </div>
          {(currentAuction.type === 'open' || currentAuction.type === 'one_offer') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                background: 'rgba(251, 191, 36, 0.15)',
                borderRadius: '30px',
                border: '2px solid rgba(251, 191, 36, 0.5)',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 700,
                }}
              >
                CURRENT BID
              </span>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: colors.accent.gold,
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
                }}
              >
                ${'currentBid' in currentAuction ? (currentAuction as any).currentBid : 0}k
              </span>
            </div>
          )}
        </div>

        {/* Three column layout - much more spacious */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr 240px',
            gap: '40px',
            flex: 1,
          }}
        >
          {/* Left: Card display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ transform: 'scale(1.5)', marginBottom: '20px' }}>
              <GameCardComponent
                card={{
                  id: auctionCard.id,
                  artist: auctionCard.artist,
                  artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(auctionCard.artist),
                  cardIndex: auctionCard.cardIndex,
                  auctionType: auctionCard.auctionType
                }}
                size="xl"
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '8px',
                }}
              >
                {auctionCard.artist}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Card #{auctionCard.cardIndex + 1}
              </div>
            </div>
          </div>

          {/* Middle: Bidding controls and main content */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            {/* One Offer Auctioneer Decision */}
            {currentAuction.type === 'one_offer' &&
             (currentAuction as any).phase === 'auctioneer_decision' &&
             isAuctionPlayerTurn && (
              <div
                style={{
                  padding: '30px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  borderRadius: '16px',
                  border: '2px solid rgba(251, 191, 36, 0.4)',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: colors.accent.gold,
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  Auctioneer Decision
                </div>

                {(currentAuction as any).currentBid > 0 && (currentAuction as any).currentBidderId && (
                  <div
                    style={{
                      fontSize: '16px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      textAlign: 'center',
                      marginBottom: '20px',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ marginBottom: '6px' }}>HIGHEST BID</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: colors.accent.gold }}>
                      {gameState?.players.find(p => p.id === (currentAuction as any).currentBidderId)?.name}
                    </div>
                    <div style={{ fontSize: '16px', marginTop: '4px', opacity: 0.9 }}>${(currentAuction as any).currentBid}k</div>
                  </div>
                )}

                {(currentAuction as any).currentBid > 0 ? (
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button
                      onClick={() => placeBid(-1)}
                      style={{
                        flex: 1,
                        padding: '20px',
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '2px solid rgba(76, 175, 80, 0.4)',
                        borderRadius: '14px',
                        color: '#4CAF50',
                        fontSize: '18px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(76, 175, 80, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      ACCEPT BID
                      <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.9 }}>
                        Earn +${(currentAuction as any).currentBid}k
                      </div>
                    </button>

                    <button
                      onClick={() => placeBid((currentAuction as any).currentBid + 1)}
                      style={{
                        flex: 1,
                        padding: '20px',
                        background: 'rgba(251, 191, 36, 0.2)',
                        border: '2px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '14px',
                        color: colors.accent.gold,
                        fontSize: '18px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(251, 191, 36, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      BUY ${(currentAuction as any).currentBid + 1}k
                      <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.9 }}>
                        Keep painting
                      </div>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => placeBid(-2)}
                    style={{
                      width: '100%',
                      padding: '24px',
                      background: 'rgba(251, 191, 36, 0.2)',
                      border: '2px solid rgba(251, 191, 36, 0.4)',
                      borderRadius: '14px',
                      color: colors.accent.gold,
                      fontSize: '20px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    TAKE FREE
                  </button>
                )}
              </div>
            )}

            {/* Regular bidding controls */}
            {!(currentAuction.type === 'one_offer' &&
              (currentAuction as any).phase === 'auctioneer_decision') && (
              <>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={!isAuctionPlayerTurn}
                      style={{
                        width: '200px',
                        padding: '20px',
                        background: isAuctionPlayerTurn
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        color: isAuctionPlayerTurn ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: '20px',
                        fontWeight: 600,
                        textAlign: 'center',
                        outline: 'none',
                      }}
                      placeholder="Enter bid..."
                    />
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '20px', fontWeight: 700 }}>k</span>
                  </div>

                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button
                      onClick={() => isAuctionPlayerTurn && placeBid(bidAmount)}
                      disabled={!isAuctionPlayerTurn}
                      style={{
                        width: '140px',
                        padding: '20px',
                        background: isAuctionPlayerTurn ? colors.accent.gold : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '12px',
                        color: isAuctionPlayerTurn ? '#000' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: '20px',
                        fontWeight: 800,
                        cursor: isAuctionPlayerTurn ? 'pointer' : 'not-allowed',
                        opacity: isAuctionPlayerTurn ? 1 : 0.5,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      BID
                    </button>
                    <button
                      onClick={() => isAuctionPlayerTurn && passBid()}
                      disabled={!isAuctionPlayerTurn}
                      style={{
                        width: '120px',
                        padding: '20px',
                        background: isAuctionPlayerTurn ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        color: isAuctionPlayerTurn ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: '20px',
                        fontWeight: 700,
                        cursor: isAuctionPlayerTurn ? 'pointer' : 'not-allowed',
                        opacity: isAuctionPlayerTurn ? 1 : 0.5,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      PASS
                    </button>
                  </div>
                </div>

                {!isAuctionPlayerTurn && (
                  <div
                    style={{
                      fontSize: '16px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textAlign: 'center',
                      marginTop: '16px',
                    }}
                  >
                    Waiting for {getCurrentAuctionPlayer(currentAuction, gameState!.players)?.name} to act...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Players status */}
          <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {currentAuction.type === 'one_offer' ? 'Bidding Progress' : 'All Players'}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {getOneOfferTurnOrder(currentAuction as any, gameState!.players).map((turn) => {
                const bidHistory = (currentAuction as any).bidHistory || {}
                const playerPassed = bidHistory[turn.player.id] === 0
                const playerActuallyBid = bidHistory[turn.player.id] > 0
                const isHighestBidder = (currentAuction as any).currentBidderId === turn.player.id

                return (
                  <div
                    key={turn.player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: turn.status === 'current'
                        ? 'rgba(251, 191, 36, 0.2)'
                        : isHighestBidder
                        ? 'rgba(76, 175, 80, 0.2)'
                        : turn.status === 'completed'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      border: turn.status === 'current'
                        ? '2px solid rgba(251, 191, 36, 0.4)'
                        : isHighestBidder
                        ? '2px solid rgba(76, 175, 80, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: turn.status === 'current'
                          ? colors.accent.gold
                          : isHighestBidder
                          ? '#4CAF50'
                          : turn.status === 'completed'
                          ? 'rgba(255, 255, 255, 0.5)'
                          : 'rgba(255, 255, 255, 0.2)',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          color: 'white',
                          fontWeight: turn.status === 'current' ? 700 : 500,
                        }}
                      >
                        {turn.player.name}
                        {turn.player.id === (currentAuction as any).auctioneerId && (
                          <span style={{ opacity: 0.7, fontSize: '12px' }}> (A)</span>
                        )}
                      </div>
                      {turn.status === 'completed' && playerPassed && (
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          PASSED
                        </div>
                      )}
                      {turn.status === 'completed' && playerActuallyBid && (
                        <div style={{ fontSize: '11px', color: isHighestBidder ? '#4CAF50' : 'rgba(255, 255, 255, 0.5)' }}>
                          BID {bidHistory[turn.player.id]}k
                        </div>
                      )}
                      {turn.status === 'current' && (
                        <div style={{ fontSize: '11px', color: colors.accent.gold, fontWeight: 600 }}>
                          YOUR TURN
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}