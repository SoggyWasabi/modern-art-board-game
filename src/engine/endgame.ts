import type { GameState, Player, GameEndResult } from '../types/game'
import { getTotalPaintingValue, getAllPlayersSaleEarnings } from './selling'
import { getMoneyStats } from './money'

/**
 * End Game Engine
 *
 * Handles:
 * - Winner determination
 * - Final scoring
 * - Game end conditions
 * - Statistics and summaries
 */

/**
 * Determine the winner(s) of the game
 */
export function determineWinner(gameState: GameState): GameEndResult {
  const playerScores = gameState.players.map(player => {
    // Score is final money + value of any unsold paintings
    const finalMoney = player.money
    const unsoldPaintingsValue = player.purchases
      ? player.purchases.reduce((_total, _painting) => {
          // Paintings have no value after game ends if not sold
          return 0
        }, 0)
      : 0

    const totalScore = finalMoney + unsoldPaintingsValue

    return {
      player,
      finalMoney,
      unsoldPaintingsValue,
      totalScore,
      paintingsOwned: (player.purchases || []).length
    }
  })

  // Sort by total score (descending)
  playerScores.sort((a, b) => b.totalScore - a.totalScore)

  const winner = playerScores[0]
  const isTie = playerScores.some(score =>
    score.player.id !== winner.player.id && score.totalScore === winner.totalScore
  )

  // Handle tie-breaking
  let finalWinner = winner.player
  let tieBreakReason = ''

  if (isTie) {
    const tiedPlayers = playerScores.filter(score => score.totalScore === winner.totalScore)

    // First tie-breaker: most paintings
    const maxPaintings = Math.max(...tiedPlayers.map(score => score.paintingsOwned))
    const paintingWinners = tiedPlayers.filter(score => score.paintingsOwned === maxPaintings)

    if (paintingWinners.length === 1) {
      finalWinner = paintingWinners[0].player
      tieBreakReason = `Most paintings (${maxPaintings})`
    } else {
      // Still tied - it's a shared victory
      tieBreakReason = 'Tied on money and paintings'
    }
  }

  return {
    winner: finalWinner,
    isTie,
    tieBreakReason,
    finalScores: playerScores,
    totalRounds: gameState.round.roundNumber,
    totalCardsPlayed: Object.values(gameState.round.cardsPlayedPerArtist).reduce((sum, count) => sum + count, 0)
  }
}

/**
 * Get comprehensive game summary
 */
export function getGameSummary(gameState: GameState) {
  const moneyStats = getMoneyStats(gameState)
  const saleEarnings = getAllPlayersSaleEarnings(gameState)
  const totalPaintingValue = getTotalPaintingValue(gameState)

  return {
    roundsPlayed: gameState.round.roundNumber,
    moneyDistribution: moneyStats,
    saleEarnings,
    totalPaintingValue,
    cardsPlayedThisRound: gameState.round.cardsPlayedPerArtist,
    eventCount: gameState.eventLog.length
  }
}

/**
 * Get player's final performance summary
 */
export function getPlayerFinalStats(gameState: GameState, playerId: string) {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player) {
    return null
  }

  const earnings = getAllPlayersSaleEarnings(gameState).find(e => e.playerId === playerId)
  const paintings = player.purchases || []

  const artistBreakdown: Record<string, number> = {}
  paintings.forEach(painting => {
    artistBreakdown[painting.artist] = (artistBreakdown[painting.artist] || 0) + 1
  })

  return {
    player: {
      id: player.id,
      name: player.name,
      isAI: player.isAI
    },
    finalMoney: player.money,
    paintingsOwned: paintings.length,
    saleEarnings: earnings?.earnings || 0,
    artistBreakdown,
    finalScore: player.money
  }
}

/**
 * Check if game should end early
 */
export function checkEarlyEndConditions(gameState: GameState): {
  shouldEnd: boolean
  reason?: string
} {
  // Check if all players are bankrupt
  const allBankrupt = gameState.players.every(player => player.money <= 0)
  if (allBankrupt) {
    return {
      shouldEnd: true,
      reason: 'All players bankrupt'
    }
  }

  // Check if only one player has money
  const playersWithMoney = gameState.players.filter(player => player.money > 0)
  if (playersWithMoney.length === 1) {
    return {
      shouldEnd: true,
      reason: `${playersWithMoney[0].name} is the only player with money`
    }
  }

  // Check if deck is empty and all players are out of cards
  const deckEmpty = gameState.deck.length === 0
  const allPlayersEmpty = gameState.players.every(p => !p.hand || p.hand.length === 0)

  if (deckEmpty && allPlayersEmpty && gameState.round.roundNumber < 4) {
    return {
      shouldEnd: true,
      reason: 'No cards remaining in deck or player hands'
    }
  }

  return {
    shouldEnd: false
  }
}

/**
 * Get ranking of all players
 */
export function getPlayerRankings(gameState: GameState): Array<{
  rank: number
  player: Player
  score: number
  isTied: boolean
}> {
  const playerScores = gameState.players.map(player => ({
    player,
    score: player.money // In Modern Art, money is the final score
  }))

  // Sort by score (descending)
  playerScores.sort((a, b) => b.score - a.score)

  // Assign ranks (handle ties)
  const rankings: Array<{ rank: number; player: Player; score: number; isTied: boolean }> = []
  let currentRank = 1

  for (let i = 0; i < playerScores.length; i++) {
    const currentScore = playerScores[i].score
    const nextScore = i < playerScores.length - 1 ? playerScores[i + 1].score : -1
    const isTied = currentScore === nextScore

    rankings.push({
      rank: currentRank,
      player: playerScores[i].player,
      score: currentScore,
      isTied
    })

    if (!isTied && i < playerScores.length - 1) {
      currentRank = i + 2
    }
  }

  return rankings
}

/**
 * Get game statistics for analysis
 */
export function getGameStatistics(gameState: GameState) {
  const rankings = getPlayerRankings(gameState)
  const winner = rankings[0]
  const moneyStats = getMoneyStats(gameState)

  return {
    winner: winner.player,
    winningScore: winner.score,
    isTie: winner.isTied,
    playerCount: gameState.players.length,
    roundsPlayed: gameState.round.roundNumber,
    totalMoneyInGame: moneyStats.total,
    averageMoney: moneyStats.average,
    moneyGap: moneyStats.max - moneyStats.min,
    rankings,
    artistStats: gameState.round.cardsPlayedPerArtist
  }
}