import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { isHumanPlayerTurn, getCurrentAuctionPlayer, getOneOfferTurnOrder } from '../../utils/auctionTurnDetection'
import type { Card } from '../../types'
import type { AuctionState } from '../../types/auction'
import NullState from './auction/NullState'
import SelectedCardState from './auction/SelectedCardState'
import ActiveAuction from './auction/ActiveAuction'
import FifthCardCeremony from './auction/FifthCardCeremony'
import ArtistValuationAnimation from './animations/ArtistValuationAnimation'

interface PurchasedCardPosition {
  card: Card
  playerId: string
  position: { x: number; y: number } | null
}

interface AuctionCenterProps {
  selectedCard: Card | null
  selectedDoubleCard?: Card | null  // Card selected for double auction preview
  isPlayerTurn: boolean
  onPlayCard: () => void
  onPass: () => void
  onClearSelectedDoubleCard?: () => void
  purchasedCardsPositions?: PurchasedCardPosition[]
  showArtistValuation?: boolean
}

const AuctionCenter: React.FC<AuctionCenterProps> = ({
  selectedCard,
  selectedDoubleCard,
  isPlayerTurn,
  onPlayCard,
  onPass,
  onClearSelectedDoubleCard,
  purchasedCardsPositions = [],
  showArtistValuation = false,
}) => {
  const { gameState, placeBid, passBid } = useGameStore()

  const currentAuction = gameState?.round.phase.type === 'auction'
    ? (gameState.round.phase as { type: 'auction'; auction: AuctionState }).auction
    : null

  // Check if it's the human player's turn in the current auction
  const isAuctionPlayerTurn = gameState ? isHumanPlayerTurn(gameState) : false
  const currentPlayerInAuction = currentAuction && gameState
    ? getCurrentAuctionPlayer(currentAuction, gameState.players)
    : null

  // Render 5th card ceremony when round is ending
  if (gameState?.round.phase.type === 'round_ending') {
    const discardedCard = gameState.round.phase.unsoldCards?.[0]
    if (discardedCard) {
      return <FifthCardCeremony card={discardedCard} />
    }
  }

  // Render artist valuation during selling_to_bank phase (with flying cards and earnings)
  if (showArtistValuation) {
    return <ArtistValuationAnimation show={true} purchasedCardsPositions={purchasedCardsPositions} />
  }

  // Render null state (no card selected, no active auction)
  if (!currentAuction && !selectedCard) {
    return <NullState isPlayerTurn={isPlayerTurn} />
  }

  // Render selected card state (card selected but not yet played)
  if (!currentAuction && selectedCard) {
    return (
      <SelectedCardState
        selectedCard={selectedCard}
        isPlayerTurn={isPlayerTurn}
        onPlayCard={onPlayCard}
        onPass={onPass}
      />
    )
  }

  // Render active auction
  if (currentAuction) {
    return (
      <ActiveAuction
        currentAuction={currentAuction}
        isAuctionPlayerTurn={isAuctionPlayerTurn}
        currentPlayerInAuction={currentPlayerInAuction}
        gameState={gameState}
        selectedCard={selectedDoubleCard}
        onClearSelectedCard={onClearSelectedDoubleCard}
      />
    )
  }

  return null
}

export default AuctionCenter