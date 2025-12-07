import type {
  GameState,
  Player,
  Card,
  RoundState,
  RoundPhase,
  Artist,
  GameEvent
} from '../types/game'
import { createDeck, dealCards } from './deck'
import { rankArtists } from './valuation'
import { ARTISTS } from './constants'

/**
 * Round Management Engine
 *
 * Handles:
 * - Round flow and transitions
 * - Card playing and turn management
 * - 5th card rule (round ending)
 * - Artist valuation at round end
 */

/**
 * Start a new round
 */
export function startRound(
  gameState: GameState,
  roundNumber: 1 | 2 | 3 | 4
): GameState {
  // Deal cards for this round if it's the first round
  let deck = gameState.deck
  let players = [...gameState.players]

  if (roundNumber === 1) {
    // Initial deal
    const hands = dealCards(deck, players.length, 1)
    players = players.map((player, index) => ({
      ...player,
      hand: hands[index] || []
    }))

    // Update deck index
    const cardsDealt = hands.reduce((sum, hand) => sum + hand.length, 0)
    deck = deck.slice(cardsDealt)
  } else if (roundNumber > 1 && roundNumber <= 3) {
    // Deal additional cards for rounds 2 and 3
    const hands = dealCards(deck, players.length, roundNumber)
    players = players.map((player, index) => ({
      ...player,
      hand: [...(player.hand || []), ...(hands[index] || [])]
    }))

    const cardsDealt = hands.reduce((sum, hand) => sum + hand.length, 0)
    deck = deck.slice(cardsDealt)
  }
  // Round 4 deals no cards

  // Create new round state
  const roundState: RoundState = {
    roundNumber,
    cardsPlayedPerArtist: ARTISTS.reduce((acc, artist) => {
      acc[artist] = 0
      return acc
    }, {} as Record<Artist, number>),
    currentAuctioneerIndex: 0, // First player starts
    phase: { type: 'awaiting_card_play', activePlayerIndex: 0 }
  }

  // Add round started event
  const newEvent: GameEvent = {
    type: 'round_started',
    round: roundNumber
  }

  return {
    ...gameState,
    deck,
    players,
    round: roundState,
    eventLog: [...gameState.eventLog, newEvent]
  }
}

/**
 * Play a card from a player's hand
 */
export function playCard(
  gameState: GameState,
  playerIndex: number,
  cardIndex: number
): GameState {
  const player = gameState.players[playerIndex]
  const card = player.hand[cardIndex]

  if (!card) {
    throw new Error('No card at specified index')
  }

  // Remove card from player's hand
  const newPlayers = [...gameState.players]
  newPlayers[playerIndex] = {
    ...player,
    hand: player.hand.filter((_, i) => i !== cardIndex)
  }

  // Update cards played per artist
  const newCardsPlayed = { ...gameState.round.cardsPlayedPerArtist }
  newCardsPlayed[card.artist] = (newCardsPlayed[card.artist] || 0) + 1

  // Check for 5th card rule
  const is5thCard = newCardsPlayed[card.artist] >= 5

  // Create new round phase
  let newPhase: RoundPhase
  if (is5thCard) {
    // 5th card ends the round immediately
    // The card is not auctioned, just counted for ranking
    newPhase = { type: 'round_ending', unsoldCards: [card] }
  } else {
    // Start auction for the card
    // Note: Actual auction creation would happen in game.ts
    // For now, we'll just update the phase
    newPhase = {
      type: 'auction',
      auction: {
        // This would be created by the specific auction engine
        type: card.auctionType,
        card,
        // ... other auction state
      } as any
    }
  }

  // Add card played event
  const newEvent: GameEvent = {
    type: 'card_played',
    playerIndex,
    card
  }

  const newRoundState = {
    ...gameState.round,
    cardsPlayedPerArtist: newCardsPlayed,
    phase: newPhase
  }

  return {
    ...gameState,
    players: newPlayers,
    round: newRoundState,
    eventLog: [...gameState.eventLog, newEvent]
  }
}

/**
 * Get the next player after current auctioneer
 */
export function getNextAuctioneerIndex(gameState: GameState): number {
  const { currentAuctioneerIndex } = gameState.round
  const playerCount = gameState.players.length
  return (currentAuctioneerIndex + 1) % playerCount
}

/**
 * Check if round should end (5th card played or all players out of cards)
 */
export function shouldRoundEnd(gameState: GameState): boolean {
  const { round, players } = gameState

  // Check if any artist has 5 cards
  for (const count of Object.values(round.cardsPlayedPerArtist)) {
    if (count >= 5) {
      return true
    }
  }

  // Check if all players are out of cards
  const allPlayersOutOfCards = players.every(p => !p.hand || p.hand.length === 0)
  if (allPlayersOutOfCards) {
    return true
  }

  return false
}

/**
 * End the current round and calculate artist values
 */
export function endRound(gameState: GameState): GameState {
  // Rank artists based on cards played
  const results = rankArtists(gameState.round.cardsPlayedPerArtist)

  // Update board with this round's values
  const newBoard = { ...gameState.board }
  results.forEach((result, index) => {
    if (result.value > 0) {
      newBoard.artistValues[result.artist][gameState.round.roundNumber - 1] = result.value
    }
  })

  // Move to selling phase
  const newPhase: RoundPhase = {
    type: 'selling_to_bank',
    results
  }

  const newRoundState = {
    ...gameState.round,
    phase: newPhase
  }

  return {
    ...gameState,
    board: newBoard,
    round: newRoundState
  }
}

/**
 * Get current player based on round phase
 */
export function getCurrentPlayer(gameState: GameState): number | null {
  const { phase } = gameState.round

  if (phase.type === 'awaiting_card_play') {
    return phase.activePlayerIndex
  }

  // TODO: Handle auction phases when they're players can bid
  // This would depend on the specific auction type and state

  return null
}

/**
 * Check if a player can play a card
 */
export function canPlayerPlayCard(gameState: GameState, playerIndex: number): boolean {
  const { phase } = gameState.round

  // Can only play during awaiting_card_play phase
  if (phase.type !== 'awaiting_card_play') {
    return false
  }

  // Must be this player's turn
  if (phase.activePlayerIndex !== playerIndex) {
    return false
  }

  // Player must have cards
  const player = gameState.players[playerIndex]
  if (!player.hand || player.hand.length === 0) {
    return false
  }

  return true
}

/**
 * Get player's playable cards
 */
export function getPlayableCards(gameState: GameState, playerIndex: number): Card[] {
  if (!canPlayerPlayCard(gameState, playerIndex)) {
    return []
  }

  const player = gameState.players[playerIndex]
  return player.hand || []
}

/**
 * Check if round is in auction phase
 */
export function isRoundInAuction(gameState: GameState): boolean {
  return gameState.round.phase.type === 'auction'
}

/**
 * Get current auction if round is in auction phase
 */
export function getCurrentAuction(gameState: GameState) {
  const { phase } = gameState.round
  return phase.type === 'auction' ? phase.auction : null
}

/**
 * Get cards remaining in all players' hands
 */
export function getRemainingCards(gameState: GameState): number {
  return gameState.players.reduce((total, player) => {
    return total + (player.hand?.length || 0)
  }, 0)
}

/**
 * Check if any player has cards of a specific artist
 */
export function hasPlayerCardsOfArtist(
  gameState: GameState,
  artist: Artist
): boolean {
  return gameState.players.some(player =>
    player.hand?.some(card => card.artist === artist) || false
  )
}