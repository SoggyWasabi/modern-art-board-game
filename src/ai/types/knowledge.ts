// ===================
// AI KNOWLEDGE TYPES
// ===================

import type { Artist, Card, GameState, Player, GameBoard } from '../../types/game'
import type { AuctionState } from '../../types/auction'

/**
 * Information that AI can legally know (fair play constraints)
 * This represents what a human player would know in the same situation
 */
export interface VisibleGameState {
  /** Current round number */
  roundNumber: number
  /** All players with visible information */
  players: PlayerInfo[]
  /** Current artist values on the board */
  board: GameBoard
  /** Cards currently visible on the table */
  visibleCards: Card[]
  /** Number of cards remaining in deck (but not what they are) */
  deckSize: number
  /** Current phase of the round */
  phase: string
  /** Auctioneer index for current auction */
  auctioneerIndex?: number
  /** History of bids in current auction (visible to all) */
  bidHistory?: BidRecord[]
  /** Cards purchased by each player this round */
  roundPurchases: Record<number, Card[]>
}

/**
 * Information about a player from AI's perspective
 */
export interface PlayerInfo {
  /** Player ID */
  id: string
  /** Player name */
  name: string
  /** Whether this is the AI player */
  isSelf: boolean
  /** Player's money (exact if self, estimated if not) */
  money: number
  /** Whether money amount is exact or estimated */
  moneyType: 'exact' | 'estimated'
  /** Number of cards in hand (only for self) */
  handSize?: number
  /** Cards in hand (only for self) */
  hand?: Card[]
  /** Purchased paintings (visible to all) */
  purchases: Card[]
  /** Is this player an AI? */
  isAI: boolean
  /** AI difficulty if applicable */
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

/**
 * Market analysis information for strategic decisions
 */
export interface MarketAnalysis {
  /** Current market state */
  marketState: 'emerging' | 'competitive' | 'consolidated' | 'saturated'
  /** Artist competitiveness analysis */
  artistCompetitiveness: Record<Artist, ArtistCompetitiveness>
  /** Overall market volatility */
  volatility: number // 0-1, higher means more unpredictable
  /** Estimated cards remaining per artist */
  remainingCards: Record<Artist, number>
}

/**
 * Competitiveness analysis for a specific artist
 */
export interface ArtistCompetitiveness {
  /** Artist name */
  artist: Artist
  /** Current rank (1-5, where 1 is most competitive) */
  rank: number
  /** How many cards needed to secure value tiles */
  cardsNeededForValue: number
  /** Current market control (0-1) */
  marketControl: number
  /** Competition level for this artist */
  competitionLevel: 'low' | 'medium' | 'high'
  /** Expected final value based on current state */
  expectedFinalValue: number
}

/**
 * Card evaluation result
 */
export interface CardEvaluation {
  /** Card being evaluated */
  card: Card
  /** Base expected value */
  baseValue: number
  /** Market potential value */
  marketPotential: number
  /** Auction complexity factor (0-1, higher is more complex) */
  auctionComplexity: number
  /** Artist control potential (0-1) */
  artistControl: number
  /** Risk assessment (0-1, higher is riskier) */
  riskLevel: number
  /** Overall strategic value */
  strategicValue: number
  /** Evaluation confidence (0-1) */
  confidence: number
}

/**
 * Opponent model for strategic planning
 */
export interface OpponentModel {
  /** Player ID */
  playerId: string
  /** Estimated available money */
  estimatedMoney: number
  /** Confidence in money estimate (0-1) */
  moneyConfidence: number
  /** Playing style tendencies */
  tendencies: PlayerTendencies
  /** Historical bidding patterns */
  biddingHistory: BidPattern[]
  /** Artist preferences */
  artistPreferences: Record<Artist, number> // -1 to 1, negative means avoid
  /** Risk tolerance estimate (0-1) */
  riskTolerance: number
  /** How predictable this player is (0-1) */
  predictability: number
}

/**
 * Player playing style tendencies
 */
export interface PlayerTendencies {
  /** How aggressively they bid (0-1) */
  aggressiveness: number
  /** How likely to bluff in hidden auctions (0-1) */
  bluffingTendency: number
  /** Preference for certain auction types */
  auctionTypePreference: Record<string, number>
  /** How much they value certain artists */
  artistBias: Record<Artist, number>
  /** Conservation vs spending tendency */
  conservationTendency: number
}

/**
 * Historical bid pattern
 */
export interface BidPattern {
  /** Timestamp of bid */
  timestamp: number
  /** Auction type */
  auctionType: string
  /** Artist involved */
  artist: Artist
  /** Bid amount */
  amount: number
  /** Won the auction? */
  won: boolean
  /** Was this a bluff? (only for hidden) */
  wasBluff?: boolean
}

/**
 * Single bid record in auction history
 */
export interface BidRecord {
  /** Player index who placed bid */
  playerIndex: number
  /** Bid amount */
  amount: number
  /** Timestamp of bid */
  timestamp: number
  /** Bid type (open, hidden, etc.) */
  bidType: string
  /** Was this the winning bid? */
  isWinning?: boolean
}

/**
 * AI's memory of game events
 */
export interface AIMemory {
  /** Cards seen so far (including own hand) */
  seenCards: Set<string>
  /** Tracks how many cards of each artist have been played */
  cardsPlayedByArtist: Record<Artist, number>
  /** Memory of opponent money changes */
  moneyChanges: MoneyChangeRecord[]
  /** Artist ranking history */
  artistRankingHistory: ArtistRankingRecord[]
  /** Notable game events */
  notableEvents: GameEvent[]
}

/**
 * Record of money change
 */
export interface MoneyChangeRecord {
  /** Player index */
  playerIndex: number
  /** Change amount (negative for spending) */
  amount: number
  /** Reason for change */
  reason: 'bid' | 'purchase' | 'sale' | 'other'
  /** Round number */
  round: number
  /** Timestamp */
  timestamp: number
}

/**
 * Artist ranking at a point in time
 */
export interface ArtistRankingRecord {
  /** Round number */
  round: number
  /** Artist rankings */
  rankings: Array<{
    artist: Artist
    rank: number
    value: number
  }>
  /** Timestamp */
  timestamp: number
}

/**
 * Notable game event for AI memory
 */
export interface GameEvent {
  /** Type of event */
  type: 'high_bid' | 'artist_dominance' | 'market_shift' | 'bluff_revealed'
  /** Description */
  description: string
  /** Players involved */
  players: number[]
  /** Round number */
  round: number
  /** Timestamp */
  timestamp: number
  /** Strategic impact */
  impact: 'low' | 'medium' | 'high'
}

/**
 * Context for AI decision making
 */
export interface AIDecisionContext {
  /** Current visible game state */
  gameState: VisibleGameState
  /** Market analysis */
  marketAnalysis: MarketAnalysis
  /** Card evaluations for current hand */
  cardEvaluations: CardEvaluation[]
  /** Opponent models */
  opponentModels: Record<number, OpponentModel>
  /** AI memory of game events */
  memory: AIMemory
  /** Current auction state if applicable */
  currentAuction?: AuctionState
  /** Player index making decision */
  playerIndex: number
  /** Time pressure level (0-1) */
  timePressure: number
  /** Decision importance (0-1) */
  importance: number
}