import type { Card } from './game'

// ===================
// AUCTION RESULT TYPE
// ===================

export interface AuctionResult {
  winnerId: string
  auctioneerId: string
  salePrice: number
  card: Card
  profit: number // Money earned by auctioneer (0 if buying from bank)
  type: 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'
}

// ===================
// AUCTION STATE TYPES
// ===================

export type AuctionState =
  | OpenAuctionState
  | OneOfferAuctionState
  | HiddenAuctionState
  | FixedPriceAuctionState
  | DoubleAuctionState

// -----------------------
// OPEN AUCTION
// -----------------------
export interface OpenAuctionState {
  type: 'open'
  card: Card
  auctioneerId: string
  currentBid: number
  currentBidderId: string | null
  isActive: boolean
  playerOrder: string[] // Order of players for auction
  currentPlayerIndex: number
  passCount: number // Number of consecutive passes
}

// -----------------------
// ONE OFFER AUCTION
// -----------------------
// Rules:
// - Turn order: left of auctioneer → clockwise → auctioneer LAST
// - Each player gets one chance to bid or pass
// - Must bid higher than current bid
// - After all others act, auctioneer can: accept highest bid OR outbid (pay bank)
// - No bids → auctioneer gets painting FREE
export interface OneOfferAuctionState {
  type: 'one_offer'
  card: Card
  auctioneerId: string
  currentBid: number
  currentBidderId: string | null
  isActive: boolean
  turnOrder: string[] // Order: left of auctioneer -> clockwise -> auctioneer LAST
  currentTurnIndex: number
  completedTurns: Set<string> // Players who have taken their turn
  phase: 'bidding' | 'auctioneer_decision' // Phase of the auction
}

// -----------------------
// HIDDEN AUCTION
// -----------------------
export interface HiddenAuctionState {
  type: 'hidden'
  card: Card
  auctioneerId: string
  bids: Record<string, number> // playerId -> bid amount
  isActive: boolean
  tieBreakOrder: string[] // Order for resolving ties (auctioneer first, then clockwise)
  revealedBids: boolean
  readyToReveal?: boolean // All players have submitted bids
}

// -----------------------
// FIXED PRICE AUCTION
// -----------------------
export interface FixedPriceAuctionState {
  type: 'fixed_price'
  card: Card
  auctioneerId: string
  price: number
  isActive: boolean
  sold: boolean
  winnerId: string | null
  turnOrder: string[] // Order: left of auctioneer -> clockwise
  currentTurnIndex: number
  passedPlayers: Set<string> // Players who have passed
}

// -----------------------
// DOUBLE AUCTION
// -----------------------
export interface DoubleAuctionState {
  type: 'double'
  doubleCard: Card // The Double card being played
  secondCard: Card | null // Second card offered (same artist)
  originalAuctioneerId: string // Who played the Double card
  currentAuctioneerId: string // Who offered the second card (gets money)
  auctionType: 'double' | 'open' | 'one_offer' | 'hidden' | 'fixed_price' // Type follows second card
  isActive: boolean
  sold: boolean
  winnerId?: string // Who won the auction
  finalPrice?: number // Final sale price
  turnOrder: string[] // Order for offering second cards (original auctioneer first)
  currentTurnIndex: number
  offers: Map<string, Card> // playerId -> card offered (for tracking)
  phase: 'offering' | 'bidding' // Phase of the double auction
}