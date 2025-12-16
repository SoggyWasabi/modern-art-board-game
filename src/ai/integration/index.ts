// ===================
// AI INTEGRATION EXPORT
// ===================

export { AIGameController } from './game-controller'
export {
  gameStateToAIContext,
  getDecisionTypeFromPhase,
  aiDecisionToGameAction,
} from './game-engine'

// Integration utilities
export { createAIIntegration } from './factory'