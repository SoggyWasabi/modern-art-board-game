// ===================
// AI MODULE EXPORT
// ===================

// Main AI Manager
export { AIManager } from './ai-manager'

// Types
export type {
  AIDecision,
  AnyAIDecision,
  AICardPlayDecision,
  AIBidDecision,
  AIFixedPriceDecision,
  AIDoubleOfferDecision,
  AIHiddenBidDecision,
  AIOneOfferBidDecision,
  VisibleGameState,
  MarketAnalysis,
  CardEvaluation,
  OpponentModel,
  AIStrategy,
  AIDifficulty,
  StrategyConfig,
  ValidationResult,
} from './types'

// Type Guards and Factory
export { AIDecisionGuards, AIDecisionFactory } from './types'

// Knowledge Base
export { GameStateAnalyzer, MarketSimulator, InformationFilter } from './knowledge'

// Utilities
export {
  TimeSlicer,
  TimeSliceController,
  TimeSliceUtils,
  SeededRandom,
  ProbabilityDistribution,
  AIDecisionValidator,
  GameStateValidator,
  ValidationUtils,
  createProbabilityUtils,
} from './utils'

// Convenience function to create AI manager
export function createAIManager(): AIManager {
  return new AIManager()
}

// Get AI manager singleton (optional pattern)
let aiManagerInstance: AIManager | null = null

export function getAIManager(): AIManager {
  if (!aiManagerInstance) {
    aiManagerInstance = new AIManager()
  }
  return aiManagerInstance
}

// Reset AI manager singleton
export function resetAIManager(): void {
  if (aiManagerInstance) {
    aiManagerInstance.cleanup()
    aiManagerInstance = null
  }
}