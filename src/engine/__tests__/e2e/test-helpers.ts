import type { GameState, GameSetup, PlayerConfig, Card } from '../../types/game'
import { startGame, nextRound, endGame } from '../game'
import { playCard } from '../round'
import { sellPlayerPaintingsToBank } from '../selling'
import { logger } from './game-logger'
import { ARTISTS } from '../constants'

/**
 * Test Helper Functions for E2E Testing
 *
 * Provides utilities to simulate realistic game scenarios.
 */

/**
 * Create a realistic game setup with varied players
 */
export function createRealisticGameSetup(playerCount: 3 | 4 | 5 = 4): GameSetup {
  const players: PlayerConfig[] = []

  for (let i = 0; i < playerCount; i++) {
    const isAI = i >= 2 // First 2 are human, rest are AI
    players.push({
      id: `player_${i}`,
      name: isAI ? `AI Player ${i - 1}` : `Human Player ${i + 1}`,
      type: isAI ? 'ai' : 'human',
      aiDifficulty: isAI ? 'medium' : undefined,
      color: `#${(i * 50).toString(16)}0000`
    })
  }

  return {
    playerCount,
    players,
    startingMoney: 100
  }
}

/**
 * Simulate a simple AI decision for bidding
 */
export function makeAIDecision(
  gameState: GameState,
  playerId: string,
  card: Card,
  currentBid: number,
  auctionType: string
): { shouldBid: boolean; bidAmount: number } {
  const player = gameState.players.find(p => p.id === playerId)!

  // Simple AI strategy
  const maxBid = player.money * 0.3 // Never bid more than 30% of money

  // Prefer certain artists based on "preferences"
  const preferredArtists = [ARTISTS[0], ARTISTS[1]] // AI likes first two artists
  const isPreferred = preferredArtists.includes(card.artist)

  // Adjust max bid based on preference
  const adjustedMaxBid = isPreferred ? maxBid * 1.5 : maxBid

  // For sealed bids, bid randomly within range
  if (auctionType === 'sealed') {
    const bidAmount = Math.floor(Math.random() * adjustedMaxBid)
    return { shouldBid: bidAmount > 0, bidAmount }
  }

  // For other auctions, only bid if current bid is below threshold
  if (currentBid >= adjustedMaxBid) {
    return { shouldBid: false, bidAmount: 0 }
  }

  // Incremental bidding
  const increment = Math.min(10, player.money - currentBid)
  const bidAmount = currentBid + increment

  return { shouldBid: true, bidAmount }
}

/**
 * Simulate an auction with proper bidding
 */
