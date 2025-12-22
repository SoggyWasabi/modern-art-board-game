import React, { useState, useEffect } from 'react'
import { Card as GameCardComponent } from '../../Card'
import { useGameStore } from '../../../store/gameStore'
import type { Card, AuctionType, Player } from '../../../types'
import type { DoubleAuctionState } from '../../../types/auction'
import { colors } from '../../../design/premiumTokens'
import OneOfferAuction from './OneOfferAuction'
import OpenAuction from './OpenAuction'
import HiddenAuction from './HiddenAuction'
import FixedPriceAuction from './FixedPriceAuction'

interface DoubleAuctionWrapperProps {
  currentAuction: DoubleAuctionState
  isAuctionPlayerTurn: boolean
  currentPlayerInAuction: Player | null
  gameState: any
  selectedCard?: Card | null
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

const DoubleAuctionWrapper: React.FC<DoubleAuctionWrapperProps> = ({
  currentAuction,
  isAuctionPlayerTurn,
  currentPlayerInAuction,
  gameState,
  selectedCard,
  onClearSelectedCard,
}) => {
  const {
    offerSecondCardForDouble,
    declineSecondCardForDouble,
  } = useGameStore()

  const [bidAmount, setBidAmount] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const isOfferingPhase = currentAuction.phase === 'offering'
  const isBiddingPhase = currentAuction.phase === 'bidding'
  const underlyingAuctionType = currentAuction.auctionType === 'double' ? null : currentAuction.auctionType
  const auctionInfo = underlyingAuctionType ? AUCTION_TYPE_INFO[underlyingAuctionType] : AUCTION_TYPE_INFO.double

  // Get auctioneer info
  const originalAuctioneer = gameState?.players.find((p: any) => p.id === currentAuction.originalAuctioneerId)
  const currentAuctioneer = gameState?.players.find((p: any) => p.id === currentAuction.currentAuctioneerId)

  // Get current turn player for offering phase
  const getCurrentTurnPlayer = () => {
    if (currentAuction.currentTurnIndex >= currentAuction.turnOrder.length) return null
    const playerId = currentAuction.turnOrder[currentAuction.currentTurnIndex]
    return gameState?.players.find((p: any) => p.id === playerId)
  }

  const currentTurnPlayer = getCurrentTurnPlayer()

  // Check if we can show preview mode
  const canShowPreview = isOfferingPhase &&
    isAuctionPlayerTurn &&
    currentTurnPlayer?.name === 'You' &&
    !currentAuction.secondCard

  // Use props for preview state - if a selected card is passed in and we're in offering phase, show preview
  const previewCard = selectedCard
  const isPreviewMode = !!(selectedCard && canShowPreview)

  // Preview mode handlers
  const handleConfirmOffer = () => {
    if (previewCard) {
      offerSecondCardForDouble(previewCard.id)
      onClearSelectedCard?.()
    }
  }

  const handleCancelPreview = () => {
    onClearSelectedCard?.()
  }

  // Render both cards with preview support
  const renderCards = () => {
    const artistIndex = ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira']

    // Determine which card to show: preview card or actual second card
    const displayCard = isPreviewMode && previewCard ? previewCard : currentAuction.secondCard

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isPreviewMode && displayCard ? '0' : '8px',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          height: '180px',
        }}
      >
        {/* Double Card */}
        <div
          style={{
            transform: `scale(1.1) ${isPreviewMode && displayCard ? 'translateX(-20px) rotate(-5deg)' : ''}`,
            zIndex: isPreviewMode && displayCard ? 2 : 1,
            transition: 'all 0.3s ease',
          }}
        >
          <GameCardComponent
            card={{
              id: currentAuction.doubleCard.id,
              artist: currentAuction.doubleCard.artist,
              artistIndex: artistIndex.indexOf(currentAuction.doubleCard.artist),
              cardIndex: parseInt(currentAuction.doubleCard.id.split('_')[1]) || 0,
              auctionType: currentAuction.doubleCard.auctionType
            }}
            size="md"
          />
        </div>

