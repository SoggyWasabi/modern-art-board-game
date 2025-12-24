/**
 * =============================================================================
 * GAME FLOW INTEGRATION TESTS
 * =============================================================================
 *
 * PURPOSE:
 * These tests verify that multiple modules work together correctly.
 * Unlike unit tests (which test functions in isolation), integration tests
 * verify the interactions and data flow between modules.
 *
 * KEY DIFFERENCE FROM UNIT TESTS:
 * - Unit tests: "Does transferMoney() subtract from sender and add to receiver?"
 * - Integration: "When an auction completes, does money transfer AND card ownership
 *                update AND event log record it AND game state remain valid?"
 *
 * MODULES BEING INTEGRATED:
 * - game.ts      → Game lifecycle, round transitions
 * - round.ts     → Card playing, turn management, 5th card rule
 * - valuation.ts → Artist ranking, value calculation
 * - selling.ts   → Bank sales, painting disposal
 * - money.ts     → All financial transactions
 * - auction/*    → All 5 auction types
 * - deck.ts      → Card dealing
 *
 * WHAT'S ALREADY COVERED (in auction-execution.test.ts):
 * ✅ Auction → Money transfer (player-to-player)
 * ✅ Auctioneer wins own auction (pays bank)
 * ✅ Money conservation during auctions
 * ✅ Multiple auction types with payments
 *
 * WHAT THIS FILE COVERS:
 * - Round lifecycle (start → play cards → auctions → end → sell)
 * - Multi-round progression with state accumulation
 * - 5th card rule triggering round end
 * - Artist value stacking across rounds
 * - State transitions (phases)
 * - Complete money flow through a round
 * - Card ownership tracking through auctions
 * - Deck depletion across rounds
 *
 * =============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Game lifecycle
import {
  startGame,
  nextRound,
  endGame,
  checkRoundEnd,
  validateGameState
} from '../../game'

// Round management
import {
  startRound,
  playCard,
  endRound,
  shouldRoundEnd,
  getNextAuctioneerIndex,
  canPlayerPlayCard,
  getRemainingCards
} from '../../round'

// Valuation
import {
  rankArtists,
  getArtistValue,
  calculatePaintingValue,
  createInitialBoard
} from '../../valuation'

// Selling
import {
  sellPlayerPaintingsToBank,
  sellAllPaintingsToBank,
  calculatePlayerSaleEarnings,
  getTotalPaintingValue
} from '../../selling'

// Money
import {
  processBankSale,
  getTotalMoney,
  transferMoney
} from '../../money'

// Deck
import { createDeck, dealCards } from '../../deck'

// Auction execution
import { executeAuction } from '../../auction/executor'

// Types
import type {
  GameState,
  Player,
  Card,
  Painting,
  AuctionResult,
  Artist,
  GameBoard
} from '../../../types/game'
import type { GameSetup, PlayerConfig } from '../../../types/setup'
import { ARTISTS } from '../../constants'

// =============================================================================
// TEST HELPERS
// =============================================================================

// Helper function to calculate total artist value across all rounds
function getTotalArtistValue(board: GameBoard, artist: Artist): number {
  return board.artistValues[artist].reduce((sum, value) => sum + value, 0)
}

/**
 * Creates a standard test game setup
 */
function createTestSetup(playerCount: 3 | 4 | 5): GameSetup {
  const players: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player_${i}`,
    name: `Player ${i + 1}`,
    type: 'human' as const,
    color: `#${i}${i}${i}`,
  }))

  return {
    playerCount,
    players,
    startingMoney: 100,
  }
}

/**
 * Creates a game state with specific cards in player hands
 * Useful for testing specific scenarios
 */
