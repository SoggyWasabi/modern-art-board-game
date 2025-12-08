import { ARTISTS } from '../../constants'

/**
 * Expected card dealing configurations for Modern Art
 *
 * These are the verified card counts for each player configuration
 * based on the official game rules.
 */

export interface DealConfiguration {
  playerCount: 3 | 4 | 5
  round1Cards: number
  round2Cards: number
  round3Cards: number
  round4Cards: number
  totalDealt: number
  remainingInDeck: number
}

export const DEAL_CONFIGURATIONS: Record<3 | 4 | 5, DealConfiguration> = {
  3: {
    playerCount: 3,
    round1Cards: 10,  // Each player gets 10 cards
    round2Cards: 6,   // Each player gets 6 more cards
    round3Cards: 6,   // Each player gets 6 more cards
    round4Cards: 0,   // No new cards in round 4
    totalDealt: 66,   // (10 + 6 + 6) * 3 = 66
    remainingInDeck: 4
  },
  4: {
    playerCount: 4,
    round1Cards: 9,   // Each player gets 9 cards (not 10!)
    round2Cards: 4,   // Each player gets 4 more cards
    round3Cards: 4,   // Each player gets 4 more cards
    round4Cards: 0,   // No new cards in round 4
    totalDealt: 68,   // (9 + 4 + 4) * 4 = 68
    remainingInDeck: 2
  },
  5: {
    playerCount: 5,
    round1Cards: 8,   // Each player gets 8 cards
    round2Cards: 3,   // Each player gets 3 more cards
    round3Cards: 3,   // Each player gets 3 more cards
    round4Cards: 0,   // No new cards in round 4
    totalDealt: 70,   // (8 + 3 + 3) * 5 = 70
    remainingInDeck: 0
  }
}

/**
 * Expected artist distribution in deck
 * Based on actual constants.ts configuration
 */
export const ARTIST_DISTRIBUTION = {
  [ARTISTS[0]]: { // Manuel Carvalho
    total: 12,
    auctionTypes: {
      open: 3,
      hidden: 2,
      fixed_price: 2,
      double: 2,
      one_offer: 3
    }
  },
  [ARTISTS[1]]: { // Sigrid Thaler
    total: 13,
    auctionTypes: {
      open: 3,
      hidden: 3,
      fixed_price: 2,
      double: 2,
      one_offer: 3
    }
  },
  [ARTISTS[2]]: { // Daniel Melim
    total: 14,
    auctionTypes: {
      open: 3,
      hidden: 3,
      fixed_price: 2,
      double: 2,
      one_offer: 4
    }
  },
  [ARTISTS[3]]: { // Ramon Martins
    total: 15,
    auctionTypes: {
      open: 4,
      hidden: 3,
      fixed_price: 2,
      double: 2,
      one_offer: 4
    }
  },
  [ARTISTS[4]]: { // Rafael Silveira
    total: 16,
    auctionTypes: {
      open: 4,
      hidden: 3,
      fixed_price: 3,
      double: 2,
      one_offer: 4
    }
  }
}

/**
 * Expected auction type distribution in full deck
 */
export const AUCTION_TYPE_DISTRIBUTION = {
  open: 17,        // 3+3+3+4+4 = 17
  hidden: 14,      // 2+3+3+3+3 = 14
  fixed_price: 11, // 2+2+2+2+3 = 11
  double: 10,      // 2+2+2+2+2 = 10
  one_offer: 18    // 3+3+4+4+4 = 18
}

/**
 * Artist valuation table (official Modern Art values)
 */
export const ARTIST_VALUATIONS = {
  // For each placement: [1st, 2nd, 3rd, 4th, 5th]
  rank1: [30, 20, 10, 0, 0],   // 5+ cards played
  rank2: [20, 10, 0, 0, 0],   // 4 cards played
  rank3: [10, 0, 0, 0, 0],    // 3 cards played
  rank4: [0, 0, 0, 0, 0],     // 2 cards played
  rank5: [0, 0, 0, 0, 0]      // 1 card played
}

/**
 * Get expected hand size after dealing for each round
 */
export function getExpectedHandSize(
  playerCount: 3 | 4 | 5,
  round: 1 | 2 | 3 | 4
): number {
  const config = DEAL_CONFIGURATIONS[playerCount]

  switch (round) {
    case 1:
      return config.round1Cards
    case 2:
      return config.round1Cards + config.round2Cards
    case 3:
      return config.round1Cards + config.round2Cards + config.round3Cards
    case 4:
      return config.round1Cards + config.round2Cards + config.round3Cards // No new cards
    default:
      throw new Error(`Invalid round: ${round}`)
  }
}

/**
 * Get expected artist value based on cards played
 */
export function getExpectedArtistValue(cardsPlayed: number): number {
  if (cardsPlayed >= 5) return ARTIST_VALUATIONS.rank1[0]
  if (cardsPlayed === 4) return ARTIST_VALUATIONS.rank2[0]
  if (cardsPlayed === 3) return ARTIST_VALUATIONS.rank3[0]
  return 0
}

/**
 * Verify that a deck has correct composition
 */
export function verifyDeckComposition(deck: any[]): {
  valid: boolean
  errors: string[]
  distribution: Record<string, number>
} {
  const errors: string[] = []
  const distribution: Record<string, number> = {}

  // Count cards by artist
  ARTISTS.forEach(artist => {
    distribution[artist] = deck.filter(c => c.artist === artist).length
    const expectedCount = ARTIST_DISTRIBUTION[artist].total
    if (distribution[artist] !== expectedCount) {
      errors.push(`Artist ${artist}: expected ${expectedCount} cards, found ${distribution[artist]}`)
    }
  })

  // Count cards by auction type
  const auctionCounts: Record<string, number> = {}
  deck.forEach(card => {
    auctionCounts[card.auctionType] = (auctionCounts[card.auctionType] || 0) + 1
  })

  Object.entries(AUCTION_TYPE_DISTRIBUTION).forEach(([type, expected]) => {
    const actual = auctionCounts[type] || 0
    if (actual !== expected) {
      errors.push(`Auction type ${type}: expected ${expected} cards, found ${actual}`)
    }
  })

  // Check total cards
  if (deck.length !== 70) {
    errors.push(`Total cards: expected 70, found ${deck.length}`)
  }

  // Check for duplicates
  const cardIds = new Set<string>()
  const duplicates: string[] = []
  deck.forEach(card => {
    if (cardIds.has(card.id)) {
      duplicates.push(card.id)
    } else {
      cardIds.add(card.id)
    }
  })

  if (duplicates.length > 0) {
    errors.push(`Duplicate card IDs: ${duplicates.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    distribution
  }
}