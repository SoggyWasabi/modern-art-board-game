import type { GameState, Player } from '../types/game'
import type { AuctionState, OneOfferAuctionState, FixedPriceAuctionState } from '../types/auction'

/**
 * Determines if it's the human player's turn to act in the current auction
 */
export function isHumanPlayerTurn(gameState: GameState): boolean {
  if (gameState.round.phase.type !== 'auction') {
    return false
  }

  const auction = gameState.round.phase.auction
  const humanPlayer = gameState.players[0] // Assuming player 0 is human

  switch (auction.type) {
    case 'one_offer':
      return isOneOfferPlayerTurn(auction as OneOfferAuctionState, humanPlayer.id)

    case 'fixed_price':
      return isFixedPricePlayerTurn(auction as FixedPriceAuctionState, humanPlayer.id)

    case 'open':
      // Open auctions are free-for-all - human can bid anytime
      return true

    case 'hidden': {
      const hiddenAuction = auction as any
      // Hidden auctions - human can submit bid if not already submitted
      return !hiddenAuction.bids?.[humanPlayer.id]
    }

    case 'double': {
      const doubleAuction = auction as any
      // Double auction - handle based on phase
      if (!doubleAuction.secondCard) {
        // Offering phase
        return doubleAuction.currentAuctioneerId === humanPlayer.id
      } else if (doubleAuction.embeddedAuction) {
        // Use the embedded auction for bidding phase
        return isHumanPlayerTurn({
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: doubleAuction.embeddedAuction
            }
          }
        })
      } else {
        // No embedded auction yet - can't determine turn
        return false
      }
    }

    default:
      return false
  }
}

/**
 * Check if it's a specific player's turn in a One Offer auction
 */
export function isOneOfferPlayerTurn(auction: OneOfferAuctionState, playerId: string): boolean {
  // In auctioneer decision phase, it's the auctioneer's turn
  if (auction.phase === 'auctioneer_decision') {
    return auction.auctioneerId === playerId
  }

  // Check if it's the bidding phase
  if (auction.phase !== 'bidding') {
    return false
  }

  // Check if turnOrder and currentTurnIndex exist
  if (!auction.turnOrder || auction.currentTurnIndex === undefined) {
    console.warn('One Offer auction missing turnOrder or currentTurnIndex')
    return false
  }

  // Check if it's this player's turn
  const currentPlayerId = auction.turnOrder[auction.currentTurnIndex]
  return currentPlayerId === playerId
}

/**
 * Check if it's a specific player's turn in a Fixed Price auction
 */
export function isFixedPricePlayerTurn(auction: FixedPriceAuctionState, playerId: string): boolean {
  // Check if auction is active and player hasn't acted
  if (!auction.isActive || auction.passedPlayers.has(playerId) || auction.sold) {
    return false
  }

  // Check if it's this player's turn
  const currentPlayerId = auction.turnOrder[auction.currentTurnIndex]
  return currentPlayerId === playerId
}

/**
 * Get current player whose turn it is in the auction
 */
export function getCurrentAuctionPlayer(auction: AuctionState, players: Player[]): Player | null {
  switch (auction.type) {
    case 'one_offer':
      if (auction.phase === 'bidding') {
        const currentPlayerId = auction.turnOrder[auction.currentTurnIndex]
        return players.find(p => p.id === currentPlayerId) || null
      }
      // In auctioneer decision phase, it's the auctioneer
      if (auction.phase === 'auctioneer_decision') {
        return players.find(p => p.id === auction.auctioneerId) || null
      }
      return null

    case 'fixed_price':
      const currentPlayerId = auction.turnOrder[auction.currentTurnIndex]
      return players.find(p => p.id === currentPlayerId) || null

    case 'double': {
      const doubleAuction = auction as any
      if (!doubleAuction.secondCard) {
        // Offering phase
        const currentPlayerId = doubleAuction.currentAuctioneerId
        return players.find(p => p.id === currentPlayerId) || null
      }
      // Use second card's auction type logic
      return null
    }

    default:
      return null // Open, Hidden auctions don't have turn order
  }
}

/**
 * Get the turn order display for One Offer auctions
 */
export function getOneOfferTurnOrder(auction: OneOfferAuctionState, players: Player[]): Array<{
  player: Player
  isCurrentTurn: boolean
  hasActed: boolean
  status: 'waiting' | 'current' | 'completed'
}> {
  // Check if turnOrder exists, if not, create it from player order
  const turnOrder = auction.turnOrder || players.map(p => p.id)

  return turnOrder.map(playerId => {
    const player = players.find(p => p.id === playerId)
    if (!player) return null

    const currentTurnIndex = auction.currentTurnIndex ?? 0
    const isCurrentTurn = turnOrder[currentTurnIndex] === playerId
    const hasActed = auction.completedTurns?.has(playerId) || false

    return {
      player,
      isCurrentTurn,
      hasActed,
      status: isCurrentTurn ? 'current' : hasActed ? 'completed' : 'waiting' as 'waiting' | 'current' | 'completed'
    }
  }).filter((item): item is NonNullable<typeof item> => Boolean(item))
}

/**
 * Check if a One Offer auction is ready for auctioneer decision phase
 */
export function shouldMoveToAuctioneerDecision(auction: OneOfferAuctionState): boolean {
  return auction.phase === 'bidding' &&
         auction.completedTurns.size === auction.turnOrder.length - 1 // All non-auctioneer players have acted
}

/**
 * Check if an auction is complete and needs resolution
 */
export function shouldConcludeAuction(auction: AuctionState): boolean {
  switch (auction.type) {
    case 'one_offer':
      return auction.phase === 'auctioneer_decision'

    case 'fixed_price':
      return !auction.isActive

    case 'hidden':
      return auction.revealedBids

    case 'open':
      // Open auctions end when everyone passes or when auctioneer decides to end
      return auction.passCount >= auction.playerOrder.length - 1

    case 'double':
      // Double auctions are complete when the sub-auction is complete
      if (auction.secondCard && auction.auctionType !== 'double') {
        // Check sub-auction completion
        // This would need recursive checking
      }
      return false

    default:
      return false
  }
}