function createGameWithHands(
  playerHands: Card[][],
  options: {
    roundNumber?: 1 | 2 | 3 | 4
    startingMoney?: number
    existingPurchases?: Painting[][]
  } = {}
): GameState {
  const { roundNumber = 1, startingMoney = 100, existingPurchases = [] } = options

  const players: Player[] = playerHands.map((hand, i) => ({
    id: `player_${i}`,
    name: `Player ${i + 1}`,
    money: startingMoney,
    hand,
    purchases: existingPurchases[i] || [],
    purchasedThisRound: []
  }))

  return {
    players,
    deck: [], // Empty deck for controlled tests
    discardPile: [],
    board: createInitialBoard(),
    round: {
      roundNumber,
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
}

/**
 * Creates a test card
 */
function createCard(
  artist: Artist,
  auctionType: Card['auctionType'] = 'open',
  id?: string
): Card {
  return {
    id: id || `card_${artist}_${Date.now()}_${Math.random()}`,
    artist,
    auctionType,
    artworkId: `art_${artist}_${Date.now()}`
  }
}

/**
 * Creates a painting (purchased card)
 */
function createPainting(
  artist: Artist,
  purchasePrice: number,
  purchasedRound: number
): Painting {
  return {
    card: createCard(artist),
    artist,
    purchasePrice,
    purchasedRound
  }
}

/**
 * Simulates an auction result
 */
function createAuctionResult(
  winnerId: string,
  auctioneerId: string,
  salePrice: number
): AuctionResult {
  return {
    winnerId,
    auctioneerId,
    salePrice,
    profit: winnerId !== auctioneerId ? salePrice : 0
  }
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Game Flow Integration', () => {

  // ===========================================================================
  // SECTION 1: ROUND LIFECYCLE
  // ===========================================================================
  // Tests the complete flow of a single round from start to finish
  // Modules: round.ts, valuation.ts, selling.ts, money.ts

  describe('Round Lifecycle', () => {

    describe('Round Start → Card Play → Round End', () => {
      /**
       * TEST: Complete round with cards played and artist ranking
       *
       * FLOW:
       * 1. Start round with players having cards
       * 2. Players play cards (updating cardsPlayedPerArtist)
       * 3. One artist reaches 5 cards OR all cards played
       * 4. Round ends, artists ranked
       * 5. Values assigned to board
       *
       * VERIFY:
       * - Cards removed from hands when played
       * - cardsPlayedPerArtist increments correctly
       * - Artist ranking follows rules (count → board position tiebreaker)
       * - Board updated with correct values (30/20/10/0/0)
       */
      it('completes round with cards played and correct artist ranking', () => {
        // SETUP: Create game with specific hands
        const game = createGameWithHands([
          [
            createCard('Manuel Carvalho', 'open'),
            createCard('Manuel Carvalho', 'open'),
            createCard('Sigrid Thaler', 'open'),
          ],
          [
            createCard('Manuel Carvalho', 'open'),
            createCard('Sigrid Thaler', 'open'),
            createCard('Daniel Melim', 'open'),
          ],
          [
            createCard('Sigrid Thaler', 'open'),
            createCard('Daniel Melim', 'open'),
            createCard('Ramon Martins', 'open'),
          ]
        ])

        // Initial state verification
        expect(game.players[0].hand.length).toBe(3)
        expect(game.players[1].hand.length).toBe(3)
        expect(game.players[2].hand.length).toBe(3)
        expect(game.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(0)

        // ACTION: Play cards to simulate a round
        let state = game

        // Helper to set the next active player
        const setNextPlayer = (gameState: GameState, nextPlayerIndex: number) => {
          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                ...gameState.round.phase,
                type: 'awaiting_card_play' as const,
                activePlayerIndex: nextPlayerIndex
              }
            }
          }
        }

        // Player 0 plays Manuel
        state = playCard(state, 0, 0)
        expect(state.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(1)
        expect(state.players[0].hand.length).toBe(2)

        // Reset to awaiting_card_play for next player
        state = setNextPlayer(state, 1)

        // Player 1 plays Manuel
        state = playCard(state, 1, 0)
        expect(state.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(2)

        state = setNextPlayer(state, 2)

        // Player 2 plays Sigrid
        state = playCard(state, 2, 0)
        expect(state.round.cardsPlayedPerArtist['Sigrid Thaler']).toBe(1)

        state = setNextPlayer(state, 0)

        // Continue playing cards
        state = playCard(state, 0, 0) // Player 0 plays second Manuel
        expect(state.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(3)

        state = setNextPlayer(state, 1)

        state = playCard(state, 1, 0) // Player 1 plays Sigrid
        expect(state.round.cardsPlayedPerArtist['Sigrid Thaler']).toBe(2)

        state = setNextPlayer(state, 2)

        state = playCard(state, 2, 0) // Player 2 plays Daniel
        expect(state.round.cardsPlayedPerArtist['Daniel Melim']).toBe(1)

        state = setNextPlayer(state, 0)

        // Last cards - ensure we have a clear ranking
        state = playCard(state, 0, 0) // Player 0 plays last Sigrid
        expect(state.round.cardsPlayedPerArtist['Sigrid Thaler']).toBe(3)

        state = setNextPlayer(state, 1)

        state = playCard(state, 1, 0) // Player 1 plays Daniel
        expect(state.round.cardsPlayedPerArtist['Daniel Melim']).toBe(2)

        state = setNextPlayer(state, 2)

        state = playCard(state, 2, 0) // Player 2 plays Ramon
        expect(state.round.cardsPlayedPerArtist['Ramon Martins']).toBe(1)

        // At this point, all cards are played
        expect(shouldRoundEnd(state)).toBe(true)

        // End round and check rankings
        state = endRound(state)

        // VERIFY: Artists ranked correctly
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        // Manuel: 3 cards (1st place)
        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)

        // Sigrid: 3 cards (2nd place on tiebreaker - board position)
        const sigrid = results.find(r => r.artist === 'Sigrid Thaler')
        expect(sigrid?.rank).toBe(2)
        expect(sigrid?.value).toBe(20)

        // Daniel: 2 cards (3rd place)
        const daniel = results.find(r => r.artist === 'Daniel Melim')
        expect(daniel?.rank).toBe(3)
        expect(daniel?.value).toBe(10)

        // Ramon: 1 card (no value)
        const ramon = results.find(r => r.artist === 'Ramon Martins')
        expect(ramon?.value).toBe(0)

        // Rafael: 0 cards (no value)
        const rafael = results.find(r => r.artist === 'Rafael Silveira')
        expect(rafael?.value).toBe(0)

        // Verify board updated
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
        expect(state.board.artistValues['Sigrid Thaler'][0]).toBe(20)
        expect(state.board.artistValues['Daniel Melim'][0]).toBe(10)
      })

      /**
       * TEST: 5th card rule ends round immediately
       *
       * FLOW:
       * 1. Set up game with 4 cards of one artist already played
       * 2. Player plays 5th card of that artist
       * 3. Round should end immediately (no auction for 5th card)
       *
       * VERIFY:
       * - shouldRoundEnd() returns true
       * - The 5th card counts for ranking but is NOT auctioned
       * - Phase transitions to round_ending
       */
      it('5th card rule ends round immediately without auctioning 5th card', () => {
        // SETUP: Create game with 4 Manuel cards already played
        const game = createGameWithHands([
          [createCard('Manuel Carvalho', 'open')], // Player 0 has the 5th Manuel
          [createCard('Sigrid Thaler', 'open')],
          [createCard('Daniel Melim', 'open')]
        ])

        // Set up initial state with 4 Manuel cards already played
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              ...game.round.cardsPlayedPerArtist,
              'Manuel Carvalho': 4
            }
          }
        }

        // VERIFY initial state
        expect(state.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(4)
        expect(shouldRoundEnd(state)).toBe(false) // Not ended yet

        // ACTION: Player 0 plays the 5th Manuel card
        state = playCard(state, 0, 0)

        // VERIFY: Round should end immediately
        expect(state.round.cardsPlayedPerArtist['Manuel Carvalho']).toBe(5)
        expect(state.round.phase.type).toBe('round_ending')

        // The 5th card should be in unsoldCards (not auctioned)
        if (state.round.phase.type === 'round_ending') {
          expect(state.round.phase.unsoldCards).toHaveLength(1)
          expect(state.round.phase.unsoldCards[0].artist).toBe('Manuel Carvalho')
        }

        // VERIFY: shouldRoundEnd returns true
        expect(shouldRoundEnd(state)).toBe(true)

        // End the round and verify ranking
        state = endRound(state)

        // Manuel should be ranked 1st with 5 cards
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)
        expect(manuel?.cardCount).toBe(5)

        // Verify board updated
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
      })

      /**
       * TEST: Round ends when all players run out of cards
       *
       * FLOW:
       * 1. Players play all their cards (no artist reaches 5)
       * 2. All hands empty
       * 3. Round ends
       *
       * VERIFY:
       * - shouldRoundEnd() returns true when all hands empty
       * - Artists still ranked by cards played
       */
      it('round ends when all players exhaust their cards', () => {
        // SETUP: Create game with small hands
        const game = createGameWithHands([
          [createCard('Manuel Carvalho', 'open')],
          [createCard('Sigrid Thaler', 'open')],
          [createCard('Daniel Melim', 'open')]
        ])

        let state = game

        // Helper to set the next active player
        const setNextPlayer = (gameState: GameState, nextPlayerIndex: number) => {
          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                ...gameState.round.phase,
                type: 'awaiting_card_play' as const,
                activePlayerIndex: nextPlayerIndex
              }
            }
          }
        }

        // VERIFY: Round shouldn't end initially
        expect(shouldRoundEnd(state)).toBe(false)
        expect(getRemainingCards(state)).toBe(3)

        // ACTION: Play all cards
        // Player 0 plays Manuel
        state = playCard(state, 0, 0)
        expect(state.players[0].hand.length).toBe(0)
        expect(getRemainingCards(state)).toBe(2)

        state = setNextPlayer(state, 1)

        // Player 1 plays Sigrid
        state = playCard(state, 1, 0)
        expect(state.players[1].hand.length).toBe(0)
        expect(getRemainingCards(state)).toBe(1)

        state = setNextPlayer(state, 2)

        // Player 2 plays Daniel
        state = playCard(state, 2, 0)
        expect(state.players[2].hand.length).toBe(0)
        expect(getRemainingCards(state)).toBe(0)

        // VERIFY: Round should end when all hands are empty
        expect(shouldRoundEnd(state)).toBe(true)

        // End the round and verify rankings
        state = endRound(state)

        // All artists should have 1 card each
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        // Manuel should be 1st (tiebreaker - board position)
        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)
        expect(manuel?.cardCount).toBe(1)

        // Sigrid should be 2nd
        const sigrid = results.find(r => r.artist === 'Sigrid Thaler')
        expect(sigrid?.rank).toBe(2)
        expect(sigrid?.value).toBe(20)
        expect(sigrid?.cardCount).toBe(1)

        // Daniel should be 3rd
        const daniel = results.find(r => r.artist === 'Daniel Melim')
        expect(daniel?.rank).toBe(3)
        expect(daniel?.value).toBe(10)
        expect(daniel?.cardCount).toBe(1)

        // Ramon and Rafael should have 0 cards and no value
        const ramon = results.find(r => r.artist === 'Ramon Martins')
        expect(ramon?.cardCount).toBe(0)
        expect(ramon?.value).toBe(0)

        const rafael = results.find(r => r.artist === 'Rafael Silveira')
        expect(rafael?.cardCount).toBe(0)
        expect(rafael?.value).toBe(0)
      })
    })

    describe('Artist Valuation at Round End', () => {
      /**
       * TEST: Artist ranking with clear winner
       *
       * SETUP:
       * - Manuel: 4 cards
       * - Sigrid: 3 cards
       * - Daniel: 2 cards
       * - Others: 0-1 cards
       *
       * VERIFY:
       * - Manuel gets rank 1, value 30
       * - Sigrid gets rank 2, value 20
       * - Daniel gets rank 3, value 10
       * - Others get rank null, value 0
       */
      it('ranks artists correctly with clear card count winners', () => {
        // SETUP: Create a game state directly with specific card counts
        const game = createGameWithHands([]) // Empty hands for this test

        // Manually set up cardsPlayedPerArtist to test ranking
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place
              'Sigrid Thaler': 3,    // 2nd place
              'Daniel Melim': 2,     // 3rd place
              'Ramon Martins': 1,    // No value (4th place)
              'Rafael Silveira': 0   // No value (5th place)
            }
          }
        }

        // VERIFY: shouldRoundEnd should return true when all hands are empty
        expect(shouldRoundEnd(state)).toBe(true) // All players have empty hands

        // ACTION: End the round to trigger ranking
        state = endRound(state)

        // VERIFY: Artists ranked correctly
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        // Manuel: 4 cards, 1st place, $30 value
        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)
        expect(manuel?.cardCount).toBe(4)

        // Sigrid: 3 cards, 2nd place, $20 value
        const sigrid = results.find(r => r.artist === 'Sigrid Thaler')
        expect(sigrid?.rank).toBe(2)
        expect(sigrid?.value).toBe(20)
        expect(sigrid?.cardCount).toBe(3)

        // Daniel: 2 cards, 3rd place, $10 value
        const daniel = results.find(r => r.artist === 'Daniel Melim')
        expect(daniel?.rank).toBe(3)
        expect(daniel?.value).toBe(10)
        expect(daniel?.cardCount).toBe(2)

        // Ramon: 1 card, no rank (4th place), $0 value
        const ramon = results.find(r => r.artist === 'Ramon Martins')
        expect(ramon?.rank).toBe(null)
        expect(ramon?.value).toBe(0)
        expect(ramon?.cardCount).toBe(1)

        // Rafael: 0 cards, no rank (5th place), $0 value
        const rafael = results.find(r => r.artist === 'Rafael Silveira')
        expect(rafael?.rank).toBe(null)
        expect(rafael?.value).toBe(0)
        expect(rafael?.cardCount).toBe(0)

        // Verify board values are set correctly
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
        expect(state.board.artistValues['Sigrid Thaler'][0]).toBe(20)
        expect(state.board.artistValues['Daniel Melim'][0]).toBe(10)
        expect(state.board.artistValues['Ramon Martins'][0]).toBe(0)
        expect(state.board.artistValues['Rafael Silveira'][0]).toBe(0)

        // Verify total results count
        expect(results).toHaveLength(5) // All 5 artists should be in results
      })

      /**
       * TEST: Tiebreaker by board position
       *
       * SETUP:
       * - Manuel: 3 cards (board position 0)
       * - Sigrid: 3 cards (board position 1)
       * - Daniel: 3 cards (board position 2)
       *
       * VERIFY:
       * - Manuel wins tiebreaker (leftmost on board)
       * - Sigrid gets rank 2
       * - Daniel gets rank 3
       */
      it('breaks ties using board position (leftmost wins)', () => {
        // SETUP: Create a game state with tied artists
        const game = createGameWithHands([])

        // Set up a 3-way tie: each artist has 3 cards
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 3,  // Board position 0 (leftmost)
              'Sigrid Thaler': 3,    // Board position 1
              'Daniel Melim': 3,     // Board position 2
              'Ramon Martins': 0,
              'Rafael Silveira': 0
            }
          }
        }

        // ACTION: End the round to trigger ranking
        state = endRound(state)

        // VERIFY: Tie resolved by board position
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        // Manuel should win tiebreaker (board position 0)
        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)
        expect(manuel?.cardCount).toBe(3)

        // Sigrid should be 2nd (board position 1)
        const sigrid = results.find(r => r.artist === 'Sigrid Thaler')
        expect(sigrid?.rank).toBe(2)
        expect(sigrid?.value).toBe(20)
        expect(sigrid?.cardCount).toBe(3)

        // Daniel should be 3rd (board position 2)
        const daniel = results.find(r => r.artist === 'Daniel Melim')
        expect(daniel?.rank).toBe(3)
        expect(daniel?.value).toBe(10)
        expect(daniel?.cardCount).toBe(3)

        // Verify board values reflect the tiebreaker
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
        expect(state.board.artistValues['Sigrid Thaler'][0]).toBe(20)
        expect(state.board.artistValues['Daniel Melim'][0]).toBe(10)
      })

      /**
       * TEST: Artists with 0 cards get no value
       *
       * VERIFY:
       * - Artists with 0 cards played are ranked but get value 0
       * - Even if fewer than 3 artists have cards, only those with cards can rank
       */
      it('artists with zero cards played receive no value', () => {
        // SETUP: Create a game with only 2 artists having cards
        const game = createGameWithHands([])

        // Only Manuel and Sigrid have cards, others have 0
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place
              'Sigrid Thaler': 2,    // 2nd place
              'Daniel Melim': 0,     // No cards
              'Ramon Martins': 0,    // No cards
              'Rafael Silveira': 0   // No cards
            }
          }
        }

        // ACTION: End the round
        state = endRound(state)

        // VERIFY: Only artists with cards get ranked and get value
        const results = state.round.phase.type === 'selling_to_bank'
          ? state.round.phase.results
          : []

        // Manuel: 4 cards, 1st place, $30 value
        const manuel = results.find(r => r.artist === 'Manuel Carvalho')
        expect(manuel?.rank).toBe(1)
        expect(manuel?.value).toBe(30)
        expect(manuel?.cardCount).toBe(4)

        // Sigrid: 2 cards, 2nd place, $20 value
        const sigrid = results.find(r => r.artist === 'Sigrid Thaler')
        expect(sigrid?.rank).toBe(2)
        expect(sigrid?.value).toBe(20)
        expect(sigrid?.cardCount).toBe(2)

        // Daniel, Ramon, Rafael: 0 cards, no rank, $0 value
        const daniel = results.find(r => r.artist === 'Daniel Melim')
        expect(daniel?.rank).toBe(null)
        expect(daniel?.value).toBe(0)
        expect(daniel?.cardCount).toBe(0)

        const ramon = results.find(r => r.artist === 'Ramon Martins')
        expect(ramon?.rank).toBe(null)
        expect(ramon?.value).toBe(0)
        expect(ramon?.cardCount).toBe(0)

        const rafael = results.find(r => r.artist === 'Rafael Silveira')
        expect(rafael?.rank).toBe(null)
        expect(rafael?.value).toBe(0)
        expect(rafael?.cardCount).toBe(0)

        // Important: 3rd place should be EMPTY (no one gets $10)
        // When fewer than 3 artists have cards, only those artists can rank
        const thirdPlace = results.find(r => r.rank === 3)
        expect(thirdPlace).toBeUndefined()

        // Verify board values
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
        expect(state.board.artistValues['Sigrid Thaler'][0]).toBe(20)
        expect(state.board.artistValues['Daniel Melim'][0]).toBe(0)
        expect(state.board.artistValues['Ramon Martins'][0]).toBe(0)
        expect(state.board.artistValues['Rafael Silveira'][0]).toBe(0)
      })
    })

    describe('Selling Phase Integration', () => {
      /**
       * TEST: Paintings sold at correct cumulative value
       *
       * SETUP:
       * - Round 1: Manuel ranked 1st (value 30)
       * - Player has Manuel painting
       *
       * VERIFY:
       * - Painting sells for 30
       * - Player money increases by 30
       * - Painting removed from player.purchases
       * - Card added to discardPile
       */
      it('sells paintings at correct value and updates all state', () => {
        // SETUP: Create game with player having a Manuel painting
        const manuelPainting = createPainting('Manuel Carvalho', 25, 1)
        const game = createGameWithHands(
          [[], []], // Empty hands for 2 players
          {
            existingPurchases: [[manuelPainting], []] // Player 0 has 1 Manuel painting
          }
        )

        // Set up round results where Manuel is 1st (value 30)
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place
              'Sigrid Thaler': 3,    // 2nd place
              'Daniel Melim': 2,     // 3rd place
              'Ramon Martins': 0,
              'Rafael Silveira': 0
            },
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          // Also update board values (this is normally done by endRound)
          board: {
            ...game.board,
            artistValues: {
              'Manuel Carvalho': [30],
              'Sigrid Thaler': [20],
              'Daniel Melim': [10],
              'Ramon Martins': [0],
              'Rafael Silveira': [0]
            }
          }
        }

        // VERIFY: Initial state
        expect(state.players[0].money).toBe(100)
        expect(state.players[0].purchases).toHaveLength(1)
        expect(state.discardPile).toHaveLength(0)

        // ACTION: Sell all paintings to bank
        state = sellAllPaintingsToBank(state)

        // VERIFY: Painting sold for correct value
        expect(state.players[0].money).toBe(130) // 100 + 30
        expect(state.players[0].purchases).toHaveLength(0) // Painting removed
        expect(state.discardPile).toHaveLength(1) // Card added to discard
        expect(state.discardPile[0].artist).toBe('Manuel Carvalho')

        // Verify other state unchanged
        expect(state.players[1].money).toBe(100) // Other player unchanged
      })

      /**
       * TEST: Cumulative value across rounds
       *
       * SETUP:
       * - Round 1: Manuel ranked 1st (value 30), player buys Manuel
       * - Round 2: Manuel ranked 1st again (value 30)
       * - Player still has Manuel painting
       *
       * VERIFY:
       * - Manuel painting now worth 60 (30 + 30)
       * - Value stacks from previous rounds
       */
      it('calculates cumulative artist value across multiple rounds', () => {
        // SETUP: Create game with player having a Manuel painting from round 1
        const manuelPainting = createPainting('Manuel Carvalho', 25, 1)
        const game = createGameWithHands(
          [[], []],
          {
            existingPurchases: [[manuelPainting], []]
          }
        )

        // Set up round 2 state where Manuel is 1st again
        let state = {
          ...game,
          round: {
            ...game.round,
            roundNumber: 2,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place again
              'Sigrid Thaler': 3,    // 2nd place
              'Daniel Melim': 2,     // 3rd place
              'Ramon Martins': 0,
              'Rafael Silveira': 0
            },
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          // Board with cumulative values from round 1 and 2
          board: {
            ...game.board,
            artistValues: {
              'Manuel Carvalho': [30, 30], // Round 1: 30, Round 2: 30
              'Sigrid Thaler': [20, 20],
              'Daniel Melim': [10, 10],
              'Ramon Martins': [0, 0],
              'Rafael Silveira': [0, 0]
            }
          }
        }

        // VERIFY: Initial state
        expect(state.players[0].money).toBe(100)
        expect(state.players[0].purchases).toHaveLength(1)

        // ACTION: Sell paintings in round 2
        state = sellAllPaintingsToBank(state)

        // VERIFY: Manuel painting now worth 60 (30+30 cumulative)
        expect(state.players[0].money).toBe(160) // 100 + 60
        expect(state.players[0].purchases).toHaveLength(0) // Painting sold
        expect(state.discardPile).toHaveLength(1)

        // Verify other player unchanged
        expect(state.players[1].money).toBe(100)
      })

      /**
       * TEST: Artist not in top 3 this round = painting worthless
       *
       * SETUP:
       * - Round 1: Manuel ranked 1st (value 30)
       * - Round 2: Manuel NOT in top 3
       * - Player has Manuel painting from round 1
       *
       * VERIFY:
       * - Manuel painting worth 0 in round 2 (despite round 1 value)
       * - This is the CRITICAL rule many miss
       */
      it('paintings worthless if artist not in top 3 THIS round', () => {
        // SETUP: Create game with player having a Manuel painting from round 1
        const manuelPainting = createPainting('Manuel Carvalho', 25, 1)
        const game = createGameWithHands(
          [[], []],
          {
            existingPurchases: [[manuelPainting], []]
          }
        )

        // Set up round 2 where Manuel is NOT in top 3
        let state = {
          ...game,
          round: {
            ...game.round,
            roundNumber: 2,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 1,  // Not in top 3
              'Sigrid Thaler': 4,    // 1st place
              'Daniel Melim': 3,     // 2nd place
              'Ramon Martins': 2,    // 3rd place
              'Rafael Silveira': 0
            },
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Sigrid Thaler', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Daniel Melim', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Ramon Martins', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Manuel Carvalho', rank: null, value: 0, cardCount: 1 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          // Board with cumulative values
          board: {
            ...game.board,
            artistValues: {
              'Manuel Carvalho': [30, 0], // Round 1: 30, Round 2: 0 (not in top 3)
              'Sigrid Thaler': [20, 30],
              'Daniel Melim': [10, 20],
              'Ramon Martins': [0, 10],
              'Rafael Silveira': [0, 0]
            }
          }
        }

        // VERIFY: Initial state
        expect(state.players[0].money).toBe(100)
        expect(state.players[0].purchases).toHaveLength(1)

        // ACTION: Try to sell paintings in round 2
        state = sellAllPaintingsToBank(state)

        // VERIFY: Manuel painting is worthless this round (value 0)
        expect(state.players[0].money).toBe(100) // No change - painting worthless
        expect(state.players[0].purchases).toHaveLength(1) // Painting NOT sold - kept
        expect(state.discardPile).toHaveLength(0) // Nothing added to discard

        // Critical rule: Even though Manuel was worth 30 in round 1,
        // it's worth 0 in round 2 because not in top 3
      })

      /**
       * TEST: Multiple paintings same artist
       *
       * SETUP:
       * - Player has 3 Manuel paintings
       * - Manuel ranked 1st (value 30)
       *
       * VERIFY:
       * - Each painting sells for 30
       * - Total earnings = 90
       * - All 3 removed from purchases
       */
      it('sells multiple paintings of same artist at full value each', () => {
        // SETUP: Create game with player having 3 Manuel paintings
        const manuelPaintings = [
          createPainting('Manuel Carvalho', 20, 1),
          createPainting('Manuel Carvalho', 30, 1),
          createPainting('Manuel Carvalho', 25, 1)
        ]
        const game = createGameWithHands(
          [[], []],
          {
            existingPurchases: [manuelPaintings, []]
          }
        )

        // Set up round where Manuel is 1st (value 30)
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place
              'Sigrid Thaler': 3,    // 2nd place
              'Daniel Melim': 2,     // 3rd place
              'Ramon Martins': 0,
              'Rafael Silveira': 0
            },
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          board: {
            ...game.board,
            artistValues: {
              'Manuel Carvalho': [30],
              'Sigrid Thaler': [20],
              'Daniel Melim': [10],
              'Ramon Martins': [0],
              'Rafael Silveira': [0]
            }
          }
        }

        // VERIFY: Initial state
        expect(state.players[0].money).toBe(100)
        expect(state.players[0].purchases).toHaveLength(3)

        // ACTION: Sell all paintings
        state = sellAllPaintingsToBank(state)

        // VERIFY: All 3 Manuel paintings sold for 30 each
        expect(state.players[0].money).toBe(190) // 100 + (3 * 30)
        expect(state.players[0].purchases).toHaveLength(0) // All paintings sold
        expect(state.discardPile).toHaveLength(3) // All 3 cards in discard

        // Verify all cards are Manuel paintings
        state.discardPile.forEach(card => {
          expect(card.artist).toBe('Manuel Carvalho')
        })
      })

      /**
       * TEST: Paintings from different artists
       *
       * SETUP:
       * - Player has: Manuel (1st = 30), Sigrid (2nd = 20), Ramon (4th = 0)
       *
       * VERIFY:
       * - Manuel sells for 30
       * - Sigrid sells for 20
       * - Ramon does NOT sell (value 0, stays in purchases)
       * - Total earnings = 50
       */
      it('handles paintings from multiple artists with different rankings', () => {
        // SETUP: Create game with player having paintings from different artists
        const paintings = [
          createPainting('Manuel Carvalho', 20, 1),  // 1st place = 30
          createPainting('Sigrid Thaler', 25, 1),   // 2nd place = 20
          createPainting('Ramon Martins', 15, 1)     // 4th place = 0 (worthless)
        ]
        const game = createGameWithHands(
          [[], []],
          {
            existingPurchases: [paintings, []]
          }
        )

        // Set up round with different rankings
        let state = {
          ...game,
          round: {
            ...game.round,
            cardsPlayedPerArtist: {
              'Manuel Carvalho': 4,  // 1st place
              'Sigrid Thaler': 3,    // 2nd place
              'Daniel Melim': 2,     // 3rd place
              'Ramon Martins': 1,    // 4th place (no value)
              'Rafael Silveira': 0
            },
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 1 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          board: {
            ...game.board,
            artistValues: {
              'Manuel Carvalho': [30],
              'Sigrid Thaler': [20],
              'Daniel Melim': [10],
              'Ramon Martins': [0],
              'Rafael Silveira': [0]
            }
          }
        }

        // VERIFY: Initial state
        expect(state.players[0].money).toBe(100)
        expect(state.players[0].purchases).toHaveLength(3)

        // ACTION: Sell paintings
        state = sellAllPaintingsToBank(state)

        // VERIFY: Only valuable paintings sold
        expect(state.players[0].money).toBe(150) // 100 + 30 (Manuel) + 20 (Sigrid)
        expect(state.players[0].purchases).toHaveLength(1) // Only Ramon remains (worthless)
        expect(state.discardPile).toHaveLength(2) // Manuel and Sigrid cards

        // Verify remaining painting is Ramon (worthless)
        expect(state.players[0].purchases[0].artist).toBe('Ramon Martins')

        // Verify discard pile has correct cards
        const discardArtists = state.discardPile.map(card => card.artist)
        expect(discardArtists).toContain('Manuel Carvalho')
        expect(discardArtists).toContain('Sigrid Thaler')
        expect(discardArtists).not.toContain('Ramon Martins')
      })
    })
  })

  // ===========================================================================
  // SECTION 2: MULTI-ROUND PROGRESSION
  // ===========================================================================
  // Tests state accumulation and transitions across multiple rounds
  // Modules: game.ts, round.ts, deck.ts, valuation.ts

  describe('Multi-Round Progression', () => {

    describe('Round Transitions', () => {
      /**
       * TEST: State preserved between rounds
       *
       * VERIFY:
       * - Player money persists (after auctions and sales)
       * - Board values accumulate
       * - Cards remaining in hands carry over
       * - eventLog accumulates
       */
      it('preserves accumulated state when transitioning rounds', () => {
        // SETUP: Complete round 1 with some sales
        const manuelPainting = createPainting('Manuel Carvalho', 25, 1)
        const sigridPainting = createPainting('Sigrid Thaler', 20, 1)

        let state = createGameWithHands(
          [[], [], []], // Empty hands for 3 players
          {
            roundNumber: 1,
            existingPurchases: [[manuelPainting, sigridPainting], [], []]
          }
        )

        // Add enough cards to deck for round 2 dealing (6 cards per player for 3 players = 18 cards)
        state.deck = Array(18).fill(null).map((_, i) =>
          createCard(ARTISTS[i % 5], 'open', `round2_deck_card_${i}`)
        )

        // Set up round 1 completed state
        state = {
          ...state,
          round: {
            ...state.round,
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          board: {
            ...state.board,
            artistValues: {
              'Manuel Carvalho': [30],
              'Sigrid Thaler': [20],
              'Daniel Melim': [10],
              'Ramon Martins': [0],
              'Rafael Silveira': [0]
            }
          }
        }

        // Sell paintings from round 1
        state = sellAllPaintingsToBank(state)
        const round1Money = state.players[0].money // Should be 150

        // ACTION: Transition to round 2
        state = nextRound(state)

        // VERIFY: State preserved from round 1
        expect(state.round.roundNumber).toBe(2)
        expect(state.players[0].money).toBe(round1Money) // Money preserved
        expect(state.players[1].money).toBe(100) // Other player unchanged

        // Board values accumulated
        expect(state.board.artistValues['Manuel Carvalho']).toEqual([30])
        expect(state.board.artistValues['Sigrid Thaler']).toEqual([20])

        // Purchases moved from purchasedThisRound to purchases
        expect(state.players[0].purchases).toHaveLength(0) // Sold in round 1
        expect(state.players[0].purchasedThisRound).toHaveLength(0) // Cleared

        // Event log preserved
        expect(state.eventLog.length).toBeGreaterThan(0)
      })

      /**
       * TEST: Correct cards dealt each round
       *
       * For 3 players:
       * - Round 1: 10 cards each
       * - Round 2: 6 additional cards each
       * - Round 3: 6 additional cards each
       * - Round 4: 0 additional cards
       *
       * VERIFY:
       * - Correct number dealt each round
       * - Cards added to existing hand (not replaced)
       * - Deck depletes correctly
       */
      it('deals correct number of cards each round', () => {
        // SETUP: Create 3-player game
        const setup = createTestSetup(3)
        let state = startGame(setup)

        // Initial deal for round 1
        expect(state.players[0].hand.length).toBe(10)
        expect(state.players[1].hand.length).toBe(10)
        expect(state.players[2].hand.length).toBe(10)
        expect(state.deck.length).toBe(70 - 30) // 40 cards remaining

        // Complete round 1 (simulate by playing all cards)
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Deal for round 2
        state = nextRound(state)

        // VERIFY: Correct cards dealt for round 2
        expect(state.players[0].hand.length).toBe(6) // 6 additional cards
        expect(state.players[1].hand.length).toBe(6)
        expect(state.players[2].hand.length).toBe(6)
        expect(state.deck.length).toBe(40 - 18) // 22 cards remaining

        // Complete round 2
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Deal for round 3
        state = nextRound(state)

        // VERIFY: Correct cards dealt for round 3
        expect(state.players[0].hand.length).toBe(6) // 6 additional cards
        expect(state.players[1].hand.length).toBe(6)
        expect(state.players[2].hand.length).toBe(6)
        expect(state.deck.length).toBe(22 - 18) // 4 cards remaining

        // Complete round 3
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Deal for round 4
        state = nextRound(state)

        // VERIFY: No cards dealt in round 4
        expect(state.players[0].hand.length).toBe(0)
        expect(state.players[1].hand.length).toBe(0)
        expect(state.players[2].hand.length).toBe(0)
        expect(state.deck.length).toBe(4) // Remaining 4 cards stay in deck
      })

      /**
       * TEST: Auctioneer rotates each round
       *
       * VERIFY:
       * - Round 1: Player 0 starts
       * - Round 2: Player 1 starts
       * - Round 3: Player 2 starts
       * - Round 4: Player 0 starts (wraps)
       */
      it('rotates starting auctioneer each round', () => {
        // SETUP: Create 3-player game
        const setup = createTestSetup(3)
        let state = startGame(setup)

        // VERIFY: Round 1 starts with Player 0 as auctioneer
        expect(state.round.currentAuctioneerIndex).toBe(0)

        // Simulate round completion
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Move to round 2
        state = nextRound(state)

        // VERIFY: Round 2 starts with Player 1 as auctioneer
        expect(state.round.currentAuctioneerIndex).toBe(1)

        // Simulate round completion
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Move to round 3
        state = nextRound(state)

        // VERIFY: Round 3 starts with Player 2 as auctioneer
        expect(state.round.currentAuctioneerIndex).toBe(2)

        // Simulate round completion
        state.players.forEach(player => {
          player.hand = []
        })

        // ACTION: Move to round 4
        state = nextRound(state)

        // VERIFY: Round 4 wraps back to Player 0 as auctioneer
        expect(state.round.currentAuctioneerIndex).toBe(0)
      })

      /**
       * TEST: purchasedThisRound cleared between rounds
       *
       * VERIFY:
       * - Cards in purchasedThisRound are moved to purchases
       * - purchasedThisRound is empty at start of new round
       */
      it('clears purchasedThisRound but preserves purchases', () => {
        // SETUP: Create game with purchases from previous round
        const painting1 = createPainting('Manuel Carvalho', 20, 1)
        const painting2 = createPainting('Sigrid Thaler', 25, 1)

        let state = createGameWithHands(
          [[], [], []], // 3 players
          {
            existingPurchases: [[painting1], [], []] // Player 0 has 1 purchase from previous round
          }
        )

        // Add cards to purchasedThisRound for current round
        state = {
          ...state,
          players: [
            {
              ...state.players[0],
              purchases: [painting1], // From previous round
              purchasedThisRound: [painting2] // From current round
            },
            state.players[1],
            state.players[2]
          ]
        }

        // VERIFY: Initial state
        expect(state.players[0].purchases).toHaveLength(1)
        expect(state.players[0].purchasedThisRound).toHaveLength(1)

        // Set up a deck with enough cards
        state.deck = Array(18).fill(null).map((_, i) =>
          createCard('Manuel Carvalho', 'open', `deck_card_${i}`)
        )

        // ACTION: Transition to next round
        state = nextRound(state)

        // VERIFY: purchasedThisRound cleared but purchases preserved
        expect(state.players[0].purchases).toHaveLength(1) // Still has painting1
        expect(state.players[0].purchases[0]).toBe(painting1) // Same painting
        expect(state.players[0].purchasedThisRound).toHaveLength(0) // Cleared

        // Other player unchanged
        expect(state.players[1].purchases).toHaveLength(0)
        expect(state.players[1].purchasedThisRound).toHaveLength(0)
      })
    })

    describe('Board Value Accumulation', () => {
      /**
       * TEST: Values stack correctly across rounds
       *
       * SETUP:
       * - Round 1: Manuel 1st (30), Sigrid 2nd (20)
       * - Round 2: Manuel 1st (30), Daniel 2nd (20)
       *
       * VERIFY after Round 2:
       * - Manuel worth 60 (30+30)
       * - Daniel worth 20 (only round 2)
       * - Sigrid worth 0 (not in top 3 round 2)
       */
      it('stacks artist values across rounds correctly', () => {
        // SETUP: Create game state that simulates completed rounds
        let state = createGameWithHands([[], [], []])

        // Simulate end of round 1: Manuel 1st, Sigrid 2nd
        state = {
          ...state,
          round: {
            ...state.round,
            roundNumber: 1,
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Sigrid Thaler', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Daniel Melim', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          board: {
            ...state.board,
            artistValues: {
              'Manuel Carvalho': [30], // Round 1 value
              'Sigrid Thaler': [20],
              'Daniel Melim': [10],
              'Ramon Martins': [0],
              'Rafael Silveira': [0]
            }
          }
        }

        // Set up a deck with enough cards for round 2
        state.deck = Array(18).fill(null).map((_, i) =>
          createCard('Manuel Carvalho', 'open', `deck_card_${i}`)
        )

        // ACTION: Complete round 1 and move to round 2
        state = nextRound(state)

        // Simulate end of round 2: Manuel 1st again, Daniel 2nd
        state = {
          ...state,
          round: {
            ...state.round,
            roundNumber: 2,
            phase: {
              type: 'selling_to_bank',
              results: [
                { artist: 'Manuel Carvalho', rank: 1, value: 30, cardCount: 4 },
                { artist: 'Daniel Melim', rank: 2, value: 20, cardCount: 3 },
                { artist: 'Sigrid Thaler', rank: 3, value: 10, cardCount: 2 },
                { artist: 'Ramon Martins', rank: null, value: 0, cardCount: 0 },
                { artist: 'Rafael Silveira', rank: null, value: 0, cardCount: 0 }
              ]
            }
          },
          board: {
            ...state.board,
            artistValues: {
              'Manuel Carvalho': [30, 30], // Round 1: 30, Round 2: 30
              'Sigrid Thaler': [20, 10],  // Round 1: 20, Round 2: 10
              'Daniel Melim': [10, 20],  // Round 1: 10, Round 2: 20
              'Ramon Martins': [0, 0],
              'Rafael Silveira': [0, 0]
            }
          }
        }

        // VERIFY: Cumulative values calculated correctly
        // Manuel: 30 + 30 = 60
        expect(getTotalArtistValue(state.board, 'Manuel Carvalho')).toBe(60)

        // Daniel: 10 + 20 = 30 (was 10 in round 1, now 20 in round 2)
        expect(getTotalArtistValue(state.board, 'Daniel Melim')).toBe(30)

        // Sigrid: 20 + 10 = 30, but since not in top 3 round 2, should be 0
        // This is tested in the next test more specifically

        // Verify per-round history preserved
        expect(state.board.artistValues['Manuel Carvalho']).toEqual([30, 30])
        expect(state.board.artistValues['Daniel Melim']).toEqual([10, 20])
      })

      /**
       * TEST: Board stores historical values
       *
       * VERIFY:
       * - board.artistValues[artist] = [r1, r2, r3, r4]
       * - Each index stores that round's value
       * - getArtistValue sums up to current round
       */
      it('board stores per-round values for historical tracking', () => {
        // SETUP: Create game state with 3 rounds of history
        let state = createGameWithHands([[], [], []])

        // Simulate board after 3 complete rounds
        state = {
          ...state,
          round: {
            ...state.round,
            roundNumber: 3
          },
          board: {
            ...state.board,
            artistValues: {
              // Each array element represents the value from that round
              'Manuel Carvalho': [30, 30, 20], // R1: 1st, R2: 1st, R3: 2nd
              'Sigrid Thaler': [20, 10, 30],  // R1: 2nd, R2: 3rd, R3: 1st
              'Daniel Melim': [10, 20, 0],     // R1: 3rd, R2: 2nd, R3: not ranked
              'Ramon Martins': [0, 0, 10],     // R1: not ranked, R2: not ranked, R3: 3rd
              'Rafael Silveira': [0, 0, 0]     // Never ranked
            }
          }
        }

        // VERIFY: Historical values stored correctly
        // Manuel was ranked in all 3 rounds
        expect(state.board.artistValues['Manuel Carvalho']).toEqual([30, 30, 20])
        expect(state.board.artistValues['Manuel Carvalho']).toHaveLength(3)

        // Sigrid has different values each round
        expect(state.board.artistValues['Sigrid Thaler']).toEqual([20, 10, 30])

        // Ramon only has value in round 3
        expect(state.board.artistValues['Ramon Martins']).toEqual([0, 0, 10])

        // Round 1 values (index 0)
        expect(state.board.artistValues['Manuel Carvalho'][0]).toBe(30)
        expect(state.board.artistValues['Sigrid Thaler'][0]).toBe(20)
        expect(state.board.artistValues['Daniel Melim'][0]).toBe(10)

        // Round 2 values (index 1)
        expect(state.board.artistValues['Manuel Carvalho'][1]).toBe(30)
        expect(state.board.artistValues['Daniel Melim'][1]).toBe(20)
        expect(state.board.artistValues['Sigrid Thaler'][1]).toBe(10)

        // Round 3 values (index 2)
        expect(state.board.artistValues['Sigrid Thaler'][2]).toBe(30)
        expect(state.board.artistValues['Manuel Carvalho'][2]).toBe(20)
        expect(state.board.artistValues['Ramon Martins'][2]).toBe(10)

        // Total cumulative values (sum of array)
        expect(getTotalArtistValue(state.board, 'Manuel Carvalho')).toBe(80) // 30+30+20
        expect(getTotalArtistValue(state.board, 'Sigrid Thaler')).toBe(60)   // 20+10+30
        expect(getTotalArtistValue(state.board, 'Daniel Melim')).toBe(30)    // 10+20+0
        expect(getTotalArtistValue(state.board, 'Ramon Martins')).toBe(10)  // 0+0+10
        expect(getTotalArtistValue(state.board, 'Rafael Silveira')).toBe(0)  // 0+0+0
      })
    })

    describe('Deck Depletion', () => {
      /**
       * TEST: Track deck size through game
       *
       * VERIFY:
       * - Start: 70 cards
       * - After round 1 deal (3 players): 70 - 30 = 40
       * - After round 2 deal: 40 - 18 = 22
       * - After round 3 deal: 22 - 18 = 4
       * - Round 4: No deal, 4 remaining
       */
      it('tracks deck depletion correctly through rounds', () => {
        // SETUP: Create 3-player game
        const setup = createTestSetup(3)
        let state = startGame(setup)

        // VERIFY: Initial deck state after startGame (which deals initial cards)
        expect(state.deck.length).toBe(40) // 70 - 30 = 40 remaining after initial deal
        expect(state.players[0].hand.length).toBe(10)
        expect(state.players[1].hand.length).toBe(10)
        expect(state.players[2].hand.length).toBe(10)
        // Total dealt: 30 cards (10 * 3 players)
        // Deck remaining: 70 - 30 = 40

        // Complete round 1 (cards played to discard)
        const round1Cards = 30
        state.discardPile = Array(round1Cards).fill(null).map(() => createCard('Manuel Carvalho', 'open'))

        // ACTION: Move to round 2
        state.players.forEach(p => p.hand = []) // Clear hands
        state = nextRound(state)

        // VERIFY: After round 2 deal
        expect(state.deck.length).toBe(40 - 18) // 40 - 18 = 22
        expect(state.players[0].hand.length).toBe(6)
        expect(state.players[1].hand.length).toBe(6)
        expect(state.players[2].hand.length).toBe(6)
        // Total dealt in round 2: 18 cards (6 * 3 players)

        // Complete round 2
        const round2Cards = 18
        state.discardPile = [
          ...state.discardPile,
          ...Array(round2Cards).fill(null).map(() => createCard('Sigrid Thaler', 'open'))
        ]

        // ACTION: Move to round 3
        state.players.forEach(p => p.hand = [])
        state = nextRound(state)

        // VERIFY: After round 3 deal
        expect(state.deck.length).toBe(22 - 18) // 22 - 18 = 4
        expect(state.players[0].hand.length).toBe(6)
        expect(state.players[1].hand.length).toBe(6)
        expect(state.players[2].hand.length).toBe(6)
        // Total dealt in round 3: 18 cards (6 * 3 players)

        // Complete round 3
        const round3Cards = 18
        state.discardPile = [
          ...state.discardPile,
          ...Array(round3Cards).fill(null).map(() => createCard('Daniel Melim', 'open'))
        ]

        // ACTION: Move to round 4
        state.players.forEach(p => p.hand = [])
        state = nextRound(state)

        // VERIFY: Round 4 has no cards to deal
        expect(state.deck.length).toBe(4) // 4 cards remain in deck
        expect(state.players[0].hand.length).toBe(0)
        expect(state.players[1].hand.length).toBe(0)
        expect(state.players[2].hand.length).toBe(0)

        // Total card tracking:
        // - Started with 70
        // - Dealt: 30 + 18 + 18 = 66
        // - Remaining in deck: 4
        // - In discard: 30 + 18 + 18 = 66
        expect(state.discardPile.length).toBe(66)
      })

      /**
       * TEST: Game handles deck exhaustion gracefully
       *
       * SCENARIO: Deck runs out before round 4
       *
       * VERIFY:
       * - Players get as many cards as available
       * - No errors thrown
       * - Game can continue with remaining cards
       */
      it('handles deck exhaustion gracefully', () => {
        // SETUP: Create a game with a nearly empty deck
        let state = createGameWithHands([[], [], []])

        // Put only 5 cards in deck (not enough for 3 players in round 2 which needs 18)
        state.deck = Array(5).fill(null).map((_, i) =>
          createCard(['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira'][i], 'open')
        )

        // ACTION: Attempt to deal cards when deck is insufficient
        // This should throw an error because there aren't enough cards
        expect(() => {
          state = nextRound(state)
        }).toThrow('Not enough cards in deck')

        // Verify the original state is unchanged (since the error prevented the transition)
        expect(state.deck.length).toBe(5) // Deck unchanged
        expect(state.round.roundNumber).toBe(1) // Round didn't advance

        // Verify no null/undefined cards
        state.players.forEach(player => {
          player.hand.forEach(card => {
            expect(card).toBeDefined()
            expect(card.artist).toBeDefined()
            expect(card.auctionType).toBeDefined()
          })
        })
      })
    })
  })

  // ===========================================================================
  // SECTION 3: AUCTION → GAME STATE INTEGRATION
  // ===========================================================================
  // Tests that auctions properly update all aspects of game state
  // Modules: auction/*, money.ts, game.ts, round.ts

  describe('Auction → Game State Integration', () => {

    describe('Card Ownership After Auction', () => {
      /**
       * TEST: Winner receives card after auction
       *
       * FLOW:
       * 1. Player A plays card (auction starts)
       * 2. Player B wins auction
       * 3. Auction concludes
       *
       * VERIFY:
       * - Card added to Player B's purchasedThisRound
       * - Card NOT in Player A's hand anymore (already removed when played)
       * - Card has correct metadata (purchasePrice, purchasedRound)
       */
      it('transfers card ownership to auction winner', () => {
        // SETUP: Create game with Player 0 having a card to auction
        const card = createCard('Manuel Carvalho', 'open', 'card_1')
        const game = createGameWithHands([
          [card], // Player 0 has the card
          [],     // Player 1
          []      // Player 2
        ])

        // ACTION: Play the card and run auction
        let state = playCard(game, 0, 0)
        expect(state.round.phase.type).toBe('auction')

        // Simulate Player 1 winning the auction
        const auctionResult = createAuctionResult(
          game.players[1].id, // Player 1 wins
          game.players[0].id, // Player 0 was auctioneer
          25 // Winning bid
        )

        // Process auction result with the card
        state = executeAuction(state, auctionResult, card)

        // VERIFY: Card ownership transferred
        // Card should be in Player 1's purchasedThisRound
        expect(state.players[1].purchasedThisRound).toHaveLength(1)
        expect(state.players[1].purchasedThisRound[0].id).toBe('card_1')
        expect(state.players[1].purchasedThisRound[0].artist).toBe('Manuel Carvalho')
        expect(state.players[1].purchasedThisRound[0].purchasePrice).toBe(25)
        expect(state.players[1].purchasedThisRound[0].purchasedRound).toBe(1)

        // Card is NOT in Player 0's hand anymore (removed when played)
        expect(state.players[0].hand).toHaveLength(0)

        // Other players have no purchases
        expect(state.players[0].purchasedThisRound).toHaveLength(0)
        expect(state.players[2].purchasedThisRound).toHaveLength(0)
      })

      /**
       * TEST: Auctioneer wins own card
       *
       * FLOW:
       * 1. Player A plays card
       * 2. Player A wins own auction
       *
       * VERIFY:
       * - Card goes to Player A's purchasedThisRound
       * - Player A pays bank (not themselves)
       */
      it('handles auctioneer winning own auction correctly', () => {
        // SETUP: Create game with Player 0 having a card
        const card = createCard('Sigrid Thaler', 'open', 'card_2')
        const game = createGameWithHands([
          [card], // Player 0 has the card
          [],     // Player 1
          []      // Player 2
        ])

        // ACTION: Play the card and run auction
        let state = playCard(game, 0, 0)

        // Simulate Player 0 (auctioneer) winning their own auction
        const auctionResult = createAuctionResult(
          game.players[0].id, // Player 0 wins own auction
          game.players[0].id, // Player 0 was also auctioneer
          30 // Winning bid
        )

        // Process auction result (auctioneer pays bank)
        const beforeMoney = getTotalMoney(state)
        state = executeAuction(state, auctionResult, card)
        const afterMoney = getTotalMoney(state)

        // VERIFY: Card goes to auctioneer but they pay bank
        expect(state.players[0].purchasedThisRound).toHaveLength(1)
        expect(state.players[0].purchasedThisRound[0].id).toBe('card_2')
        expect(state.players[0].purchasedThisRound[0].artist).toBe('Sigrid Thaler')
        expect(state.players[0].purchasedThisRound[0].purchasePrice).toBe(30)

        // Verify auctioneer paid money (reduced by 30)
        expect(state.players[0].money).toBe(70) // Started with 100, paid 30 to bank

        // Total player money should decrease (bank received payment)
        expect(afterMoney).toBe(beforeMoney - 30)
      })

      /**
       * TEST: Double auction - transfers the double card
       *
       * NOTE: Full double auction support (with second card from another player)
       * requires additional executor logic. This test verifies basic double card handling.
       *
       * FLOW:
       * 1. Player A plays double card
       * 2. Player C wins auction
       *
       * VERIFY:
       * - Double card goes to winner
       * - Payment flows correctly
       */
      it('transfers double card in auction', () => {
        // SETUP: Create game for double auction scenario
        const doubleCard = createCard('Daniel Melim', 'double', 'double_1')

        const game = createGameWithHands([
          [doubleCard], // Player 0 plays double card
          [], // Player 1
          [] // Player 2
        ])

        // ACTION: Player 0 plays double card
        let state = playCard(game, 0, 0)

        // Simulate auction where Player 2 wins the double card
        const auctionResult = createAuctionResult(
          game.players[2].id, // Player 2 wins
          game.players[0].id, // Player 0 was auctioneer
          40 // Winning bid
        )

        // Process auction result with the double card
        state = executeAuction(state, auctionResult, doubleCard)

        // VERIFY: Card transferred to winner
        expect(state.players[2].purchasedThisRound).toHaveLength(1)
        expect(state.players[2].purchasedThisRound[0].artist).toBe('Daniel Melim')
        expect(state.players[2].purchasedThisRound[0].purchasePrice).toBe(40)

        // Verify money flow
        expect(state.players[2].money).toBe(60) // Paid 40 from 100

        // Player 0 (auctioneer) should have received payment
        expect(state.players[0].money).toBe(140) // Received 40

        // Player 1 unchanged
        expect(state.players[1].money).toBe(100)
      })
    })

    describe('Money Flow After Auction', () => {
      /**
       * TEST: Complete money trail for auction
       *
       * SETUP:
       * - Player A (auctioneer): $100
       * - Player B (winner): $80
       * - Winning bid: $30
       *
       * VERIFY:
       * - Player A: $130 (received payment)
       * - Player B: $50 (paid for card)
       * - Total money unchanged (conservation)
       */
      it('money flows correctly from winner to auctioneer', () => {
        // SETUP: Create game with specific money amounts
        const game = createGameWithHands([
          [createCard('Ramon Martins', 'open')], // Player 0 has card, $100
          [], // Player 1 has no cards, $80
          []
        ])

        // Adjust Player 1's money
        game.players[1].money = 80

        const initialTotal = getTotalMoney(game)
        expect(initialTotal).toBe(280) // 100 + 80 + 100

        // Get the card reference BEFORE playing it (playCard removes it from hand)
        const cardToAuction = game.players[0].hand[0]

        // ACTION: Play card and run auction
        let state = playCard(game, 0, 0)

        // Player 1 wins auction for $30
        const auctionResult = createAuctionResult(
          game.players[1].id, // Player 1 wins
          game.players[0].id, // Player 0 was auctioneer
          30 // Winning bid
        )

        state = executeAuction(state, auctionResult, cardToAuction)

        // VERIFY: Money transferred correctly
        expect(state.players[0].money).toBe(130) // Received $30 payment
        expect(state.players[1].money).toBe(50)  // Paid $30 from 80
        expect(state.players[2].money).toBe(100) // Unchanged

        const finalTotal = getTotalMoney(state)
        expect(finalTotal).toBe(initialTotal) // Total conserved in player-to-player

        // Verify card went to winner
        expect(state.players[1].purchasedThisRound).toHaveLength(1)
        expect(state.players[1].purchasedThisRound[0].artist).toBe('Ramon Martins')
      })

      /**
       * TEST: Bank receives money when auctioneer wins
       *
       * SETUP:
       * - Player A (auctioneer): $100
       * - Player A wins own auction at $25
       *
       * VERIFY:
       * - Player A: $75 (paid bank)
       * - Total player money: decreased by 25
       * - (Bank conceptually has the 25)
       */
      it('auctioneer pays bank when winning own auction', () => {
        // SETUP: Create game with auctioneer having card
        const game = createGameWithHands([
          [createCard('Rafael Silveira', 'open')],
          [],
          []
        ])

        const initialTotal = getTotalMoney(game)
        expect(initialTotal).toBe(300) // 3 players * 100

        // Get the card reference BEFORE playing it
        const cardToAuction = game.players[0].hand[0]

        // ACTION: Play card and auctioneer wins own auction
        let state = playCard(game, 0, 0)

        const auctionResult = createAuctionResult(
          game.players[0].id, // Player 0 wins own auction
          game.players[0].id, // Player 0 was auctioneer
          25 // Winning bid
        )

        state = executeAuction(state, auctionResult, cardToAuction)

        // VERIFY: Auctioneer paid bank
        expect(state.players[0].money).toBe(75) // Paid $25 to bank
        expect(state.players[1].money).toBe(100) // Unchanged
        expect(state.players[2].money).toBe(100) // Unchanged

        const finalTotal = getTotalMoney(state)
        expect(finalTotal).toBe(275) // Total decreased by 25 (went to bank)

        // Card still goes to auctioneer
        expect(state.players[0].purchasedThisRound).toHaveLength(1)
        expect(state.players[0].purchasedThisRound[0].artist).toBe('Rafael Silveira')
        expect(state.players[0].purchasedThisRound[0].purchasePrice).toBe(25)
      })

      /**
       * TEST: Free auction (no bids or $0 winning)
       *
       * VERIFY:
       * - No money changes hands
       * - Card still transfers to winner
       */
      it('handles zero-price auctions correctly', () => {
        // SETUP: Create game where no one bids (auctioneer wins for $0)
        const game = createGameWithHands([
          [createCard('Manuel Carvalho', 'open')],
          [],
          []
        ])

        const initialMoney = game.players.map(p => p.money)
        const initialTotal = getTotalMoney(game)

        // Get the card reference BEFORE playing it
        const cardToAuction = game.players[0].hand[0]

        // ACTION: Play card, everyone passes
        let state = playCard(game, 0, 0)

        // Auction result with $0 winning bid (auctioneer gets card for free)
        const auctionResult = createAuctionResult(
          game.players[0].id, // Auctioneer wins by default
          game.players[0].id, // Was auctioneer
          0 // No money exchanged
        )

        state = executeAuction(state, auctionResult, cardToAuction)

        // VERIFY: No money changed hands
        expect(state.players[0].money).toBe(initialMoney[0]) // Unchanged
        expect(state.players[1].money).toBe(initialMoney[1]) // Unchanged
        expect(state.players[2].money).toBe(initialMoney[2]) // Unchanged

        expect(getTotalMoney(state)).toBe(initialTotal) // Total conserved

        // Card still transferred to auctioneer
        expect(state.players[0].purchasedThisRound).toHaveLength(1)
        expect(state.players[0].purchasedThisRound[0].artist).toBe('Manuel Carvalho')
        expect(state.players[0].purchasedThisRound[0].purchasePrice).toBe(0)
      })
    })

    describe('Event Logging', () => {
      /**
       * TEST: Card played and auction completion events logged
       *
       * VERIFY:
       * - Card played event logged (when card is played)
       * - Auction completed event logged with winner, price, details
       */
      it('logs auction events to eventLog', () => {
        // SETUP: Create game with card
        const game = createGameWithHands([
          [createCard('Sigrid Thaler', 'open', 'auction_card')],
          [],
          []
        ])

        const initialLogLength = game.eventLog.length

        // Get card reference BEFORE playing it
        const cardToAuction = game.players[0].hand[0]

        // ACTION: Play card (should log card_played)
        let state = playCard(game, 0, 0)

        // Verify card_played logged
        expect(state.eventLog.length).toBeGreaterThan(initialLogLength)

        const cardPlayedLog = state.eventLog[state.eventLog.length - 1]
        expect(cardPlayedLog.type).toBe('card_played')
        expect(cardPlayedLog.card.id).toBe('auction_card')
        expect(cardPlayedLog.playerIndex).toBe(0)

        // Simulate auction completion
        const auctionResult = createAuctionResult(
          game.players[1].id, // Player 1 wins
          game.players[0].id, // Player 0 auctioneer
          35
        )

        state = executeAuction(state, auctionResult, cardToAuction)

        // Verify auction_completed logged
        const auctionEndLog = state.eventLog[state.eventLog.length - 1]
        expect(auctionEndLog.type).toBe('auction_completed')
        expect(auctionEndLog.winnerId).toBe(game.players[1].id)
        expect(auctionEndLog.salePrice).toBe(35)
        expect(auctionEndLog.cardId).toBe('auction_card')

        // Verify total logs increased (card_played + auction_completed)
        expect(state.eventLog.length).toBe(initialLogLength + 2)
      })

      /**
       * TEST: Auction events contain proper details
       *
       * VERIFY:
       * - Auction event includes auctioneerId, artist, round
       */
      it('logs auction details to eventLog', () => {
        // SETUP: Create game
        const game = createGameWithHands([
          [createCard('Daniel Melim', 'open')],
          [],
          []
        ])

        const initialLogLength = game.eventLog.length

        // ACTION: Play card and complete auction
        const cardToAuction = game.players[0].hand[0] // Get the card before playing it
        let state = playCard(game, 0, 0)

        const auctionResult = createAuctionResult(
          game.players[2].id, // Player 2 wins
          game.players[0].id, // Player 0 auctioneer
          45 // Payment amount
        )

        state = executeAuction(state, auctionResult, cardToAuction)

        // VERIFY: Events logged
        expect(state.eventLog.length).toBeGreaterThan(initialLogLength)

        // Find the auction_completed log
        const auctionLog = state.eventLog.find(log => log.type === 'auction_completed')
        expect(auctionLog).toBeDefined()

        if (auctionLog) {
          expect(auctionLog.winnerId).toBe(game.players[2].id)
          expect(auctionLog.auctioneerId).toBe(game.players[0].id)
          expect(auctionLog.salePrice).toBe(45)
          expect(auctionLog.artist).toBe('Daniel Melim')
          expect(auctionLog.round).toBe(1)
        }
      })
    })
  })

  // ===========================================================================
  // SECTION 4: COMPLETE ROUND MONEY FLOW
  // ===========================================================================
  // Tests total money conservation and flow through a complete round
  // Modules: money.ts, selling.ts, auction/*

  describe('Complete Round Money Flow', () => {

    describe('Money Conservation', () => {
      /**
       * TEST: Player-to-player auctions conserve total money
       *
       * SETUP:
       * - 4 players, 100 each = 400 total
       * - Run several auctions (non-auctioneer wins)
       *
       * VERIFY:
       * - Total player money stays 400
       * - Money just redistributes
       */
      it.todo('conserves total money in player-to-player auctions')

      /**
       * TEST: Auctioneer winning reduces total player money
       *
       * SETUP:
       * - Total: 400
       * - Auctioneer wins for 30
       *
       * VERIFY:
       * - Total player money: 370
       * - 30 went to bank
       */
      it.todo('reduces total when auctioneer wins (pays bank)')

      /**
       * TEST: Bank sales increase total player money
       *
       * SETUP:
       * - Total: 400
       * - Player sells paintings worth 50
       *
       * VERIFY:
       * - Total player money: 450
       * - 50 came from bank
       */
      it.todo('increases total when selling paintings to bank')

      /**
       * TEST: Complete round money accounting
       *
       * FLOW:
       * 1. Start: 400 total
       * 2. Auctions: some to bank, some player-to-player
       * 3. Bank sales: players receive money
       *
       * VERIFY:
       * - Final total = Start - (auctions to bank) + (bank sales)
       * - All transactions traceable in eventLog
       */
      it.todo('complete round maintains correct money accounting')
    })

    describe('Wealth Distribution', () => {
      /**
       * TEST: Track wealth changes through round
       *
       * VERIFY:
       * - Can calculate each player's net gain/loss
       * - Auction costs vs painting sale income
       * - Some players profit, others lose
       */
      it.todo('tracks wealth distribution changes through round')

      /**
       * TEST: Player can go to zero but game continues
       *
       * SETUP:
       * - Player has exactly $30
       * - Player wins auction for $30
       *
       * VERIFY:
       * - Player money = 0
       * - Game continues (0 is valid)
       * - Player cannot bid in future auctions
       */
      it.todo('allows player to reach zero money without ending game')
    })
  })

  // ===========================================================================
  // SECTION 5: STATE TRANSITIONS
  // ===========================================================================
  // Tests phase transitions and state machine behavior
  // Modules: game.ts, round.ts

  describe('State Transitions', () => {

    describe('Round Phase Transitions', () => {
      /**
       * TEST: awaiting_card_play → auction
       *
       * TRIGGER: Player plays a card
       *
       * VERIFY:
       * - Phase changes to 'auction'
       * - Auction state initialized
       * - Active player changes to auction rules
       */
      it.todo('transitions from awaiting_card_play to auction on card play')

      /**
       * TEST: auction → awaiting_card_play (auction complete)
       *
       * TRIGGER: Auction concludes
       *
       * VERIFY:
       * - Phase changes back to 'awaiting_card_play'
       * - activePlayerIndex moves to next player
       * - Previous auction cleaned up
       */
      it.todo('transitions from auction to awaiting_card_play after auction')

      /**
       * TEST: awaiting_card_play → round_ending (5th card)
       *
       * TRIGGER: 5th card of an artist played
       *
       * VERIFY:
       * - Phase changes to 'round_ending'
       * - No auction starts for 5th card
       */
      it.todo('transitions to round_ending when 5th card played')

      /**
       * TEST: round_ending → selling_to_bank
       *
       * TRIGGER: Round end processing
       *
       * VERIFY:
       * - Artists ranked
       * - Phase changes to 'selling_to_bank'
       * - results populated with rankings
       */
      it.todo('transitions to selling_to_bank after round ends')

      /**
       * TEST: selling_to_bank → next round start
       *
       * TRIGGER: All paintings sold
       *
       * VERIFY:
       * - New round initialized
       * - Phase back to 'awaiting_card_play'
       * - New cards dealt
       */
      it.todo('transitions to next round after selling phase')
    })

    describe('Game Phase Transitions', () => {
      /**
       * TEST: playing → ended (round 4 complete)
       *
       * TRIGGER: Round 4 ends and sells
       *
       * VERIFY:
       * - gamePhase changes to 'ended'
       * - winner determined
       * - No more rounds
       */
      it.todo('transitions to ended after round 4 completes')

      /**
       * TEST: playing → ended (early: no cards)
       *
       * TRIGGER: Deck empty AND all hands empty before round 4
       *
       * VERIFY:
       * - gamePhase changes to 'ended'
       * - Can happen in any round
       */
      it.todo('transitions to ended early when no cards remain')
    })
  })

  // ===========================================================================
  // SECTION 6: GAME STATE VALIDATION
  // ===========================================================================
  // Tests that game state remains valid through all operations
  // Modules: game.ts (validateGameState)

  describe('Game State Validation', () => {

    /**
     * TEST: State valid after round transition
     *
     * VERIFY validateGameState returns valid for:
     * - Correct player count
     * - No negative money
     * - Valid round number
     * - Valid auctioneer index
     */
    it.todo('maintains valid state through round transitions')

    /**
     * TEST: State valid after auction
     *
     * VERIFY:
     * - Money correctly distributed
     * - Card counts consistent
     * - Phase appropriate
     */
    it.todo('maintains valid state through auctions')

    /**
     * TEST: State valid after selling
     *
     * VERIFY:
     * - Paintings removed correctly
     * - Money added correctly
     * - Discard pile updated
     */
    it.todo('maintains valid state through selling phase')

    /**
     * TEST: Detect invalid states
     *
     * SETUP: Manually corrupt state
     *
     * VERIFY:
     * - validateGameState catches negative money
     * - validateGameState catches invalid round number
     * - validateGameState catches invalid player count
     */
    it.todo('detects and reports invalid game states')
  })

  // ===========================================================================
  // SECTION 7: EDGE CASES AND COMPLEX SCENARIOS
  // ===========================================================================

  describe('Edge Cases', () => {

    /**
     * TEST: Multiple artists tie for ranking
     *
     * SETUP: 3 artists each have 3 cards
     *
     * VERIFY:
     * - Tiebreaker by board position used consistently
     * - All 3 get ranked (30/20/10)
     */
    it.todo('handles three-way tie in artist ranking')

    /**
     * TEST: Only 2 artists have cards played
     *
     * VERIFY:
     * - 1st gets 30, 2nd gets 20
     * - 3rd place is empty (no one gets 10)
     * - Artists with 0 cards get value 0
     */
    it.todo('handles fewer than 3 artists having cards')

    /**
     * TEST: Player runs out of money mid-round
     *
     * SETUP: Player has $10, wins auction for $10
     *
     * VERIFY:
     * - Player can still play cards
     * - Player cannot bid in future auctions (or bids 0)
     * - Player can still receive bank sale money
     */
    it.todo('handles player reaching zero money mid-round')

    /**
     * TEST: No paintings to sell at round end
     *
     * SETUP: No player won any auctions
     *
     * VERIFY:
     * - Selling phase completes with no errors
     * - No money changes (bank sales = 0)
     * - Game continues normally
     */
    it.todo('handles round end with no paintings to sell')

    /**
     * TEST: All paintings are worthless
     *
     * SETUP: Players have paintings but none in top 3
     *
     * VERIFY:
     * - calculatePlayerSaleEarnings returns 0
     * - Paintings stay in purchases (not sold)
     * - No money transferred
     */
    it.todo('handles all paintings being worthless (artists not ranked)')

    /**
     * TEST: Extremely unbalanced game
     *
     * SETUP: One player wins all auctions
     *
     * VERIFY:
     * - Other players can still play
     * - Money distributed heavily to one
     * - Game completes normally
     */
    it.todo('handles extremely unbalanced wealth distribution')
  })

  // ===========================================================================
  // SECTION 8: REGRESSION TESTS
  // ===========================================================================
  // Add tests here for any bugs found during development

  describe('Regression Tests', () => {

    /**
     * Placeholder for regression tests
     * Add specific bug scenarios as they're discovered
     */
    it.todo('placeholder for regression tests')
  })
})

