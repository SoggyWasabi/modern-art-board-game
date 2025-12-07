import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards, getCardsToDeal } from '../deck'

describe('Deck Management - Additional Edge Cases', () => {
  describe('Critical Edge Cases', () => {
    it('handles dealing with exactly enough cards', () => {
      const deck = createDeck()

      // 3 players, round 1 needs exactly 30 cards
      const hands = dealCards(deck, 3, 1)
      expect(hands).toHaveLength(3)
      expect(hands[0]).toHaveLength(10)
      expect(hands[1]).toHaveLength(10)
      expect(hands[2]).toHaveLength(10)
    })

    it('handles maximum player count (5 players)', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 5, 1)
      expect(hands).toHaveLength(5)
      expect(hands[0]).toHaveLength(8)
      expect(hands[4]).toHaveLength(8)
    })

    it('handles minimum player count (3 players)', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 3, 1)
      expect(hands).toHaveLength(3)
    })

    it('round 4 correctly returns empty hands for all player counts', () => {
      const deck = createDeck()

      // Test all player counts for round 4
      for (const playerCount of [3, 4, 5]) {
        const hands = dealCards(deck, playerCount, 4)
        expect(hands).toHaveLength(playerCount)
        hands.forEach(hand => {
          expect(hand).toHaveLength(0)
        })
      }
    })

    it('getCardsToDeal returns correct values for all combinations', () => {
      expect(getCardsToDeal(3, 1)).toBe(10)
      expect(getCardsToDeal(3, 2)).toBe(6)
      expect(getCardsToDeal(3, 3)).toBe(6)
      expect(getCardsToDeal(3, 4)).toBe(0)

      expect(getCardsToDeal(4, 1)).toBe(9)
      expect(getCardsToDeal(4, 2)).toBe(4)
      expect(getCardsToDeal(4, 3)).toBe(4)
      expect(getCardsToDeal(4, 4)).toBe(0)

      expect(getCardsToDeal(5, 1)).toBe(8)
      expect(getCardsToDeal(5, 2)).toBe(3)
      expect(getCardsToDeal(5, 3)).toBe(3)
      expect(getCardsToDeal(5, 4)).toBe(0)
    })
  })

  describe('Card Distribution Verification', () => {
    it('verifies auction type distribution is reasonable', () => {
      const deck = createDeck()
      const auctionTypeCounts: Record<string, number> = {}

      deck.forEach(card => {
        auctionTypeCounts[card.auctionType] = (auctionTypeCounts[card.auctionType] || 0) + 1
      })

      // Should have exactly 5 Double cards (one per artist)
      expect(auctionTypeCounts['double']).toBe(5)

      // Should have total of 70 cards
      const totalCards = Object.values(auctionTypeCounts).reduce((sum, count) => sum + count, 0)
      expect(totalCards).toBe(70)

      // Each artist should have exactly one Double
      const doubleCountsByArtist: Record<string, number> = {}
      deck.forEach(card => {
        if (card.auctionType === 'double') {
          doubleCountsByArtist[card.artist] = (doubleCountsByArtist[card.artist] || 0) + 1
        }
      })
      expect(Object.keys(doubleCountsByArtist)).toHaveLength(5)
      Object.values(doubleCountsByArtist).forEach(count => {
        expect(count).toBe(1)
      })
    })
  })

  describe('Multiple Deals Simulation', () => {
    it('can deal cards for a full game without overlap', () => {
      const deck = shuffleDeck(createDeck())
      let dealtCards = 0
      let deckIndex = 0

      // Simulate dealing for all rounds with 3 players
      for (const round of [1, 2, 3]) {
        const cardsNeeded = getCardsToDeal(3, round) * 3
        const currentDeck = deck.slice(deckIndex)
        const hands = dealCards(currentDeck, 3, round)

        // Verify we got the right number of cards
        const totalDealtThisRound = hands.reduce((sum, hand) => sum + hand.length, 0)
        expect(totalDealtThisRound).toBe(cardsNeeded)

        dealtCards += totalDealtThisRound
        deckIndex += totalDealtThisRound
      }

      // Should have dealt 10+6+6 = 22 cards per player = 66 total
      expect(dealtCards).toBe(66)

      // Should have 4 cards left (not dealt in round 4)
      expect(deckIndex).toBe(66)
    })
  })
})