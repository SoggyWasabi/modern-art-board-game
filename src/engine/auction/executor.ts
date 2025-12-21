import type { GameState, Card } from '../../types/game'
import type { AuctionResult } from '../../types/auction'
import type { Player } from '../../types/game'
import { transferMoney, payToBank } from '../money'

/**
 * Auction Execution Engine
 *
 * Handles:
 * - Running auctions and processing results
 * - Proper money transfers between players
 * - Updating game state with auction outcomes
 * - Moving paintings to winner's collection
 */

/**
 * Execute an auction result with proper money transfers
 */
export function executeAuction(
  gameState: GameState,
  auctionResult: AuctionResult,
  auctionCard: Card,
  secondCard?: Card  // Optional second card for Double auctions
): GameState {
  const { winnerId, salePrice, auctioneerId } = auctionResult

  // Clone the game state
  let newState = { ...gameState }
  let newPlayers = [...gameState.players]

  // Handle money transfers
  if (winnerId === auctioneerId && winnerId !== null) {
    // Auctioneer wins their own auction - pays to bank
    newPlayers = payToBank(winnerId, salePrice, newPlayers)
  } else if (winnerId !== null && salePrice > 0) {
    // Player-to-player transfer
    newPlayers = transferMoney(winnerId, auctioneerId, salePrice, newPlayers)
  }

  // Move the painting(s) to winner's current round purchases (if there's a winner)
  if (winnerId !== null) {
    newPlayers = newPlayers.map(player => {
      if (player.id === winnerId) {
        const cardsToAdd = secondCard
          ? [auctionCard, secondCard]  // Double auction - both cards
          : [auctionCard]             // Regular auction - single card

        return {
          ...player,
          purchasedThisRound: [
            ...(player.purchasedThisRound || []),
            ...cardsToAdd
          ]
        }
      }
      return player
    })
  }

  // Add auction event to event log
  const winnerIndex = newPlayers.findIndex(p => p.id === winnerId)
  const cards = secondCard ? [auctionCard, secondCard] : [auctionCard]
  const auctionEvent = {
    type: 'auction_won' as const,
    winnerIndex,
    amount: salePrice,
    cards
  }

  return {
    ...newState,
    players: newPlayers,
    eventLog: [...newState.eventLog, auctionEvent]
  }
}

/**
 * Get auction summary for UI display
 */
export function getAuctionSummary(
  auctionResult: AuctionResult,
  players: Player[]
): {
  winner: Player
  auctioneer: Player
  salePrice: number
  profit: number
  isAuctioneerWin: boolean
} {
  const winner = players.find(p => p.id === auctionResult.winnerId)
  const auctioneer = players.find(p => p.id === auctionResult.auctioneerId)

  if (!winner || !auctioneer) {
    throw new Error('Winner or auctioneer not found')
  }

  return {
    winner,
    auctioneer,
    salePrice: auctionResult.salePrice,
    profit: auctionResult.profit,
    isAuctioneerWin: winner.id === auctioneer.id
  }
}

/**
 * Validate auction result before execution
 */
export function validateAuctionResult(
  result: AuctionResult,
  players: Player[]
): { isValid: boolean; error?: string } {
  // Check if winner exists
  const winner = players.find(p => p.id === result.winnerId)
  if (!winner) {
    return { isValid: false, error: 'Winner not found' }
  }

  // Check if auctioneer exists
  const auctioneer = players.find(p => p.id === result.auctioneerId)
  if (!auctioneer) {
    return { isValid: false, error: 'Auctioneer not found' }
  }

  // Check if winner can afford the purchase
  if (result.winnerId !== result.auctioneerId && result.salePrice > 0) {
    if (winner.money < result.salePrice) {
      return {
        isValid: false,
        error: `Winner ${winner.name} cannot afford ${result.salePrice} (has ${winner.money})`
      }
    }
  }

  // Check if sale price is non-negative
  if (result.salePrice < 0) {
    return { isValid: false, error: 'Sale price cannot be negative' }
  }

  return { isValid: true }
}

/**
 * Simulate auction execution without actually changing state
 */
export function simulateAuction(
  gameState: GameState,
  auctionResult: AuctionResult
): {
  newMoneyDistribution: Record<string, number>
  moneyChanges: Record<string, { from: number; to: number; change: number }>
  totalTransferred: number
} {
  const { winnerId, auctioneerId, salePrice } = auctionResult
  const moneyChanges: Record<string, { from: number; to: number; change: number }> = {}
  const newMoneyDistribution: Record<string, number> = {}

  // Calculate money changes
  gameState.players.forEach(player => {
    const oldMoney = player.money
    let newMoney = oldMoney
    let change = 0

    if (player.id === winnerId && player.id !== auctioneerId) {
      // Winner pays
      newMoney = oldMoney - salePrice
      change = -salePrice
    } else if (player.id === auctioneerId && player.id !== winnerId) {
      // Auctioneer receives
      newMoney = oldMoney + salePrice
      change = salePrice
    } else if (player.id === winnerId && player.id === auctioneerId) {
      // Auctioneer wins own auction - pays bank
      newMoney = oldMoney - salePrice
      change = -salePrice
    }

    moneyChanges[player.id] = {
      from: oldMoney,
      to: newMoney,
      change
    }
    newMoneyDistribution[player.id] = newMoney
  })

  const totalTransferred = salePrice > 0 && winnerId !== auctioneerId ? salePrice : 0

  return {
    newMoneyDistribution,
    moneyChanges,
    totalTransferred
  }
}