import type { Card } from './game'

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
  auctioneerIndex: number
  currentHighBid: number | null
  currentHighBidder: number | null
  // For digital: countdown timer resets on each bid
  lastBidTimestamp: number
  countdownSeconds: number // e.g., 5 seconds
}

// -----------------------
// ONE OFFER AUCTION
// -----------------------
export interface OneOfferAuctionState {
  type: 'one_offer'
  card: Card
  auctioneerIndex: number
  currentPlayerIndex: number // Whose turn to bid
  currentHighBid: number | null
  currentHighBidder: number | null
  playersActed: number[] // Players who have bid or passed
}

// -----------------------
// HIDDEN AUCTION
// -----------------------
export interface HiddenAuctionState {
  type: 'hidden'
  card: Card
  auctioneerIndex: number
  phase: 'collecting_bids' | 'revealed'
  submittedBids: Map<number, number> // playerIndex -> bid (hidden until reveal)
  revealedBids: Map<number, number> | null // Set after all submit
}

// -----------------------
// FIXED PRICE AUCTION
// -----------------------
export interface FixedPriceAuctionState {
  type: 'fixed_price'
  card: Card
  auctioneerIndex: number
  fixedPrice: number
  currentPlayerIndex: number // Whose turn to decide
  passedPlayers: number[] // Players who passed
}

// -----------------------
// DOUBLE AUCTION
// -----------------------
export interface DoubleAuctionState {
  type: 'double'
  primaryCard: Card // The Double card
  primaryAuctioneerIndex: number // Who played the Double
  phase: DoubleAuctionPhase
}

export type DoubleAuctionPhase =
  | {
      type: 'awaiting_second_card'
      currentOfferIndex: number // Who is being asked to provide second card
      declinedPlayers: number[] // Players who passed on providing second
    }
  | {
      type: 'auction_in_progress'
      secondaryCard: Card
      secondaryAuctioneerIndex: number // Who provided second card (gets money)
      innerAuction: Exclude<AuctionState, DoubleAuctionState> // The actual auction
    }
  | {
      type: 'resolved_free'
      recipient: number // Auctioneer gets card free (no one offered second)
    }