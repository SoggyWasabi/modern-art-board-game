import type { Card, AuctionType } from '../types/game'
import { ARTISTS, CARD_DISTRIBUTION, AUCTION_DISTRIBUTION, CARDS_PER_ROUND } from './constants'

// ===================
// DECK MANAGEMENT
// ===================

let cardIdCounter = 0

function generateCardId(): string {
  return `card_${cardIdCounter++}`
}

/**
 * Create a full deck of 70 cards with proper distribution
 * Uses configurable distribution from constants for easy modification
 */
export function createDeck(): Card[] {
  const deck: Card[] = []

  // For each artist, create cards according to distribution config
  for (const artist of ARTISTS) {
    const cardCount = CARD_DISTRIBUTION[artist]
    const distribution = AUCTION_DISTRIBUTION[artist]

    // Verify the distribution matches the card count
    const totalDistributed = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    if (totalDistributed !== cardCount) {
      throw new Error(`Card count mismatch for ${artist}: Expected ${cardCount}, got ${totalDistributed}`)
    }

    let cardIndex = 0

    // Create cards for each auction type
    for (const [auctionType, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        const card: Card = {
          id: generateCardId(),
          artist,
          auctionType: auctionType as AuctionType,
          artworkId: `${artist.toLowerCase().replace(' ', '_')}_${auctionType}_${i + 1}`,
        }

        deck.push(card)
        cardIndex++
      }
    }
  }

  return deck
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * Deal cards to players based on player count and round
 * Returns an array of hands (one for each player)
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
  round: number
): Card[][] {
  if (playerCount < 3 || playerCount > 5) {
    throw new Error(`Invalid player count: ${playerCount}`)
  }

  if (round < 1 || round > 4) {
    throw new Error(`Invalid round: ${round}`)
  }

  const cardsPerPlayer = CARDS_PER_ROUND[playerCount][round - 1]

  if (deck.length < cardsPerPlayer * playerCount) {
    throw new Error(
      `Not enough cards in deck: need ${cardsPerPlayer * playerCount}, have ${deck.length}`
    )
  }

  const hands: Card[][] = []

  for (let i = 0; i < playerCount; i++) {
    const hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer)
    hands.push(hand)
  }

  return hands
}

/**
 * Get the number of cards to deal based on player count and round
 */
export function getCardsToDeal(playerCount: number, round: number): number {
  if (playerCount < 3 || playerCount > 5) {
    throw new Error(`Invalid player count: ${playerCount}`)
  }

  if (round < 1 || round > 4) {
    throw new Error(`Invalid round: ${round}`)
  }

  return CARDS_PER_ROUND[playerCount][round - 1]
}

/**
 * Validate the deck configuration matches expected totals
 * Useful for debugging and ensuring configuration consistency
 */
export function validateDeckConfiguration(): void {
  let totalCards = 0
  let totalDoubles = 0

  for (const artist of ARTISTS) {
    const cardCount = CARD_DISTRIBUTION[artist]
    const distribution = AUCTION_DISTRIBUTION[artist]

    const distributedTotal = Object.values(distribution).reduce((sum, count) => sum + count, 0)

    if (distributedTotal !== cardCount) {
      throw new Error(
        `Configuration error for ${artist}: ` +
        `CARD_DISTRIBUTION says ${cardCount}, but AUCTION_DISTRIBUTION totals ${distributedTotal}`
      )
    }

    totalCards += cardCount
    totalDoubles += distribution.double || 0
  }

  // Verify we have exactly 70 cards
  if (totalCards !== 70) {
    throw new Error(`Total cards should be 70, got ${totalCards}`)
  }

  // Verify we have at least 2 doubles per artist (minimum 10 total)
  if (totalDoubles < 10) {
    throw new Error(`Should have at least 10 double cards (2 per artist), got ${totalDoubles}`)
  }

  console.log(`✓ Deck configuration validated: ${totalCards} cards, ${totalDoubles} doubles`)
}