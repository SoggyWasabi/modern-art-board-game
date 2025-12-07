import type { Card, AuctionType } from '../types/game'
import { ARTISTS, CARD_DISTRIBUTION, CARDS_PER_ROUND } from './constants'

// ===================
// DECK MANAGEMENT
// ===================

let cardIdCounter = 0

function generateCardId(): string {
  return `card_${cardIdCounter++}`
}

/**
 * Create a full deck of 70 cards with proper distribution
 */
export function createDeck(): Card[] {
  const deck: Card[] = []

  // For each artist, create the specified number of cards
  for (const artist of ARTISTS) {
    const cardCount = CARD_DISTRIBUTION[artist]

    for (let i = 0; i < cardCount; i++) {
      // Distribute auction types
      // From rulebook: approximate distribution
      let auctionType: AuctionType

      if (i === 0) {
        // First card for each artist is always a Double
        auctionType = 'double'
      } else if (i <= cardCount * 0.25) {
        // 25% Open
        auctionType = 'open'
      } else if (i <= cardCount * 0.5) {
        // 25% One Offer
        auctionType = 'one_offer'
      } else if (i <= cardCount * 0.75) {
        // 25% Hidden
        auctionType = 'hidden'
      } else {
        // 25% Fixed Price
        auctionType = 'fixed_price'
      }

      const card: Card = {
        id: generateCardId(),
        artist,
        auctionType,
        artworkId: `${artist.toLowerCase().replace(' ', '_')}_${i + 1}`,
      }

      deck.push(card)
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