import type { GameState, Player, Card } from '../../types/game'
import type { AuctionState, AuctionResult } from '../../types/auction'
import { executeAuction } from '../../engine/auction/executor'

export class GameService {
  /**
   * Validate if a player can play a card
   */
  static canPlayCard(gameState: GameState, playerId: string): boolean {
    if (gameState.round.phase.type !== 'awaiting_card_play') {
      return false
    }

    const currentPlayer = gameState.players[gameState.round.phase.activePlayerIndex]
    return currentPlayer?.id === playerId
  }

  /**
   * Validate if a player can place a bid
   */
  static canPlaceBid(gameState: GameState, playerId: string, amount: number): {
    canBid: boolean
    reason?: string
  } {
    if (gameState.round.phase.type !== 'auction') {
      return { canBid: false, reason: 'Not in auction phase' }
    }

    const auction = gameState.round.phase.auction
    const player = gameState.players.find(p => p.id === playerId)

    if (!player) {
      return { canBid: false, reason: 'Player not found' }
    }

    // Check specific auction type rules
    switch (auction.type) {
      case 'one_offer':
        const oneOffer = auction as any
        if (oneOffer.phase === 'auctioneer_decision' && oneOffer.auctioneerId !== playerId) {
          return { canBid: false, reason: 'Only auctioneer can act in decision phase' }
        }
        if (oneOffer.phase === 'bidding' && oneOffer.turnOrder[oneOffer.currentTurnIndex] !== playerId) {
          return { canBid: false, reason: 'Not your turn to bid' }
        }
        break
      case 'hidden':
        const hidden = auction as any
        if (hidden.bids[playerId]) {
          return { canBid: false, reason: 'Already submitted bid' }
        }
        break
    }

    // Check if player has enough money
    if (amount > player.money) {
      return { canBid: false, reason: `Insufficient funds (have ${player.money}, need ${amount})` }
    }

    return { canBid: true }
  }

  /**
   * Execute auction result and update game state
   */
  static executeAuctionResult(
    gameState: GameState,
    auctionResult: AuctionResult,
    auctionCard: Card
  ): GameState {
    return executeAuction(gameState, auctionResult, auctionCard)
  }

  /**
   * Get next player in turn order
   */
  static getNextPlayer(gameState: GameState): Player | null {
    const currentIndex = gameState.round.phase.type === 'awaiting_card_play'
      ? gameState.round.phase.activePlayerIndex
      : -1

    if (currentIndex === -1) return null

    const nextIndex = (currentIndex + 1) % gameState.players.length
    return gameState.players[nextIndex]
  }

  /**
   * Check if round should end
   */
  static shouldEndRound(gameState: GameState): boolean {
    // Round ends when all players have no cards left
    return gameState.players.every(player => player.hand.length === 0)
  }

  /**
   * Check if game should end
   */
  static shouldEndGame(gameState: GameState): boolean {
    // Game ends after 4 rounds
    return gameState.round.roundNumber >= 4
  }
}