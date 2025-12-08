import type {
  GameState,
  Painting
} from '../types/game'
import { calculatePaintingValue } from './valuation'
import { processBankSale } from './money'

/**
 * Selling Phase Engine
 *
 * Handles:
 * - Bank selling of paintings
 * - Painting value calculation
 * - Money transactions for sold paintings
 * - Discarding sold paintings
 */

/**
 * Sell all paintings for a player to the bank
 */
export function sellPlayerPaintingsToBank(
  gameState: GameState,
  playerId: string
): GameState {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player || !player.purchases || player.purchases.length === 0) {
    return gameState
  }

  let totalSaleValue = 0
  const soldPaintings: Painting[] = []

  // Calculate value for each painting
  player.purchases.forEach(painting => {
    const value = calculatePaintingValue(
      gameState.board,
      painting.artist,
      gameState.round.roundNumber - 1, // Use current round (values already updated)
      gameState.round.phase.type === 'selling_to_bank'
        ? gameState.round.phase.results
        : []
    )
    if (value > 0) {
      totalSaleValue += value
      soldPaintings.push({
        ...painting,
        salePrice: value,
        soldRound: gameState.round.roundNumber
      })
    }
  })

  // Update player's money
  let newGameState = processBankSale(gameState, playerId, totalSaleValue)

  // Remove only sold paintings from player's collection and add to discard pile
  // Keep zero-value paintings in player's collection
  const unsoldPaintings = player.purchases.filter(painting => {
    const value = calculatePaintingValue(
      gameState.board,
      painting.artist,
      gameState.round.roundNumber - 1,
      gameState.round.phase.type === 'selling_to_bank'
        ? gameState.round.phase.results
        : []
    )
    return value === 0
  })

  newGameState = {
    ...newGameState,
    players: newGameState.players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          purchases: unsoldPaintings // Keep zero-value paintings
        }
      }
      return p
    }),
    discardPile: [
      ...newGameState.discardPile,
      ...soldPaintings.map(p => p.card)
    ]
  }

  // Add bank sale event
  const newEvent = {
    type: 'bank_sale' as const,
    playerId,
    totalSaleValue,
    paintingCount: soldPaintings.length,
    paintings: soldPaintings
  }

  return {
    ...newGameState,
    eventLog: [...newGameState.eventLog, newEvent]
  }
}

/**
 * Sell all paintings for all players
 */
export function sellAllPaintingsToBank(gameState: GameState): GameState {
  let newGameState = { ...gameState }

  // Sell paintings for each player
  gameState.players.forEach(player => {
    newGameState = sellPlayerPaintingsToBank(newGameState, player.id)
  })

  return newGameState
}

/**
 * Get a player's sellable paintings and their values
 */
export function getPlayerSellablePaintings(
  gameState: GameState,
  playerId: string
): { painting: Painting; value: number }[] {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player || !player.purchases) {
    return []
  }

  return player.purchases
    .map(painting => ({
      painting,
      value: calculatePaintingValue(
        gameState.board,
        painting.artist,
        gameState.round.roundNumber - 1,
        gameState.round.phase.type === 'selling_to_bank'
          ? gameState.round.phase.results
          : []
      )
    }))
    .filter(item => item.value > 0)
}

/**
 * Calculate how much a player will earn from selling paintings
 */
export function calculatePlayerSaleEarnings(
  gameState: GameState,
  playerId: string
): number {
  const sellablePaintings = getPlayerSellablePaintings(gameState, playerId)
  return sellablePaintings.reduce((total, { value }) => total + value, 0)
}

/**
 * Check if a player has any sellable paintings
 */
export function hasSellablePaintings(
  gameState: GameState,
  playerId: string
): boolean {
  const sellablePaintings = getPlayerSellablePaintings(gameState, playerId)
  return sellablePaintings.length > 0
}

/**
 * Get summary of all players' potential earnings
 */
export function getAllPlayersSaleEarnings(gameState: GameState): Array<{
  playerId: string
  playerName: string
  earnings: number
  paintingCount: number
}> {
  return gameState.players.map(player => {
    const sellablePaintings = getPlayerSellablePaintings(gameState, player.id)
    const earnings = sellablePaintings.reduce((total, { value }) => total + value, 0)

    return {
      playerId: player.id,
      playerName: player.name,
      earnings,
      paintingCount: sellablePaintings.length
    }
  })
}

/**
 * Get the total value of all paintings in play
 */
export function getTotalPaintingValue(gameState: GameState): number {
  let totalValue = 0

  const roundResults = gameState.round.phase.type === 'selling_to_bank'
    ? gameState.round.phase.results
    : []

  gameState.players.forEach(player => {
    if (player.purchases) {
      player.purchases.forEach(painting => {
        const value = calculatePaintingValue(
          gameState.board,
          painting.artist,
          gameState.round.roundNumber - 1,
          roundResults
        )
        totalValue += value
      })
    }
  })

  return totalValue
}

/**
 * Get painting distribution by artist
 */
export function getPaintingDistribution(gameState: GameState): Record<string, number> {
  const distribution: Record<string, number> = {}

  gameState.players.forEach(player => {
    if (player.purchases) {
      player.purchases.forEach(painting => {
        distribution[painting.artist] = (distribution[painting.artist] || 0) + 1
      })
    }
  })

  return distribution
}

/**
 * Get the most valuable artist for a player
 */
export function getPlayersMostValuableArtist(
  gameState: GameState,
  playerId: string
): { artist: string; totalValue: number; paintingCount: number } | null {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player || !player.purchases) {
    return null
  }

  const artistValues: Record<string, { value: number; count: number }> = {}

  const roundResults = gameState.round.phase.type === 'selling_to_bank'
    ? gameState.round.phase.results
    : []

  player.purchases.forEach(painting => {
    const value = calculatePaintingValue(
      gameState.board,
      painting.artist,
      gameState.round.roundNumber - 1,
      roundResults
    )
    if (!artistValues[painting.artist]) {
      artistValues[painting.artist] = { value: 0, count: 0 }
    }
    artistValues[painting.artist].value += value
    artistValues[painting.artist].count += 1
  })

  let bestArtist: string | null = null
  let maxValue = 0
  let maxCount = 0

  Object.entries(artistValues).forEach(([artist, { value, count }]) => {
    if (value > maxValue || (value === maxValue && count > maxCount)) {
      bestArtist = artist
      maxValue = value
      maxCount = count
    }
  })

  return bestArtist ? {
    artist: bestArtist,
    totalValue: maxValue,
    paintingCount: maxCount
  } : null
}