        {/* Second Card with overlap effect */}
        {displayCard ? (
          <div
            style={{
              transform: `scale(1.1) ${isPreviewMode ? 'translateX(20px) rotate(5deg)' : ''}`,
              zIndex: 2,
              transition: 'all 0.3s ease',
              position: isPreviewMode ? 'absolute' : 'relative',
            }}
          >
            <GameCardComponent
              card={{
                id: displayCard.id,
                artist: displayCard.artist,
                artistIndex: artistIndex.indexOf(displayCard.artist),
                cardIndex: parseInt(displayCard.id.split('_')[1]) || 0,
                auctionType: displayCard.auctionType
              }}
              size="md"
              isHighlighted={isPreviewMode} // Golden glow for preview
            />
          </div>
        ) : (
          <div
            style={{
              width: '120px',
              height: '168px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: isPreviewMode ? '2px dashed rgba(251, 191, 36, 0.8)' : '2px dashed rgba(251, 191, 36, 0.4)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: '24px' }}>?</span>
            <span style={{
              fontSize: '11px',
              color: isPreviewMode ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center',
              padding: '0 8px'
            }}>
              {isPreviewMode ? 'Preview mode' : 'Waiting for second card'}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Render offering phase content
  const renderOfferingPhase = () => {
    const eligiblePlayers = currentAuction.turnOrder.map(id =>
      gameState?.players.find((p: any) => p.id === id)
    ).filter(Boolean)

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '6px',
          }}
        >
          Offering Turn Order
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {eligiblePlayers.map((player: any, index: number) => {
            const isCurrentTurn = player?.id === currentTurnPlayer?.id
            const hasPassed = index < currentAuction.currentTurnIndex

            return (
              <div
                key={player?.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
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
                        : hasPassed
                          ? 'rgba(239, 68, 68, 0.5)'
                          : 'rgba(255, 255, 255, 0.2)',
                      boxShadow: isCurrentTurn ? `0 0 8px ${colors.accent.gold}` : 'none',
                    }}
                  />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
                    {player?.name}
                    {player?.id === currentAuction.originalAuctioneerId && ' (Original)'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isCurrentTurn
                      ? colors.accent.gold
                      : hasPassed
                        ? 'rgba(239, 68, 68, 0.7)'
                        : 'rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {isCurrentTurn ? 'Deciding...' : hasPassed ? 'Passed' : 'Waiting'}
                </span>
              </div>
            )
          })}
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
            Players can offer a <strong style={{ color: colors.accent.gold }}>{currentAuction.doubleCard.artist}</strong> card
            to pair with the Double card. The second card determines the auction type.
          </div>
        </div>
      </div>
    )
  }

  // Render bidding phase content using component delegation
  const renderBiddingPhaseContent = () => {
    if (!currentAuction.secondCard || !currentAuction.embeddedAuction) {
      return null
    }

    const embedded = currentAuction.embeddedAuction
    const cards = [currentAuction.doubleCard, currentAuction.secondCard]

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

      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '950px',
        minHeight: '320px',
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: `2px solid rgba(251, 191, 36, 0.4)`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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
          background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))',
          borderBottom: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>👯</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: colors.accent.gold }}>
                Double
              </span>
              {(isPreviewMode && previewCard) || underlyingAuctionType ? (
                <>
                  <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.4)' }}>+</span>
                  <span style={{ fontSize: '16px' }}>
                    {isPreviewMode && previewCard
                      ? AUCTION_TYPE_INFO[previewCard.auctionType].icon
                      : auctionInfo.icon
                    }
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>
                    {isPreviewMode && previewCard
                      ? AUCTION_TYPE_INFO[previewCard.auctionType].shortName
                      : auctionInfo.shortName
                    }
                  </span>
                </>
              ) : null}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              {isPreviewMode && previewCard
                ? `Confirm offering ${previewCard.artist} ${AUCTION_TYPE_INFO[previewCard.auctionType].name}?`
                : isOfferingPhase
                  ? `Waiting for second ${currentAuction.doubleCard.artist} card`
                  : 'Both cards sell as a package deal'
              }
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isOfferingPhase ? 'Original Auctioneer' : 'Seller'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
            {isOfferingPhase ? originalAuctioneer?.name : currentAuctioneer?.name}
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
        {/* Cards Display */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {renderCards()}

          {/* Package Deal Badge */}
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
              Package Deal - 2 Cards!
            </span>
          </div>
        </div>

        {/* Phase-specific Content */}
        {isOfferingPhase ? renderOfferingPhase() : renderBiddingPhaseContent()}
      </div>

      {/* Offering Phase Action Bar - Bidding phase handled by delegated components */}
      {isOfferingPhase && isAuctionPlayerTurn && (
        <div
          style={{
            padding: '16px 24px',
            background: isPreviewMode
              ? 'linear-gradient(90deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.1))'
              : 'linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.1))',
            borderTop: isPreviewMode
              ? '2px solid rgba(76, 175, 80, 0.4)'
              : '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
              {isPreviewMode && previewCard
                ? `Offer ${previewCard.artist} ${AUCTION_TYPE_INFO[previewCard.auctionType].name}?`
                : "Pass on offering a second card"
              }
            </div>

            {/* Preview Mode Buttons */}
            {isPreviewMode ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCancelPreview}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOffer}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #45a049, #4CAF50)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  Confirm Offer
                </button>
              </div>
            ) : (
              /* Regular Offer Mode Button */
              <button
                onClick={declineSecondCardForDouble}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                }}
              >
                Pass
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DoubleAuctionWrapper