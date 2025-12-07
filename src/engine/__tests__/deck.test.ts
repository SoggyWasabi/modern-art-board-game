import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards, getCardsToDeal } from '../deck'
import { CARD_DISTRIBUTION } from '../constants'

describe('Deck Management', () => {
  describe('createDeck', () => {
    it('returns exactly 70 cards', () => {
      const deck = createDeck()
      expect(deck).toHaveLength(70)
    })

    it('has correct card distribution per artist', () => {
      const deck = createDeck()
      const artistCounts: Record<string, number> = {}

      // Count cards per artist
      for (const card of deck) {
        artistCounts[card.artist] = (artistCounts[card.artist] || 0) + 1
      }

      // Verify distribution matches constants
      expect(artistCounts['Manuel Carvalho']).toBe(CARD_DISTRIBUTION['Manuel Carvalho'])
      expect(artistCounts['Sigrid Thaler']).toBe(CARD_DISTRIBUTION['Sigrid Thaler'])
      expect(artistCounts['Daniel Melim']).toBe(CARD_DISTRIBUTION['Daniel Melim'])
      expect(artistCounts['Ramon Martins']).toBe(CARD_DISTRIBUTION['Ramon Martins'])
      expect(artistCounts['Rafael Silveira']).toBe(CARD_DISTRIBUTION['Rafael Silveira'])
    })

    it('has exactly two Double cards per artist', () => {
      const deck = createDeck()
      const doubleCards = deck.filter(card => card.auctionType === 'double')

      expect(doubleCards).toHaveLength(10) // Two for each artist

      // Verify each artist has two Doubles
      const artistDoubles: Record<string, number> = {}
      for (const card of doubleCards) {
        artistDoubles[card.artist] = (artistDoubles[card.artist] || 0) + 1
      }

      expect(artistDoubles['Manuel Carvalho']).toBe(2)
      expect(artistDoubles['Sigrid Thaler']).toBe(2)
      expect(artistDoubles['Daniel Melim']).toBe(2)
      expect(artistDoubles['Ramon Martins']).toBe(2)
      expect(artistDoubles['Rafael Silveira']).toBe(2)
    })

    it('has unique card IDs', () => {
      const deck = createDeck()
      const cardIds = deck.map(card => card.id)
      const uniqueIds = new Set(cardIds)

      expect(uniqueIds.size).toBe(70)
    })

    it('has valid artwork IDs', () => {
      const deck = createDeck()

      for (const card of deck) {
        // New format: artist_auctionType_number
        expect(card.artworkId).toMatch(/^[a-z_]+_[a-z_]+_\d+$/)
        expect(card.artist.toLowerCase().replace(' ', '_')).toBe(
          card.artworkId.split('_')[0] + '_' + card.artworkId.split('_')[1]
        )
      }
    })
  })

  describe('shuffleDeck', () => {
    it('produces a different order than the original', () => {
      const deck = createDeck()
      const shuffled = shuffleDeck(deck)

      expect(shuffled).not.toBe(deck) // Different array reference
      expect(shuffled).toHaveLength(deck.length) // Same number of cards

      // High probability of different order (run multiple times if needed)
      let different = false
      for (let i = 0; i < 10; i++) {
        const shuffledAgain = shuffleDeck(deck)
        if (JSON.stringify(deck) !== JSON.stringify(shuffledAgain)) {
          different = true
          break
        }
      }
      expect(different).toBe(true)
    })

    it('maintains all cards in the deck', () => {
      const deck = createDeck()
      const shuffled = shuffleDeck(deck)

      // Sort by ID to compare
      const sortedOriginal = [...deck].sort((a, b) => a.id.localeCompare(b.id))
      const sortedShuffled = [...shuffled].sort((a, b) => a.id.localeCompare(b.id))

      expect(JSON.stringify(sortedOriginal)).toBe(JSON.stringify(sortedShuffled))
    })
  })

  describe('getCardsToDeal', () => {
    it('returns correct number of cards for 3 players', () => {
      expect(getCardsToDeal(3, 1)).toBe(10)
      expect(getCardsToDeal(3, 2)).toBe(6)
      expect(getCardsToDeal(3, 3)).toBe(6)
      expect(getCardsToDeal(3, 4)).toBe(0)
    })

    it('returns correct number of cards for 4 players', () => {
      expect(getCardsToDeal(4, 1)).toBe(9)
      expect(getCardsToDeal(4, 2)).toBe(4)
      expect(getCardsToDeal(4, 3)).toBe(4)
      expect(getCardsToDeal(4, 4)).toBe(0)
    })

    it('returns correct number of cards for 5 players', () => {
      expect(getCardsToDeal(5, 1)).toBe(8)
      expect(getCardsToDeal(5, 2)).toBe(3)
      expect(getCardsToDeal(5, 3)).toBe(3)
      expect(getCardsToDeal(5, 4)).toBe(0)
    })

    it('throws error for invalid player count', () => {
      expect(() => getCardsToDeal(2, 1)).toThrow('Invalid player count')
      expect(() => getCardsToDeal(6, 1)).toThrow('Invalid player count')
    })

    it('throws error for invalid round', () => {
      expect(() => getCardsToDeal(3, 0)).toThrow('Invalid round')
      expect(() => getCardsToDeal(3, 5)).toThrow('Invalid round')
    })
  })

  describe('dealCards', () => {
    it('deals correct number of cards to each player (3 players, round 1)', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 3, 1)

      expect(hands).toHaveLength(3)
      expect(hands[0]).toHaveLength(10)
      expect(hands[1]).toHaveLength(10)
      expect(hands[2]).toHaveLength(10)
    })

    it('deals correct number of cards to each player (4 players, round 2)', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 4, 2)

      expect(hands).toHaveLength(4)
      expect(hands[0]).toHaveLength(4)
      expect(hands[1]).toHaveLength(4)
      expect(hands[2]).toHaveLength(4)
      expect(hands[3]).toHaveLength(4)
    })

    it('deals correct number of cards to each player (5 players, round 3)', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 5, 3)

      expect(hands).toHaveLength(5)
      expect(hands[0]).toHaveLength(3)
      expect(hands[1]).toHaveLength(3)
      expect(hands[2]).toHaveLength(3)
      expect(hands[3]).toHaveLength(3)
      expect(hands[4]).toHaveLength(3)
    })

    it('returns empty hands for round 4', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 3, 4)

      expect(hands).toHaveLength(3)
      expect(hands[0]).toHaveLength(0)
      expect(hands[1]).toHaveLength(0)
      expect(hands[2]).toHaveLength(0)
    })

    it('deals cards without duplication', () => {
      const deck = createDeck()
      const hands = dealCards(deck, 3, 1)

      // Flatten all hands
      const allDealtCards = hands.flat()

      // Check no duplicates
      const dealtCardIds = new Set(allDealtCards.map(card => card.id))
      expect(dealtCardIds.size).toBe(allDealtCards.length)

      // Check all cards are from the original deck
      const deckCardIds = new Set(deck.map(card => card.id))
      for (const card of allDealtCards) {
        expect(deckCardIds.has(card.id)).toBe(true)
      }
    })

    it('throws error when not enough cards', () => {
      const smallDeck = createDeck().slice(0, 20) // Only 20 cards

      expect(() => dealCards(smallDeck, 5, 1)).toThrow('Not enough cards in deck')
    })

    it('throws error for invalid player count', () => {
      const deck = createDeck()

      expect(() => dealCards(deck, 2, 1)).toThrow('Invalid player count')
      expect(() => dealCards(deck, 6, 1)).toThrow('Invalid player count')
    })

    it('throws error for invalid round', () => {
      const deck = createDeck()

      expect(() => dealCards(deck, 3, 0)).toThrow('Invalid round')
      expect(() => dealCards(deck, 3, 5)).toThrow('Invalid round')
    })
  })
})