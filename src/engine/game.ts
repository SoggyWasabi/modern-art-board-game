import type {
  GamePhase,
  GameEvent
} from '../types/game'
import type {
  GameSetup
} from '../types/setup'
import type {
  GameState,
  Player
} from '../types/game'
import { startRound, shouldRoundEnd, endRound, getNextAuctioneerIndex } from './round'
import { createDeck, shuffleDeck } from './deck'
import { createInitialBoard } from './valuation'
import { ARTISTS } from './constants'

/**
 * Main Game Engine
 *
 * Handles:
 * - Game initialization and setup
 * - Round progression (4 rounds total)
 * - Game flow and state transitions
 * - Winner determination
 * - Early game end conditions
 */

/**
 * Start a new game with the given setup
 */
export function startGame(setup: GameSetup): GameState {
  // Create players from setup
  const players: Player[] = setup.players.map((config, index) => ({
    id: config.id || `player_${index}`,
    name: config.name,
    money: 100, // Starting money for all players
    hand: [],
    purchasedThisRound: [],
    isAI: config.type === 'ai',
    aiDifficulty: config.type === 'ai' ? config.aiDifficulty : undefined
  }))

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck())

  // Initialize game state
  const gameState: GameState = {
    players,
    deck,
    discardPile: [],
    board: createInitialBoard(),
    round: {
      roundNumber: 1,
      cardsPlayedPerArtist: ARTISTS.reduce((acc, artist) => {
        acc[artist] = 0
        return acc
      }, {} as Record<string, number>),
      currentAuctioneerIndex: 0,
      phase: { type: 'awaiting_card_play', activePlayerIndex: 0 }
    },
    gamePhase: 'playing',
    winner: null,
    eventLog: []
  }

  // Start first round (deals initial cards)
  return startRound(gameState, 1)
}

/**
 * Transition to the next round
 */
export function nextRound(gameState: GameState): GameState {
  if (gameState.round.roundNumber >= 4) {
    // Game is over, determine winner
    return endGame(gameState)
  }

  const nextRoundNumber = (gameState.round.roundNumber + 1) as 1 | 2 | 3 | 4

  // Keep hands - cards carry over between rounds
  // Only clear purchasedThisRound
  const newPlayers = gameState.players.map(player => ({
    ...player,
    purchasedThisRound: [] // Clear purchases from previous round
  }))

  // Update auctioneer to next player
  const nextAuctioneerIndex = getNextAuctioneerIndex(gameState)

  const newGameState: GameState = {
    ...gameState,
    players: newPlayers,
    round: {
      ...gameState.round,
      roundNumber: nextRoundNumber,
      currentAuctioneerIndex: nextAuctioneerIndex,
      cardsPlayedPerArtist: ARTISTS.reduce((acc, artist) => {
        acc[artist] = 0
        return acc
      }, {} as Record<string, number>),
      phase: { type: 'awaiting_card_play', activePlayerIndex: nextAuctioneerIndex }
    }
  }

  // Start the new round (deals cards for this round)
  return startRound(newGameState, nextRoundNumber as 1 | 2 | 3 | 4)
}

/**
 * Check if game should end early (all cards exhausted)
 */
export function shouldEndGameEarly(gameState: GameState): boolean {
  // Check if deck is empty and all players have no cards
  const deckEmpty = gameState.deck.length === 0
  const allPlayersEmpty = gameState.players.every(p => !p.hand || p.hand.length === 0)

  return deckEmpty && allPlayersEmpty
}

/**
 * End the game and determine winner
 */
export function endGame(gameState: GameState): GameState {
  // Find player with most money
  const maxMoney = Math.max(...gameState.players.map(p => p.money))
  const winners = gameState.players.filter(p => p.money === maxMoney)

  let winner: Player | null = null

  if (winners.length === 1) {
    winner = winners[0]
  } else {
    // Tie breaker: player with most paintings wins
    const maxPaintings = Math.max(...winners.map(p =>
      (p.purchases || []).length
    ))
    const paintingWinners = winners.filter(p =>
      (p.purchases || []).length === maxPaintings
    )

    if (paintingWinners.length === 1) {
      winner = paintingWinners[0]
    }
    // If still tied, it's a shared victory (winner remains null)
  }

  // Add game ended event
  const newEvent: GameEvent = {
    type: 'game_ended',
    winner: winner?.id || null
  }

  return {
    ...gameState,
    gamePhase: 'ended',
    winner,
    eventLog: [...gameState.eventLog, newEvent]
  }
}

/**
 * Get the current game phase
 */
export function getCurrentGamePhase(gameState: GameState): GamePhase {
  return gameState.gamePhase
}

/**
 * Check if the game is over
 */
export function isGameOver(gameState: GameState): boolean {
  return gameState.gamePhase === 'ended'
}

/**
 * Get the winner of the game
 */
export function getWinner(gameState: GameState): Player | null {
  return gameState.winner
}

/**
 * Get current round number
 */
export function getCurrentRound(gameState: GameState): number {
  return gameState.round.roundNumber
}

/**
 * Check if round should end and transition if needed
 */
export function checkRoundEnd(gameState: GameState): GameState {
  if (shouldRoundEnd(gameState)) {
    // End the round and calculate artist values
    const withValuation = endRound(gameState)

    // Transition to selling phase
    return {
      ...withValuation,
      round: {
        ...withValuation.round,
        phase: {
          type: 'selling_to_bank',
          results: withValuation.round.phase.type === 'selling_to_bank'
            ? withValuation.round.phase.results
            : []
        }
      }
    }
  }

  return gameState
}

/**
 * Check if game should end early
 */
export function checkEarlyGameEnd(gameState: GameState): GameState {
  if (shouldEndGameEarly(gameState) && gameState.round.roundNumber < 4) {
    return endGame(gameState)
  }

  return gameState
}

/**
 * Get game statistics
 */
export function getGameStats(gameState: GameState) {
  return {
    round: gameState.round.roundNumber,
    totalCards: gameState.deck.length,
    cardsInHands: gameState.players.reduce((sum, p) => sum + (p.hand?.length || 0), 0),
    cardsPlayed: Object.values(gameState.round.cardsPlayedPerArtist).reduce((sum, count) => sum + count, 0),
    gamePhase: gameState.gamePhase,
    isAuctionActive: gameState.round.phase.type === 'auction'
  }
}

/**
 * Validate game state
 */
export function validateGameState(gameState: GameState): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check player counts
  if (gameState.players.length < 3 || gameState.players.length > 5) {
    errors.push(`Invalid player count: ${gameState.players.length}. Must be 3-5.`)
  }

  // Check money
  gameState.players.forEach((player, index) => {
    if (player.money < 0) {
      errors.push(`Player ${index} has negative money: ${player.money}`)
    }
  })

  // Check round number
  if (gameState.round.roundNumber < 1 || gameState.round.roundNumber > 4) {
    errors.push(`Invalid round number: ${gameState.round.roundNumber}. Must be 1-4.`)
  }

  // Check artist counts
  const totalCardsPlayed = Object.values(gameState.round.cardsPlayedPerArtist).reduce((sum, count) => sum + count, 0)
  if (totalCardsPlayed < 0) {
    errors.push(`Invalid total cards played: ${totalCardsPlayed}`)
  }

  // Check auctioneer index
  if (gameState.round.currentAuctioneerIndex < 0 || gameState.round.currentAuctioneerIndex >= gameState.players.length) {
    errors.push(`Invalid auctioneer index: ${gameState.round.currentAuctioneerIndex}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}