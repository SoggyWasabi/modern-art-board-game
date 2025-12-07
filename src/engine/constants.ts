import type { Artist, AuctionType } from '../types/game'

// ===================
// ARTISTS (Board Order - Left to Right)
// ===================
// This order is CRITICAL for tie-breaking in artist rankings
// Priority 1 (highest) -> Priority 5 (lowest)

export const ARTISTS: readonly Artist[] = [
  'Manuel Carvalho', // Priority 1 (wins ties)
  'Sigrid Thaler', // Priority 2
  'Daniel Melim', // Priority 3
  'Ramon Martins', // Priority 4
  'Rafael Silveira', // Priority 5 (loses ties)
] as const

export const AUCTION_TYPES: readonly AuctionType[] = [
  'open',
  'one_offer',
  'hidden',
  'fixed_price',
  'double',
] as const

// ===================
// CARD DISTRIBUTION
// ===================
// Total: 70 cards

export const CARD_DISTRIBUTION: Record<Artist, number> = {
  'Manuel Carvalho': 12,
  'Sigrid Thaler': 13,
  'Daniel Melim': 15,
  'Ramon Martins': 15,
  'Rafael Silveira': 15,
}

export const CARDS_PER_ROUND: Record<number, [number, number, number, number]> = {
  3: [10, 6, 6, 0], // 3 players: 10, 6, 6, 0 cards per round
  4: [9, 4, 4, 0], // 4 players: 9, 4, 4, 0 cards per round
  5: [8, 3, 3, 0], // 5 players: 8, 3, 3, 0 cards per round
}

export const STARTING_MONEY = 100

export const ARTIST_VALUES = {
  FIRST: 30,
  SECOND: 20,
  THIRD: 10,
  FOURTH_OR_LOWER: 0,
} as const

// ===================
// PLAYER COLORS
// ===================

export const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
] as const

// ===================
// HELPER FUNCTIONS
// ===================

// Get player to the left (clockwise) of given player
export function getPlayerToLeft(playerIndex: number, playerCount: number): number {
  return (playerIndex + 1) % playerCount
}

// Get clockwise distance from player A to player B
export function clockwiseDistance(
  from: number,
  to: number,
  playerCount: number
): number {
  if (to >= from) {
    return to - from
  }
  return playerCount - from + to
}

// Get turn order starting left of auctioneer, ending with auctioneer
export function getTurnOrder(auctioneerIndex: number, playerCount: number): number[] {
  const order: number[] = []
  for (let i = 1; i <= playerCount; i++) {
    order.push((auctioneerIndex + i) % playerCount)
  }
  return order // Auctioneer is last
}