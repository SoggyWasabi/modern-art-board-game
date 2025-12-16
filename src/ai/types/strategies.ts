// ===================
// AI STRATEGY TYPES
// ===================

import type { Artist, Card, GameState, Player } from '../../types/game'
import type { AuctionState } from '../../types/auction'
import type { AnyAIDecision, AICardPlayDecision, AIBidDecision, AIFixedPriceDecision, AIDoubleOfferDecision, AIHiddenBidDecision, AIOneOfferBidDecision } from './decisions'
import type { AIDecisionContext } from './knowledge'

/**
 * AI difficulty levels
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Base AI strategy interface
 * All AI strategies must implement this interface
 */
export interface AIStrategy {
  /** Strategy difficulty level */
  difficulty: AIDifficulty
  /** Strategy name for debugging */
  name: string
  /** Strategy description */
  description: string

  /**
   * Choose which card to play/auction
   */
  chooseCardToAuction(context: AIDecisionContext): Promise<AICardPlayDecision>

  /**
   * Make a bid decision in an open auction
   */
  chooseOpenBid(context: AIDecisionContext, auction: AuctionState, currentHighBid: number | null): Promise<AIBidDecision>

  /**
   * Make a bid decision in a one-offer auction
   */
  chooseOneOfferBid(context: AIDecisionContext, auction: AuctionState, currentBid: number): Promise<AIOneOfferBidDecision>

  /**
   * Make a bid decision in a hidden auction
   */
  chooseHiddenBid(context: AIDecisionContext, auction: AuctionState): Promise<AIHiddenBidDecision>

  /**
   * Set a fixed price for an auction
   */
  chooseFixedPrice(context: AIDecisionContext, auction: AuctionState): Promise<AIFixedPriceDecision>

  /**
   * Decide whether to offer a second card in a double auction
   */
  chooseDoubleOffer(context: AIDecisionContext, auction: AuctionState): Promise<AIDoubleOfferDecision>

  /**
   * Get preferred thinking delay for this strategy (in milliseconds)
   */
  getThinkingDelay(): ThinkingDelay

  /**
   * Initialize strategy for a new game
   */
  initialize(gameState: GameState, playerIndex: number): void

  /**
   * Update strategy based on game events
   */
  update(context: AIDecisionContext): void

  /**
   * Clean up resources when game ends
   */
  cleanup(): void
}

/**
 * Timing configuration for AI decisions
 */
export interface ThinkingDelay {
  /** Minimum thinking time in milliseconds */
  min: number
  /** Maximum thinking time in milliseconds */
  max: number
  /** Distribution type for random timing */
  distribution: 'uniform' | 'normal' | 'exponential'
  /** Whether to add "human-like" random pauses */
  humanPauses: boolean
}

/**
 * AI personality traits (for Hard AI)
 */
export interface AIPersonality {
  /** Unique personality identifier */
  id: string
  /** Personality name */
  name: string
  /** Personality description */
  description: string

  /** How aggressive the AI plays (0-1) */
  aggressiveness: number
  /** Risk tolerance (0-1) */
  riskTolerance: number
  /** How likely to bluff (0-1) */
  bluffingFrequency: number
  /** Memory strength for tracking patterns (0-1) */
  memoryStrength: number
  /** How predictable the AI is (0-1, lower is more unpredictable) */
  predictability: number
  /** Patience level (0-1, higher means waits longer) */
  patience: number

  /** Artist preferences (-1 to 1) */
  artistPreferences: Record<Artist, number>
  /** Auction type preferences */
  auctionTypePreferences: Record<string, number>
  /** Early vs late game strategy preference */
  timingPreference: 'early' | 'balanced' | 'late'
}

/**
 * Predefined personality templates
 */
