import { describe, it, expect } from 'vitest'
import { startGame, nextRound } from '../../game'
import { createGameSetup } from '../helpers/game-builder'
import {
  DEAL_CONFIGURATIONS,
  getExpectedHandSize,
  verifyDeckComposition
} from '../fixtures/expected-dealings'
import { assertInvariants } from '../helpers/game-invariants'
import { ARTISTS } from '../../constants'
import type { Card } from '../../../types/game'

describe('Card Distribution', () => {
  describe('Deck Composition', () => {
    it('creates deck with correct artist and auction type distribution', () => {
      const setup = createGameSetup({ playerCount: 4 })
      const game = startGame(setup)

      const verification = verifyDeckComposition([...game.deck, ...game.discardPile, ...game.players.flatMap(p => p.hand || [])])

      expect(verification.valid).toBe(true)
      if (!verification.valid) {
        console.error('Deck composition errors:', verification.errors)
      }
    })

    it('ensures no duplicate cards in deck', () => {
      const setup = createGameSetup({ playerCount: 3 })
      const game = startGame(setup)

      const allCards: Card[] = [
        ...game.deck,
        ...game.discardPile,
        ...game.players.flatMap(p => p.hand || [])
      ]

      const cardIds = new Set<string>()
      const duplicates: string[] = []

      allCards.forEach(card => {
        if (cardIds.has(card.id)) {
          duplicates.push(card.id)
        } else {
          cardIds.add(card.id)
        }
      })

      expect(duplicates).toHaveLength(0)
      expect(cardIds.size).toBe(70)
    })
  })

  describe('Initial Dealing', () => {
    it.each([3, 4, 5] as const)('deals correct number of cards for %i players', (playerCount) => {
      const config = DEAL_CONFIGURATIONS[playerCount]
      const setup = createGameSetup({ playerCount })
      const game = startGame(setup)

      // Check each player has correct hand size
      game.players.forEach(player => {
        expect(player.hand).toHaveLength(config.round1Cards)
      })

      // Check deck size after dealing
      const expectedDeckSize = 70 - (config.round1Cards * playerCount)
      expect(game.deck).toHaveLength(expectedDeckSize)

      // Verify invariants
      assertInvariants(game)
    })

    it('deals cards with varied artists and auction types', () => {
      const setup = createGameSetup({ playerCount: 4 })
      const game = startGame(setup)

      // Collect all dealt cards
      const dealtCards = game.players.flatMap(p => p.hand || [])

      // Check we have cards from multiple artists
      const artistsInHands = new Set(dealtCards.map(c => c.artist))
      expect(artistsInHands.size).toBeGreaterThan(1)

      // Check we have multiple auction types
      const auctionTypesInHands = new Set(dealtCards.map(c => c.auctionType))
      expect(auctionTypesInHands.size).toBeGreaterThan(1)
    })

    it('ensures fair distribution (no player gets all cards of one artist)', () => {
      const setup = createGameSetup({ playerCount: 4 })
      const game = startGame(setup)

      game.players.forEach(player => {
        const artistCounts: Record<string, number> = {}
        player.hand.forEach(card => {
          artistCounts[card.artist] = (artistCounts[card.artist] || 0) + 1
        })

        // With only 9 cards dealt initially, having up to 5 cards of same artist is possible
        Object.values(artistCounts).forEach(count => {
          expect(count).toBeLessThanOrEqual(5)
        })
      })
    })
  })

  describe('Round-by-Round Dealing', () => {
    it('deals correct additional cards for round 2', () => {
      const playerCount = 4
      const setup = createGameSetup({ playerCount })
      let game = startGame(setup)

      const initialHandSizes = game.players.map(p => p.hand.length)
      const config = DEAL_CONFIGURATIONS[playerCount]

      // Simulate moving to round 2
      game = nextRound(game)

      // Check hand sizes increased correctly
      game.players.forEach((player, index) => {
        expect(player.hand.length).toBe(initialHandSizes[index] + config.round2Cards)
      })

      // Verify expected hand size for round 2
      game.players.forEach(player => {
        expect(player.hand.length).toBe(getExpectedHandSize(playerCount, 2))
      })

      assertInvariants(game)
    })

    it('deals correct additional cards for round 3', () => {
      const playerCount = 3
      const setup = createGameSetup({ playerCount })
      let game = startGame(setup)

      // Move to round 2
      game = nextRound(game)
      const round2HandSizes = game.players.map(p => p.hand.length)

      // Move to round 3
      game = nextRound(game)

      const config = DEAL_CONFIGURATIONS[playerCount]
      game.players.forEach((player, index) => {
        expect(player.hand.length).toBe(round2HandSizes[index] + config.round3Cards)
      })

      // Verify expected hand size for round 3
      game.players.forEach(player => {
        expect(player.hand.length).toBe(getExpectedHandSize(playerCount, 3))
      })

      assertInvariants(game)
    })

    it('deals no new cards in round 4', () => {
      const playerCount = 5
      const setup = createGameSetup({ playerCount })
      let game = startGame(setup)

      // Move through rounds
      game = nextRound(game) // Round 2
      game = nextRound(game) // Round 3
      const round3HandSizes = game.players.map(p => p.hand.length)

      // Move to round 4
      game = nextRound(game)

      // Hands should be same size
      game.players.forEach((player, index) => {
        expect(player.hand.length).toBe(round3HandSizes[index])
      })

      assertInvariants(game)
    })

    it('maintains card conservation through all rounds', () => {
      const playerCount = 4
      const setup = createGameSetup({ playerCount })
      let game = startGame(setup)

      const initialTotal = getTotalCardsCount(game)

      // Play through all 4 rounds
      for (let round = 2; round <= 4; round++) {
        game = nextRound(game)
        const currentTotal = getTotalCardsCount(game)
        expect(currentTotal).toBe(initialTotal)
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles minimum players (3) correctly', () => {
      const playerCount = 3
      const setup = createGameSetup({ playerCount })
      const game = startGame(setup)

      expect(game.players).toHaveLength(3)
      game.players.forEach(player => {
        expect(player.hand).toHaveLength(DEAL_CONFIGURATIONS[3].round1Cards)
      })

      assertInvariants(game)
    })

    it('handles maximum players (5) correctly', () => {
      const playerCount = 5
      const setup = createGameSetup({ playerCount })
      const game = startGame(setup)

      expect(game.players).toHaveLength(5)
      game.players.forEach(player => {
        expect(player.hand).toHaveLength(DEAL_CONFIGURATIONS[5].round1Cards)
      })

      assertInvariants(game)
    })

    it('preserves player order through dealing', () => {
      const playerCount = 4
      const playerNames = ['Alice', 'Bob', 'Charlie', 'David']
      const setup = createGameSetup({
        playerCount,
        players: playerNames.map((name, i) => ({ name, id: `player_${i}` }))
      })

      const game = startGame(setup)

      // Players should be in same order with dealt cards
      game.players.forEach((player, index) => {
        expect(player.name).toBe(playerNames[index])
        expect(player.hand).toBeDefined()
        expect(player.hand.length).toBeGreaterThan(0)
      })
    })

    it('ensures all artwork IDs are unique', () => {
      const setup = createGameSetup({ playerCount: 4 })
      const game = startGame(setup)

      const allCards: Card[] = [
        ...game.deck,
        ...game.players.flatMap(p => p.hand || [])
      ]

      const artworkIds = new Set<string>()
      const duplicates: string[] = []

      allCards.forEach(card => {
        if (artworkIds.has(card.artworkId)) {
          duplicates.push(card.artworkId)
        } else {
          artworkIds.add(card.artworkId)
        }
      })

      expect(duplicates).toHaveLength(0)
      expect(artworkIds.size).toBe(allCards.length)
    })
  })

  describe('Statistics and Verification', () => {
    it('tracks deck depletion correctly', () => {
      const playerCount = 3
      const config = DEAL_CONFIGURATIONS[playerCount]
      const setup = createGameSetup({ playerCount })
      let game = startGame(setup)

      // Initial state
      expect(game.deck.length).toBe(70 - config.totalDealt)

      // After all dealing
      for (let round = 2; round <= 4; round++) {
        game = nextRound(game)
      }

      // Should have remaining cards as expected
      expect(game.deck.length).toBe(config.remainingInDeck)
    })

    it('provides balanced auction type distribution in hands', () => {
      const setup = createGameSetup({ playerCount: 4 })
      const game = startGame(setup)

      const dealtCards = game.players.flatMap(p => p.hand || [])
      const auctionTypeCounts: Record<string, number> = {}

      dealtCards.forEach(card => {
        auctionTypeCounts[card.auctionType] = (auctionTypeCounts[card.auctionType] || 0) + 1
      })

      // Each auction type should be represented
      expect(Object.keys(auctionTypeCounts).length).toBeGreaterThan(3)

      // No single auction type should dominate too much
      const maxCount = Math.max(...Object.values(auctionTypeCounts))
      const minCount = Math.min(...Object.values(auctionTypeCounts))
      expect(maxCount - minCount).toBeLessThan(10)
    })
  })
})

/**
 * Helper function to count all cards in the system
 */
function getTotalCardsCount(game: any): number {
  return (
    game.deck.length +
    game.discardPile.length +
    game.players.reduce((sum: number, p: any) => sum + (p.hand?.length || 0), 0) +
    game.players.reduce((sum: number, p: any) => sum + (p.purchases?.length || 0), 0) +
    game.players.reduce((sum: number, p: any) => sum + (p.purchasedThisRound?.length || 0), 0)
  )
}