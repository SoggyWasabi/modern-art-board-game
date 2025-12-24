// ===================
// AI DECISION TYPES
// ===================

import type { Card } from '../../types/game'

/**
 * Base AI decision interface
 * All AI decisions extend this with confidence scoring
 */
export interface AIDecision {
  /** Confidence level 0-1, useful for debugging and AI tuning */
  confidence: number
  /** Optional reasoning for the decision (useful for debugging) */
  reasoning?: string
  /** Time in milliseconds spent making this decision */
  decisionTime?: number
}

// ===================
// SPECIFIC DECISION TYPES
// ===================

/**
 * Decision for which card to play/auction
 */
export interface AICardPlayDecision extends AIDecision {
  /** Type identifier for card play decisions */
  type: 'card_play'
  /** ID of the chosen card from player's hand */
  cardId: string
  /** Chosen card object (for convenience) */
  card?: Card
}

/**
 * Decision for bidding in an auction
 */
export interface AIBidDecision extends AIDecision {
  /** Type identifier for bid decisions */
  type: 'bid'
  /** Action: place a bid, pass, offer (double auction), or decline (double auction) */
  action: 'bid' | 'pass' | 'offer' | 'decline' | 'buy' | 'set_price' | 'accept' | 'outbid' | 'take_free'
  /** Bid amount if action is 'bid' or 'outbid' */
  amount?: number
  /** Maximum willing to bid (for internal strategy) */
  maxBid?: number
  /** Card ID for double auction offers */
  cardId?: string
}

/**
 * Decision for setting a fixed price
 */
export interface AIFixedPriceDecision extends AIDecision {
  /** Type identifier for fixed price decisions */
  type: 'fixed_price'
  /** The price to set for the auction */
  price: number
  /** Reasoning for this price point */
  priceReasoning?: 'aggressive' | 'conservative' | 'optimal' | 'desperate'
}

/**
 * Decision for offering a second card in Double auction
 */
export interface AIDoubleOfferDecision extends AIDecision {
  /** Type identifier for Double auction decisions */
  type: 'double_offer'
  /** Action: offer a matching card or decline */
  action: 'offer' | 'decline'
  /** ID of card to offer if action is 'offer' */
  cardId?: string
  /** Strategic reasoning for offer/decline */
  strategy?: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition'
}

/**
 * Decision for hidden bid auctions
 */
export interface AIHiddenBidDecision extends AIDecision {
  /** Type identifier for hidden bid decisions */
  type: 'hidden_bid'
  /** Bid amount (0 means not bidding) */
  amount: number
  /** Bluff factor: how much this bid deviates from true value */
  bluffFactor?: number
}

/**
 * Decision for one-offer auctions (bidding phase)
 */
export interface AIOneOfferBidDecision extends AIDecision {
  /** Type identifier for one-offer bid decisions */
  type: 'one_offer_bid'
  /** Action: bid or pass */
  action: 'bid' | 'pass'
  /** Bid amount if action is 'bid' */
  amount?: number
  /** Position awareness in bidding order */
  position?: 'first' | 'middle' | 'last' | 'auctioneer'
}

// ===================
// UNION TYPE
// ===================

/**
 * Union of all possible AI decision types
 */
export type AnyAIDecision =
  | AICardPlayDecision
  | AIBidDecision
  | AIFixedPriceDecision
  | AIDoubleOfferDecision
  | AIHiddenBidDecision
  | AIOneOfferBidDecision

// ===================
// TYPE GUARDS
// ===================

/**
 * Type guard functions for AI decisions
 */
export const AIDecisionGuards = {
  isCardPlay: (decision: AnyAIDecision): decision is AICardPlayDecision =>
    decision.type === 'card_play',

  isBid: (decision: AnyAIDecision): decision is AIBidDecision =>
    decision.type === 'bid',

  isFixedPrice: (decision: AnyAIDecision): decision is AIFixedPriceDecision =>
    decision.type === 'fixed_price',

  isDoubleOffer: (decision: AnyAIDecision): decision is AIDoubleOfferDecision =>
    decision.type === 'double_offer',

  isHiddenBid: (decision: AnyAIDecision): decision is AIHiddenBidDecision =>
    decision.type === 'hidden_bid',

  isOneOfferBid: (decision: AnyAIDecision): decision is AIOneOfferBidDecision =>
    decision.type === 'one_offer_bid',
}

// ===================
// FACTORY FUNCTIONS
// ===================

/**
 * Factory functions for creating AI decisions
 */
export const AIDecisionFactory = {
  /**
   * Create a card play decision
   */
  cardPlay: (cardId: string, confidence = 1.0, reasoning?: string): AICardPlayDecision => ({
    type: 'card_play',
    confidence,
    cardId,
    reasoning,
  }),

  /**
   * Create a bid decision
   */
  bid: (amount: number, confidence = 1.0, reasoning?: string): AIBidDecision => ({
    type: 'bid',
    confidence,
    action: 'bid',
    amount,
    reasoning,
  }),

  /**
   * Create a pass decision
   */
  pass: (confidence = 1.0, reasoning?: string): AIBidDecision => ({
    type: 'bid',
    confidence,
    action: 'pass',
    reasoning,
  }),

  /**
   * Create a fixed price decision
   */
  fixedPrice: (price: number, confidence = 1.0, reasoning?: string): AIFixedPriceDecision => ({
    type: 'fixed_price',
    confidence,
    price,
    reasoning,
  }),

  /**
   * Create a double offer decision
   */
  doubleOffer: (
    action: 'offer' | 'decline',
    cardId?: string,
    confidence = 1.0,
    reasoning?: string
  ): AIDoubleOfferDecision => ({
    type: 'double_offer',
    confidence,
    action,
    cardId,
    reasoning,
  }),

  /**
   * Create a hidden bid decision
   */
  hiddenBid: (amount: number, confidence = 1.0, reasoning?: string): AIHiddenBidDecision => ({
    type: 'hidden_bid',
    confidence,
    amount,
    reasoning,
  }),

  /**
   * Create a one-offer bid decision
   */
  oneOfferBid: (
    action: 'bid' | 'pass',
    amount?: number,
    confidence = 1.0,
    reasoning?: string
  ): AIOneOfferBidDecision => ({
    type: 'one_offer_bid',
    confidence,
    action,
    amount,
    reasoning,
  }),
}