export const PersonalityTemplates: Record<string, Omit<AIPersonality, 'id'>> = {
  aggressive: {
    name: 'Aggressive',
    description: 'Bids boldly, takes risks, tries to control the market',
    aggressiveness: 0.8,
    riskTolerance: 0.7,
    bluffingFrequency: 0.4,
    memoryStrength: 0.6,
    predictability: 0.7,
    patience: 0.3,
    artistPreferences: {},
    auctionTypePreferences: {
      open: 0.8,
      one_offer: 0.6,
      hidden: 0.5,
      fixed_price: 0.4,
      double: 0.7,
    },
    timingPreference: 'early',
  },

  conservative: {
    name: 'Conservative',
    description: 'Plays it safe, waits for good opportunities, preserves money',
    aggressiveness: 0.2,
    riskTolerance: 0.3,
    bluffingFrequency: 0.1,
    memoryStrength: 0.8,
    predictability: 0.4,
    patience: 0.8,
    artistPreferences: {},
    auctionTypePreferences: {
      open: 0.3,
      one_offer: 0.5,
      hidden: 0.7,
      fixed_price: 0.8,
      double: 0.4,
    },
    timingPreference: 'late',
  },

  balanced: {
    name: 'Balanced',
    description: 'Adapts to game state, makes calculated risks',
    aggressiveness: 0.5,
    riskTolerance: 0.5,
    bluffingFrequency: 0.3,
    memoryStrength: 0.7,
    predictability: 0.6,
    patience: 0.5,
    artistPreferences: {},
    auctionTypePreferences: {
      open: 0.6,
      one_offer: 0.6,
      hidden: 0.6,
      fixed_price: 0.6,
      double: 0.6,
    },
    timingPreference: 'balanced',
  },

  unpredictable: {
    name: 'Unpredictable',
    description: 'Hard to read, uses varied strategies',
    aggressiveness: 0.5,
    riskTolerance: 0.6,
    bluffingFrequency: 0.6,
    memoryStrength: 0.5,
    predictability: 0.2,
    patience: 0.4,
    artistPreferences: {},
    auctionTypePreferences: {
      open: 0.5,
      one_offer: 0.7,
      hidden: 0.8,
      fixed_price: 0.3,
      double: 0.6,
    },
    timingPreference: 'balanced',
  },
}

/**
 * Strategy configuration options
 */
export interface StrategyConfig {
  /** Base difficulty level */
  difficulty: AIDifficulty
  /** Personality for Hard AI */
  personality?: AIPersonality
  /** Custom timing overrides */
  timing?: Partial<ThinkingDelay>
  /** Debug mode settings */
  debug?: {
    enabled: boolean
    logLevel: 'none' | 'basic' | 'detailed' | 'verbose'
    saveDecisionHistory: boolean
  }
  /** Performance settings */
  performance?: {
    maxThinkingTime: number
    enableProgressiveComputation: boolean
    chunkSize: number
  }
  /** Learning settings (for future ML integration) */
  learning?: {
    enabled: boolean
    adaptationRate: number
    experienceWeight: number
  }
}

/**
 * Strategy factory interface
 */
export interface AIStrategyFactory {
  /**
   * Create a new AI strategy instance
   */
  create(config: StrategyConfig): AIStrategy

  /**
   * Get available strategy types
   */
  getAvailableStrategies(): AIDifficulty[]

  /**
   * Get default configuration for difficulty level
   */
  getDefaultConfig(difficulty: AIDifficulty): StrategyConfig
}

/**
 * Strategy metrics for performance monitoring
 */
export interface StrategyMetrics {
  /** Total decisions made */
  totalDecisions: number
  /** Average decision time */
  averageDecisionTime: number
  /** Decision confidence average */
  averageConfidence: number
  /** Success rate (how often decisions lead to good outcomes) */
  successRate: number
  /** Breakdown by decision type */
  decisionBreakdown: Record<string, number>
  /** Performance by auction type */
  auctionPerformance: Record<string, number>
  /** Memory usage */
  memoryUsage: number
  /** Last updated timestamp */
  lastUpdated: number
}

/**
 * Strategy validation result
 */
export interface StrategyValidationResult {
  /** Is the strategy valid */
  isValid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
  /** Performance metrics */
  metrics: StrategyMetrics
}