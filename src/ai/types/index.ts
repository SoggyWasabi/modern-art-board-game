// ===================
// AI TYPES EXPORT
// ===================

// Decision types
export type {
  AIDecision,
  AICardPlayDecision,
  AIBidDecision,
  AIFixedPriceDecision,
  AIDoubleOfferDecision,
  AIHiddenBidDecision,
  AIOneOfferBidDecision,
  AnyAIDecision,
} from './decisions'

export {
  AIDecisionGuards,
  AIDecisionFactory,
} from './decisions'

// Knowledge types
export type {
  VisibleGameState,
  PlayerInfo,
  MarketAnalysis,
  ArtistCompetitiveness,
  CardEvaluation,
  OpponentModel,
  PlayerTendencies,
  BidPattern,
  BidRecord,
  AIMemory,
  MoneyChangeRecord,
  ArtistRankingRecord,
  GameEvent,
  AIDecisionContext,
} from './knowledge'

// Strategy types
export type {
  AIStrategy,
  AIDifficulty,
  ThinkingDelay,
  AIPersonality,
  StrategyConfig,
  AIStrategyFactory,
  StrategyMetrics,
  StrategyValidationResult,
} from './strategies'

// Export PersonalityTemplates as a value
export { PersonalityTemplates } from './strategies'