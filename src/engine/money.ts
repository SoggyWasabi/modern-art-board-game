import type { Player, GameState } from '../types/game'
import type { AuctionResult } from '../types/auction'

/**
 * Money Management Engine
 *
 * Handles:
 * - Money transactions between players
 * - Bank transactions
 * - Auction payments and profits
 * - Money validation
 */

/**
 * Transfer money from one player to another
 */
export function transferMoney(
  fromPlayerId: string,
  toPlayerId: string,
  amount: number,
  players: Player[]
): Player[] {
  if (amount < 0) {
    throw new Error('Transfer amount must be positive')
  }

  return players.map(player => {
    if (player.id === fromPlayerId) {
      if (player.money < amount) {
        throw new Error(`Player ${player.name} doesn't have enough money (${player.money} < ${amount})`)
      }
      return { ...player, money: player.money - amount }
    }
    if (player.id === toPlayerId) {
      return { ...player, money: player.money + amount }
    }
    return player
  })
}

/**
 * Pay money from player to bank
 */
export function payToBank(
  playerId: string,
  amount: number,
  players: Player[]
): Player[] {
  if (amount < 0) {
    throw new Error('Payment amount must be positive')
  }

  return players.map(player => {
    if (player.id === playerId) {
      if (player.money < amount) {
        throw new Error(`Player ${player.name} doesn't have enough money to pay bank (${player.money} < ${amount})`)
      }
      return { ...player, money: player.money - amount }
    }
    return player
  })
}

/**
 * Receive money from bank
 */
export function receiveFromBank(
  playerId: string,
  amount: number,
  players: Player[]
): Player[] {
  if (amount < 0) {
    throw new Error('Received amount must be positive')
  }

  return players.map(player => {
    if (player.id === playerId) {
      return { ...player, money: player.money + amount }
    }
    return player
  })
}

/**
 * Process an auction result (update money for all parties)
 */
export function processAuctionPayment(
  gameState: GameState,
  result: AuctionResult
): GameState {
  const { winnerId, salePrice, profit, auctioneerId } = result
  let newPlayers = [...gameState.players]

  // Winner pays for the painting
  newPlayers = payToBank(winnerId, salePrice, newPlayers)

  // Auctioneer receives the profit (difference between sale price and what they might have paid)
  if (profit > 0 && auctioneerId !== winnerId) {
    // If auctioneer sold to someone else, they get the money
    const auctioneerIndex = newPlayers.findIndex(p => p.id === auctioneerId)
    if (auctioneerIndex !== -1) {
      newPlayers[auctioneerIndex] = {
        ...newPlayers[auctioneerIndex],
        money: newPlayers[auctioneerIndex].money + salePrice
      }
    }
  }

  return {
    ...gameState,
    players: newPlayers
  }
}

/**
 * Process a bank purchase (selling phase)
 */
export function processBankSale(
  gameState: GameState,
  playerId: string,
  salePrice: number
): GameState {
  const newPlayers = receiveFromBank(playerId, salePrice, gameState.players)

  return {
    ...gameState,
    players: newPlayers
  }
}

/**
 * Check if a player can afford a bid
 */
export function canAfford(player: Player, amount: number): boolean {
  return player.money >= amount
}

/**
 * Get the maximum bid a player can make
 */
export function getMaxBid(player: Player): number {
  return player.money
}

/**
 * Get player's current money
 */
export function getPlayerMoney(gameState: GameState, playerId: string): number {
  const player = gameState.players.find(p => p.id === playerId)
  return player ? player.money : 0
}

/**
 * Get all players sorted by money (descending)
 */
export function getPlayersByMoney(gameState: GameState): Player[] {
  return [...gameState.players].sort((a, b) => b.money - a.money)
}

/**
 * Check if any player is bankrupt (money <= 0)
 */
export function hasBankruptPlayer(gameState: GameState): boolean {
  return gameState.players.some(player => player.money <= 0)
}

/**
 * Get players with insufficient money for a given amount
 */
export function getPlayersWhoCannotAfford(gameState: GameState, amount: number): Player[] {
  return gameState.players.filter(player => player.money < amount)
}

/**
 * Calculate total money in circulation
 */
export function getTotalMoney(gameState: GameState): number {
  return gameState.players.reduce((total, player) => total + player.money, 0)
}

/**
 * Get money statistics
 */
export function getMoneyStats(gameState: GameState) {
  const moneyValues = gameState.players.map(p => p.money)
  const total = getTotalMoney(gameState)
  const average = total / gameState.players.length
  const min = Math.min(...moneyValues)
  const max = Math.max(...moneyValues)

  return {
    total,
    average,
    min,
    max,
    distribution: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      money: p.money,
      percentage: (p.money / total) * 100
    }))
  }
}