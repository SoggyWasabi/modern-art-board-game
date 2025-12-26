import React, { useState, useEffect } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { BidHistoryItem } from '../../../types/auction'
import type { OpenAuctionProps } from '../../../types/auctionComponents'
import { normalizeCardsForAuction, getAuctionHeaderText } from '../../../types/auctionComponents'
import { colors } from '../../../design/premiumTokens'

const OpenAuction: React.FC<OpenAuctionProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  cards,
  isDoubleAuction = false,
  doubleAuctionType,
}) => {
  const { placeBid, checkOpenAuctionTimer } = useGameStore()
  const [bidAmount, setBidAmount] = useState<number>(currentAuction.currentBid + 1)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Use helper to normalize cards for display
  const displayCards = normalizeCardsForAuction({ currentAuction, cards, isDoubleAuction, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const headerText = getAuctionHeaderText({ currentAuction, cards, isDoubleAuction, doubleAuctionType, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const currentTime = Date.now()

  // Calculate time left on timer
  useEffect(() => {
    if (!currentAuction.timerEndTime || !currentAuction.isActive) {
      setTimeLeft(0)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, currentAuction.timerEndTime! - Date.now())
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100) // Update every 100ms for smooth countdown

    return () => clearInterval(interval)
  }, [currentAuction.timerEndTime, currentAuction.isActive])

  // Update bid amount when current bid changes
  useEffect(() => {
    setBidAmount(currentAuction.currentBid + 1)
  }, [currentAuction.currentBid])

  // Set up timer expiration checking for open auctions
  useEffect(() => {
    if (currentAuction.isActive && currentAuction.timerEndTime) {
      const timerInterval = setInterval(() => {
        checkOpenAuctionTimer()
      }, 100) // Check every 100ms

      return () => clearInterval(timerInterval)
    }
  }, [currentAuction.isActive, currentAuction.timerEndTime, checkOpenAuctionTimer])

  const handleQuickBid = (amount: number) => {
    const newAmount = currentAuction.currentBid + amount
    setBidAmount(newAmount)
    placeBid(newAmount)
  }

  const handleBid = () => {
    if (bidAmount > currentAuction.currentBid) {
      placeBid(bidAmount)
    }
  }

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return seconds.toString()
  }

  // Get recent bids (last 5 for display)
  const recentBids = currentAuction.bidHistory.slice(-5).reverse()

  // Get bidding players (excluding human player "You")
  const biddingPlayers = gameState?.players.filter((p: any) => p.name !== 'You') || []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: isDoubleAuction ? '1210px' : '1100px',
        maxHeight: isDoubleAuction ? '500px' : undefined,
        minHeight: isDoubleAuction ? undefined : '470px',
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: `1px solid rgba(251, 191, 36, 0.3)`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header with Timer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isDoubleAuction ? '10px 20px' : '16px 24px',
          background: isDoubleAuction ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))' : 'rgba(0, 0, 0, 0.4)',
          borderBottom: `1px solid ${isDoubleAuction ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px' }}>{isDoubleAuction ? '👯' : '🔊'}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {headerText.title}
            </div>
            <div style={{ fontSize: '13px', color: isDoubleAuction ? colors.accent.gold : 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              {isDoubleAuction ? 'Package deal - timer resets on each bid' : 'Real-time bidding - timer resets on each bid'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {currentAuction.timerEndTime ? 'Time Left' : 'Waiting for first bid'}
          </div>
          {currentAuction.timerEndTime ? (
            <div style={{
              fontSize: '32px',
              fontWeight: 800,
              color: timeLeft <= 3000 ? '#ef4444' : colors.accent.gold,
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.3s ease'
            }}>
              {formatTime(timeLeft)}s
            </div>
          ) : (
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>
              —
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Bid
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: colors.accent.gold }}>
            ${currentAuction.currentBid}k
          </div>
          {currentAuction.currentBidderId && (
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              {gameState?.players.find((p: any) => p.id === currentAuction.currentBidderId)?.name}
            </div>
          )}
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
                    transform: `scale(${displayCards.length > 1 ? '1.0' : '1.25'})`,
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
                      +🔊
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
        </div>

        {/* Bid Stream */}
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
            Bid Activity
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {recentBids.length === 0 ? (
              <div style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.3)',
                textAlign: 'center',
                padding: '40px 0',
                fontStyle: 'italic'
              }}>
                Waiting for first bid...
              </div>
            ) : (
              recentBids.map((bid: BidHistoryItem, index: number) => {
                const player = gameState?.players.find((p: any) => p.id === bid.playerId)
                const isLatest = index === 0

                return (
                  <div
                    key={`${bid.playerId}-${bid.timestamp}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isLatest
                        ? 'rgba(251, 191, 36, 0.15)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isLatest
                        ? `1px solid rgba(251, 191, 36, 0.3)`
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      opacity: 1 - (index * 0.15), // Fade older bids
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: colors.accent.gold,
                        }}
                      />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'white'
                      }}>
                        {player?.name || 'Unknown'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: colors.accent.gold
                    }}>
                      ${bid.amount}k
                    </span>
                  </div>
                )
              })
            )}
          </div>
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
            Players
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {biddingPlayers.map((player: any) => {
              const isHighestBidder = currentAuction.currentBidderId === player.id
              const recentBid = recentBids.find(bid => bid.playerId === player.id)

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: isHighestBidder
                      ? 'rgba(251, 191, 36, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isHighestBidder
                      ? `1px solid rgba(251, 191, 36, 0.4)`
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isHighestBidder
                          ? colors.accent.gold
                          : recentBid
                            ? '#4CAF50'
                            : 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isHighestBidder ? `0 0 8px ${colors.accent.gold}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                      {player.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isHighestBidder
                        ? colors.accent.gold
                        : recentBid
                          ? 'rgba(76, 175, 80, 0.8)'
                          : 'rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    {isHighestBidder ? `$${currentAuction.currentBid}k` : recentBid ? 'Bidded' : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action Bar - Always visible for real-time bidding */}
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderTop: '1px solid rgba(251, 191, 36, 0.2)',
        }}
      >
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
              onChange={(e) => setBidAmount(Math.max(currentAuction.currentBid + 1, parseInt(e.target.value) || 0))}
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
              min={currentAuction.currentBid + 1}
              max={gameState?.players[0]?.money || 0}
            />
            <span style={{ padding: '0 10px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>k</span>
          </div>

          <button
            onClick={() => handleQuickBid(1)}
            style={{
              padding: '12px 16px',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              color: colors.accent.gold,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            +1k
          </button>

          <button
            onClick={() => handleQuickBid(5)}
            style={{
              padding: '12px 16px',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              color: colors.accent.gold,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            +5k
          </button>

          <button
            onClick={handleBid}
            disabled={bidAmount <= currentAuction.currentBid}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: bidAmount > currentAuction.currentBid ? colors.accent.gold : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              borderRadius: '10px',
              color: bidAmount > currentAuction.currentBid ? '#000' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
              fontWeight: 700,
              cursor: bidAmount > currentAuction.currentBid ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            {isDoubleAuction ? 'Bid for Package' : 'Place Bid'}
          </button>

          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', minWidth: '120px' }}>
            Min: ${currentAuction.currentBid + 1}k
          </div>
        </div>
      </div>
    </div>
  )
}

export default OpenAuction