export function simulateAuction(
  gameState: GameState,
  card: Card,
  auctioneerId: string,
  auctionType: string
): GameState {
  let newGameState = { ...gameState }
  const auctioneer = newGameState.players.find(p => p.id === auctioneerId)!

  logger.logAuctionStart(auctionType, card, auctioneer, 10)

  if (auctionType === 'open') {
    // Open auction - players bid in turn
    let currentBid = 10
    let currentBidder: string | null = null
    let consecutivePasses = 0
    const playerOrder = newGameState.players.map(p => p.id)

    // Start with player after auctioneer
    let currentPlayerIndex = (playerOrder.indexOf(auctioneerId) + 1) % playerOrder.length

    while (consecutivePasses < newGameState.players.length - 1) {
      const playerId = playerOrder[currentPlayerIndex]

      // Skip auctioneer on first round
      if (currentBidder === null && playerId === auctioneerId) {
        currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length
        continue
      }

      const player = newGameState.players.find(p => p.id === playerId)!
      const decision = makeAIDecision(newGameState, playerId, card, currentBid, auctionType)

      if (decision.shouldBid && decision.bidAmount > currentBid) {
        // Update money (this would normally be handled by auction engine)
        currentBid = decision.bidAmount
        currentBidder = playerId
        consecutivePasses = 0
        logger.logAuctionBid(player, decision.bidAmount, currentBid)
      } else {
        consecutivePasses++
        logger.logAuctionBid(player, 0, currentBid)
      }

      currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length
    }

    // Process the auction result
    if (currentBidder) {
      const winner = newGameState.players.find(p => p.id === currentBidder)!

      // Transfer money
      newGameState.players = newGameState.players.map(p => {
        if (p.id === currentBidder) {
          return { ...p, money: p.money - currentBid }
        }
        if (p.id === auctioneerId) {
          return { ...p, money: p.money + currentBid }
        }
        return p
      })

      // Add painting to winner's collection
      if (!winner.purchases) {
        winner.purchases = []
      }
      winner.purchases.push({
        card,
        artist: card.artist,
        purchasePrice: currentBid,
        purchasedRound: newGameState.round.roundNumber
      })

      logger.logAuctionResult(winner, currentBid, auctioneer)
    } else {
      // No one bid - auctioneer wins for free
      logger.logAuctionResult(auctioneer, 0, auctioneer)
    }

  } else if (auctionType === 'sealed') {
    // Sealed bid auction
    const bids = newGameState.players
      .filter(p => p.id !== auctioneerId)
      .map(player => {
        const decision = makeAIDecision(newGameState, player.id, card, 0, auctionType)
        return { player, bid: decision.bidAmount }
      })
      .filter(b => b.bid > 0)

    logger.logSealedBidBids(bids)

    if (bids.length > 0) {
      // Find winner (highest bid)
      bids.sort((a, b) => b.bid - a.bid)
      const winner = bids[0]

      // Process payment
      newGameState.players = newGameState.players.map(p => {
        if (p.id === winner.player.id) {
          return { ...p, money: p.money - winner.bid }
        }
        if (p.id === auctioneerId) {
          return { ...p, money: p.money + winner.bid }
        }
        return p
      })

      // Add painting to winner
      if (!winner.player.purchases) {
        winner.player.purchases = []
      }
      winner.player.purchases.push({
        card,
        artist: card.artist,
        purchasePrice: winner.bid,
        purchasedRound: newGameState.round.roundNumber
      })

      logger.logAuctionResult(winner.player, winner.bid, auctioneer)
    }

  } else if (auctionType === 'fixed_price') {
    // Fixed price auction
    const price = 30
    const firstPlayer = newGameState.players.find(p => p.id !== auctioneerId && p.money >= price)

    if (firstPlayer) {
      // Process payment
      newGameState.players = newGameState.players.map(p => {
        if (p.id === firstPlayer.id) {
          return { ...p, money: p.money - price }
        }
        if (p.id === auctioneerId) {
          return { ...p, money: p.money + price }
        }
        return p
      })

      // Add painting
      if (!firstPlayer.purchases) {
        firstPlayer.purchases = []
      }
      firstPlayer.purchases.push({
        card,
        artist: card.artist,
        purchasePrice: price,
        purchasedRound: newGameState.round.roundNumber
      })

      logger.logAuctionResult(firstPlayer, price, auctioneer)
    } else {
      logger.logAuctionResult(auctioneer, 0, auctioneer)
    }

  } else if (auctionType === 'once_around') {
    // Once around auction
    const playerOrder = newGameState.players.map(p => p.id)
    let bestBid: { playerId: string; amount: number } | null = null
    const startIdx = playerOrder.indexOf(auctioneerId)

    // Each player gets exactly one bid
    for (let i = 0; i < playerOrder.length; i++) {
      const idx = (startIdx + i) % playerOrder.length
      const playerId = playerOrder[idx]

      if (playerId === auctioneerId) continue

      const player = newGameState.players.find(p => p.id === playerId)!
      const decision = makeAIDecision(newGameState, playerId, card, 0, auctionType)

      if (decision.shouldBid && (!bestBid || decision.bidAmount > bestBid.amount)) {
        bestBid = { playerId, amount: decision.bidAmount }
      }

      logger.logAuctionBid(player, decision.bidAmount, 0)
    }

    if (bestBid) {
      const winner = newGameState.players.find(p => p.id === bestBid!.playerId)!

      // Process payment
      newGameState.players = newGameState.players.map(p => {
        if (p.id === bestBid!.playerId) {
          return { ...p, money: p.money - bestBid!.amount }
        }
        if (p.id === auctioneerId) {
          return { ...p, money: p.money + bestBid!.amount }
        }
        return p
      })

      // Add painting
      if (!winner.purchases) {
        winner.purchases = []
      }
      winner.purchases.push({
        card,
        artist: card.artist,
        purchasePrice: bestBid.amount,
        purchasedRound: newGameState.round.roundNumber
      })

      logger.logAuctionResult(winner, bestBid.amount, auctioneer)
    }
  }

  logger.logMoneyStatus(newGameState)
  return newGameState
}

/**
 * Play a turn with card play and auction
 */
