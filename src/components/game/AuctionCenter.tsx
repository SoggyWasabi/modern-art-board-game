import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { isHumanPlayerTurn, getCurrentAuctionPlayer, getOneOfferTurnOrder } from '../../utils/auctionTurnDetection'
import type { Card } from '../../types'
import type { AuctionState } from '../../types/auction'
import NullState from './auction/NullState'
import SelectedCardState from './auction/SelectedCardState'
import ActiveAuction from './auction/ActiveAuction'

interface AuctionCenterProps {
  selectedCard: Card | null
  isPlayerTurn: boolean
  onPlayCard: () => void
  onPass: () => void
}

const AuctionCenter: React.FC<AuctionCenterProps> = ({
  selectedCard,
  isPlayerTurn,
  onPlayCard,
  onPass,
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
      />
    )
  }

  return null
}

export default AuctionCenter