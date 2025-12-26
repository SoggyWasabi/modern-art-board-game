import React, { useState, useEffect } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { FixedPriceAuctionProps } from '../../../types/auctionComponents'
import { normalizeCardsForAuction, getAuctionHeaderText } from '../../../types/auctionComponents'
import { colors } from '../../../design/premiumTokens'

const FixedPriceAuction: React.FC<FixedPriceAuctionProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  cards,
  isDoubleAuction = false,
  doubleAuctionType,
}) => {
  const { setFixedPrice, buyAtFixedPrice, passFixedPrice } = useGameStore()

  // Use helper to normalize cards for display
  const displayCards = normalizeCardsForAuction({ currentAuction, cards, isDoubleAuction, isAuctionPlayerTurn, currentPlayerInAuction, gameState })
  const headerText = getAuctionHeaderText({ currentAuction, cards, isDoubleAuction, doubleAuctionType, isAuctionPlayerTurn, currentPlayerInAuction, gameState })

  // Check if it's the price-setting phase (auctioneer's turn) or buying phase
  const isPriceSettingPhase = currentAuction.phase === 'price_setting' && !currentAuction.sold
  const isAuctioneer = gameState?.players[0]?.id === currentAuction.auctioneerId // Assuming player 0 is human

  // Get current player whose turn it is to buy/pass
  const getCurrentTurnPlayer = () => {
    if (currentAuction.sold || !currentAuction.isActive) return null
    if (currentAuction.currentTurnIndex >= currentAuction.turnOrder.length) return null
    const currentPlayerId = currentAuction.turnOrder[currentAuction.currentTurnIndex]
    return gameState?.players.find((p: any) => p.id === currentPlayerId)
  }

  const currentTurnPlayer = getCurrentTurnPlayer()

  // Filter players to show only those in the turn order (exclude auctioneer)
  const eligiblePlayers = gameState?.players.filter((p: any) =>
    p.id !== currentAuction.auctioneerId && currentAuction.turnOrder.includes(p.id)
  ) || []

  // Handle auctioneer setting the price
  const handleSetPrice = (price: number) => {
    // Validate price
    const auctioneer = gameState?.players.find((p: any) => p.id === currentAuction.auctioneerId)
    if (auctioneer && price > 0 && price <= auctioneer.money) {
      setFixedPrice(price)
    }
  }

  // Handle player buying at fixed price
  const handleBuy = () => {
    buyAtFixedPrice()
  }

  // Handle player passing
  const handlePass = () => {
    passFixedPrice()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '900px',
        minHeight: '470px',
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
          <span style={{ fontSize: '24px' }}>{isDoubleAuction ? '👯' : '🏷️'}</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {headerText.title}
            </div>
            <div style={{ fontSize: '13px', color: isDoubleAuction ? colors.accent.gold : 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              {isDoubleAuction && headerText.subtitle && !isPriceSettingPhase ? (
                headerText.subtitle
              ) : isPriceSettingPhase
                ? 'Auctioneer sets the price'
                : currentAuction.sold
                  ? 'Auction concluded'
                  : 'First to accept wins'
              }
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isPriceSettingPhase ? 'Setting Price' : currentAuction.sold ? 'Final Price' : 'Fixed Price'}
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 800,
            color: currentAuction.price > 0 ? colors.accent.gold : 'rgba(255, 255, 255, 0.4)',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.3s ease'
          }}>
            {currentAuction.price > 0 ? `$${currentAuction.price}k` : '—'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: currentAuction.sold ? '#4CAF50' : colors.accent.gold }}>
            {currentAuction.sold
              ? `${gameState?.players.find((p: any) => p.id === currentAuction.winnerId)?.name} won`
              : isPriceSettingPhase
                ? 'Awaiting price'
                : 'Available'
            }
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
                    transform: `scale(${displayCards.length > 1 ? '1.1' : '1.25'})`,
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
                      +🏷️
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
            {isPriceSettingPhase ? 'Auctioneer' : 'Buying Order (Clockwise)'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Show auctioneer first if setting price */}
            {isPriceSettingPhase && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: `1px solid rgba(251, 191, 36, 0.4)`,
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
                      background: colors.accent.gold,
                      boxShadow: `0 0 8px ${colors.accent.gold}`,
                    }}
                  />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                    {gameState?.players.find((p: any) => p.id === currentAuction.auctioneerId)?.name} (Auctioneer)
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: colors.accent.gold }}>
                  Setting Price
                </span>
              </div>
            )}

            {/* Show eligible players in turn order */}
            {!isPriceSettingPhase && eligiblePlayers.map((player: any, index: number) => {
              const hasPassed = currentAuction.passedPlayers.has(player.id)
              const isCurrentTurn = player.id === currentTurnPlayer?.id
              const isWinner = currentAuction.winnerId === player.id

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isWinner
                      ? 'rgba(76, 175, 80, 0.12)'
                      : isCurrentTurn
                        ? 'rgba(251, 191, 36, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)',
                    border: isWinner
                      ? `1px solid rgba(76, 175, 80, 0.4)`
                      : isCurrentTurn
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
                        background: isWinner
                          ? '#4CAF50'
                          : isCurrentTurn
                            ? colors.accent.gold
                            : hasPassed
                              ? 'rgba(239, 68, 68, 0.5)'
                              : 'rgba(255, 255, 255, 0.2)',
                        boxShadow: isCurrentTurn && !isWinner ? `0 0 8px ${colors.accent.gold}` : 'none',
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
                      color: isWinner
                        ? '#4CAF50'
                        : hasPassed
                          ? 'rgba(239, 68, 68, 0.7)'
                          : isCurrentTurn
                            ? colors.accent.gold
                            : 'rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    {isWinner ? 'Won!' : hasPassed ? 'Passed' : isCurrentTurn ? 'Deciding...' : 'Waiting'}
                  </span>
                </div>
              )
            })}

            {/* Show auctioneer forced to buy */}
            {!isPriceSettingPhase && currentAuction.currentTurnIndex >= currentAuction.turnOrder.length && !currentAuction.sold && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid rgba(239, 68, 68, 0.4)`,
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
                      background: '#ef4444',
                      boxShadow: `0 0 8px #ef4444`,
                    }}
                  />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                    {gameState?.players.find((p: any) => p.id === currentAuction.auctioneerId)?.name} (Auctioneer)
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
                  Must Buy $({currentAuction.price}k)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {(isPriceSettingPhase && isAuctioneer) || (!isPriceSettingPhase && currentTurnPlayer?.id === gameState?.players[0]?.id) ? (
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderTop: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          {isPriceSettingPhase ? (
            // Price setting interface for auctioneer
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', minWidth: '120px' }}>
                Set Your Price:
              </div>
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
                  defaultValue={10}
                  min={1}
                  max={gameState?.players[0]?.money || 0}
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
                  id="fixed-price-input"
                />
                <span style={{ padding: '0 10px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>k</span>
              </div>

              <button
                onClick={() => {
                  const input = document.getElementById('fixed-price-input') as HTMLInputElement
                  const price = parseInt(input?.value || '0')
                  handleSetPrice(price)
                }}
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
                Set Price
              </button>

              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Max: ${gameState?.players[0]?.money || 0}k
              </div>
            </div>
          ) : (
            // Buy/Pass interface for current player
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleBuy}
                disabled={(currentTurnPlayer?.money || 0) < currentAuction.price}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: (currentTurnPlayer?.money || 0) >= currentAuction.price
                    ? colors.accent.gold
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid rgba(251, 191, 36, 0.5)`,
                  borderRadius: '10px',
                  color: (currentTurnPlayer?.money || 0) >= currentAuction.price ? '#000' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: (currentTurnPlayer?.money || 0) >= currentAuction.price ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                {isDoubleAuction ? 'Buy Package' : `Buy for ${currentAuction.price}k`}
              </button>

              <button
                onClick={handlePass}
                style={{
                  flex: 1,
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
      ) : null}
    </div>
  )
}

export default FixedPriceAuction