export function playTurn(gameState: GameState, playerIndex: number, cardIndex: number): GameState {
  const player = gameState.players[playerIndex]
  const card = player.hand[cardIndex]

  if (!card) {
    logger.logError(`No card at index ${cardIndex} for ${player.name}`)
    return gameState
  }

  logger.logCardPlay(player, card)

  // Play the card
  let newGameState = playCard(gameState, playerIndex, cardIndex)

  // If it's a 5th card, round ends
  if (newGameState.round.phase.type === 'round_ending') {
    logger.log(`\n🚨 5th card played! Round ends immediately!`)
    return newGameState
  }

  // Simulate the auction
  if (newGameState.round.phase.type === 'auction') {
    const auction = newGameState.round.phase.auction
    newGameState = simulateAuction(
      newGameState,
      auction.card,
      auction.auctioneerId || player.id,
      auction.type
    )

    // Move to next player (simplified - would normally be handled by auction engine)
    const nextPlayerIndex = (playerIndex + 1) % gameState.players.length
    newGameState = {
      ...newGameState,
      round: {
        ...newGameState.round,
        phase: { type: 'awaiting_card_play', activePlayerIndex: nextPlayerIndex }
      }
    }
  }

  return newGameState
}

/**
 * Validate game state invariants
 */
export function validateGameState(gameState: GameState): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check total money invariants
  const totalMoney = gameState.players.reduce((sum, p) => sum + p.money, 0)
  const expectedMin = 0 // Money can increase from bank sales
  if (totalMoney < expectedMin) {
    errors.push(`Total money too low: ${totalMoney}`)
  }

  // Check player money not negative
  gameState.players.forEach((player, idx) => {
    if (player.money < 0) {
      errors.push(`Player ${idx} (${player.name}) has negative money: ${player.money}`)
    }
  })

  // Check cards played count
  const totalCardsPlayed = Object.values(gameState.round.cardsPlayedPerArtist)
    .reduce((sum, count) => sum + count, 0)

  // Check round number
  if (gameState.round.roundNumber < 1 || gameState.round.roundNumber > 4) {
    errors.push(`Invalid round number: ${gameState.round.roundNumber}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Print game summary
 */
export function printGameSummary(gameState: GameState): void {
  logger.log('\n=== GAME SUMMARY ===')
  logger.log(`Rounds played: ${gameState.round.roundNumber}`)

  gameState.players.forEach(player => {
    logger.log(`${player.name}:`, {
      money: `$${player.money}`,
      cardsInHand: player.hand?.length || 0,
      paintingsOwned: player.purchases?.length || 0
    })
  })
}

/**
 * Run a complete simulation of the game
 */
export async function runCompleteGame(setup: GameSetup): Promise<GameState> {
  logger.clear()
  let game = startGame(setup)
  logger.logGameStart(game)

  // Play 4 rounds or until game ends early
  for (let round = 1; round <= 4; round++) {
    logger.logRoundStart(round)

    let turnCount = 0
    const maxTurns = 100 // Prevent infinite loops

    while (game.round.phase.type === 'awaiting_card_play' && turnCount < maxTurns) {
      const currentPlayerIndex = game.round.phase.activePlayerIndex
      const player = game.players[currentPlayerIndex]

      // Skip players with no cards
      if (!player.hand || player.hand.length === 0) {
        // Move to next player
        game = {
          ...game,
          round: {
            ...game.round,
            phase: {
              type: 'awaiting_card_play',
              activePlayerIndex: (currentPlayerIndex + 1) % game.players.length
            }
          }
        }
        continue
      }

      // Play first card (simple strategy)
      game = playTurn(game, currentPlayerIndex, 0)
      turnCount++

      // Check if round should end
      if (game.round.phase.type === 'round_ending') {
        break
      }
    }

    // End round
    if (game.round.phase.type !== 'selling_to_bank') {
      const { endRound } = await import('../round')
      game = endRound(game)
    }

    // Log round end and handle selling
    logger.logRoundEnd(game)

    if (game.round.phase.type === 'selling_to_bank') {
      // Sell paintings
      game.players.forEach(player => {
        game = sellPlayerPaintingsToBank(game, player.id)
      })
    }

    // Move to next round or end game
    if (round < 4) {
      game = nextRound(game)
    } else {
      game = endGame(game)
    }

    // Validate state
    const validation = validateGameState(game)
    logger.logValidation(`Game state after round ${round}`, validation.valid, validation.errors)

    if (game.gamePhase === 'ended') {
      break
    }
  }

  logger.logGameEnd(game)
  printGameSummary(game)

  return game
}