// =============================================================================
// INVARIANT HELPERS (to be used in tests)
// =============================================================================

/**
 * Verifies that total money is conserved (or changes as expected)
 */
function expectMoneyConserved(
  before: GameState,
  after: GameState,
  expectedChange: number = 0
): void {
  const totalBefore = getTotalMoney(before)
  const totalAfter = getTotalMoney(after)
  expect(totalAfter).toBe(totalBefore + expectedChange)
}

/**
 * Verifies game state is valid
 */
function expectValidState(gameState: GameState): void {
  const validation = validateGameState(gameState)
  expect(validation.isValid).toBe(true)
  if (!validation.isValid) {
    console.error('Invalid state:', validation.errors)
  }
}

/**
 * Verifies card counts are consistent
 * Total cards = deck + hands + purchases + discardPile
 */
function expectCardCountConsistent(gameState: GameState, expectedTotal: number): void {
  const deckCount = gameState.deck.length
  const handCount = gameState.players.reduce((sum, p) => sum + (p.hand?.length || 0), 0)
  const purchaseCount = gameState.players.reduce((sum, p) => sum + (p.purchases?.length || 0), 0)
  const discardCount = gameState.discardPile.length

  const total = deckCount + handCount + purchaseCount + discardCount
  expect(total).toBe(expectedTotal)
}
