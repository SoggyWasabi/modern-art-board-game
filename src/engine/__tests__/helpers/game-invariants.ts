import type { GameState, Player, Card } from '../../../types/game'
import { ARTISTS } from '../../constants'

/**
 * Game Invariants Validation
 *
 * These are the fundamental rules that must always hold true
 * regardless of game state. Use these to catch bugs early.
 */

export interface GameInvariant {
  name: string
  description: string
  validate: (state: GameState) => { valid: boolean; error?: string }
}

export interface InvariantViolation {
  invariant: string
  error: string
  state: Partial<GameState>
}

/**
 * Core invariants that must always be true
 */
export const GAME_INVARIANTS: GameInvariant[] = [
  {
    name: 'money_non_negative',
    description: 'No player should ever have negative money',
    validate: (state) => {
      for (const player of state.players) {
        if (player.money < 0) {
          return {
            valid: false,
            error: `Player ${player.name} has negative money: $${player.money}`
          }
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'card_conservation',
    description: 'Total cards in system must remain constant',
    validate: (state) => {
      // Total cards: 70 (10 per artist × 7 artists)
      const TOTAL_CARDS = 70

      const totalCards =
        state.deck.length +
        state.discardPile.length +
        state.players.reduce((sum, p) => sum + (p.hand?.length || 0), 0) +
        state.players.reduce((sum, p) => sum + (p.purchases?.length || 0), 0) +
        state.players.reduce((sum, p) => sum + (p.purchasedThisRound?.length || 0), 0)

      if (totalCards !== TOTAL_CARDS) {
        return {
          valid: false,
          error: `Card count mismatch: expected ${TOTAL_CARDS}, found ${totalCards}`
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'artist_card_limits',
    description: 'No artist can have more than their total cards played',
    validate: (state) => {
      // Each artist has 10 cards total
      for (const artist of ARTISTS) {
        const played = state.round.cardsPlayedPerArtist[artist] || 0
        if (played > 10) {
          return {
            valid: false,
            error: `Artist ${artist} has ${played} cards played, but only 10 exist`
          }
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'no_duplicate_cards',
    description: 'No card should appear in more than one place',
    validate: (state) => {
      const cardIds = new Set<string>()
      const duplicates: string[] = []

      const checkCards = (cards: Card[], location: string) => {
        cards.forEach(card => {
          if (cardIds.has(card.id)) {
            duplicates.push(`Card ${card.id} duplicated in ${location}`)
          } else {
            cardIds.add(card.id)
          }
        })
      }

      // Check all locations
      checkCards(state.deck, 'deck')
      checkCards(state.discardPile, 'discard')

      state.players.forEach(player => {
        if (player.hand) checkCards(player.hand, `${player.name}'s hand`)
        if (player.purchases) checkCards(player.purchases.map(p => p.card), `${player.name}'s purchases`)
        if (player.purchasedThisRound) {
          checkCards(player.purchasedThisRound.map(p => p.card), `${player.name}'s purchasedThisRound`)
        }
      })

      if (duplicates.length > 0) {
        return {
          valid: false,
          error: `Duplicate cards found: ${duplicates.join(', ')}`
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'round_number_valid',
    description: 'Round number must be between 1 and 4',
    validate: (state) => {
      if (state.round.roundNumber < 1 || state.round.roundNumber > 4) {
        return {
          valid: false,
          error: `Invalid round number: ${state.round.roundNumber} (must be 1-4)`
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'auctioneer_index_valid',
    description: 'Auctioneer index must be valid player index',
    validate: (state) => {
      const auctioneerIndex = state.round.currentAuctioneerIndex
      if (auctioneerIndex < 0 || auctioneerIndex >= state.players.length) {
        return {
          valid: false,
          error: `Invalid auctioneer index: ${auctioneerIndex} for ${state.players.length} players`
        }
      }
      return { valid: true }
    }
  },

  {
    name: 'player_hand_limit',
    description: 'Players should have reasonable hand sizes based on round',
    validate: (state) => {
      const { roundNumber } = state.round

      // Calculate expected max hand size
      let expectedMax = 0
      if (roundNumber === 1) expectedMax = 10
      else if (roundNumber === 2) expectedMax = 10 + 4 // 10 initial + 4 new
      else if (roundNumber === 3) expectedMax = 10 + 4 + 3 // + 3 new
      else if (roundNumber === 4) expectedMax = 10 + 4 + 3 // No new cards in round 4

      for (const player of state.players) {
        const handSize = player.hand?.length || 0
        if (handSize > expectedMax) {
          return {
            valid: false,
            error: `Player ${player.name} has ${handSize} cards in round ${roundNumber}, max is ${expectedMax}`
          }
        }
      }
      return { valid: true }
    }
  }
]

/**
 * Validate all invariants for a game state
 */
export function validateGameInvariants(state: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = []

  for (const invariant of GAME_INVARIANTS) {
    const result = invariant.validate(state)
    if (!result.valid) {
      violations.push({
        invariant: invariant.name,
        error: result.error!,
        state: {
          round: state.round.roundNumber,
          phase: state.round.phase.type,
          players: state.players.map(p => ({ name: p.name, money: p.money }))
        }
      })
    }
  }

  return violations
}

/**
 * Assert that all invariants hold
 */
export function assertInvariants(state: GameState, message?: string): void {
  const violations = validateGameInvariants(state)

  if (violations.length > 0) {
    const errorMessages = violations.map(v => `[${v.invariant}] ${v.error}`)
    const errorMessage = `Game invariants violated${message ? `: ${message}` : ''}\n${errorMessages.join('\n')}`

    // Log state for debugging
    console.error('Game state with violations:', JSON.stringify(violations[0].state, null, 2))

    throw new Error(errorMessage)
  }
}

/**
 * Get a summary of invariant status
 */
export function getInvariantReport(state: GameState): {
  total: number
  passed: number
  failed: number
  violations: InvariantViolation[]
} {
  const violations = validateGameInvariants(state)

  return {
    total: GAME_INVARIANTS.length,
    passed: GAME_INVARIANTS.length - violations.length,
    failed: violations.length,
    violations
  }
}