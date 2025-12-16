// ===================
// AI INTEGRATION FACTORY
// ===================

import type { GameState } from '../../types/game'
import { AIGameController } from './game-controller'

/**
 * AI Integration configuration
 */
export interface AIIntegrationConfig {
  enablePerformanceMonitoring: boolean
  enableErrorHandling: boolean
  enableProfiling: boolean
  defaultTimeout: number
  concurrentDecisions: boolean
}

/**
 * Default AI integration configuration
 */
const DEFAULT_CONFIG: AIIntegrationConfig = {
  enablePerformanceMonitoring: true,
  enableErrorHandling: true,
  enableProfiling: process.env.NODE_ENV === 'development',
  defaultTimeout: 5000,
  concurrentDecisions: false, // Safer default for consistency
}

/**
 * Create AI integration with game engine
 */
export function createAIIntegration(config?: Partial<AIIntegrationConfig>): {
  controller: AIGameController
  initializeGame: (gameState: GameState) => void
  makeDecision: (playerIndex: number, gameState: GameState) => Promise<any>
  getAllDecisions: (gameState: GameState) => Promise<any[]>
  updateGame: (gameState: GameState) => void
  getStats: (playerIndex?: number) => any
  reset: () => void
  cleanup: () => void
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const controller = new AIGameController()

  return {
    controller,

    /**
     * Initialize AI players from game state
     */
    initializeGame(gameState: GameState) {
      controller.registerAIPlayers(gameState)
    },

    /**
     * Make single AI decision
     */
    async makeDecision(playerIndex: number, gameState: GameState) {
      const result = await controller.makeAIDecision(playerIndex, gameState, {
        timeoutMs: finalConfig.defaultTimeout,
      })

      return result.gameAction
    },

    /**
     * Get all AI decisions for current state
     */
    async getAllDecisions(gameState: GameState) {
      const decisions = await controller.getAllAIDecisions(gameState, {
        timeoutMs: finalConfig.defaultTimeout,
        concurrent: finalConfig.concurrentDecisions,
      })

      return decisions.map(d => d.gameAction)
    },

    /**
     * Update AI with new game state
     */
    updateGame(gameState: GameState) {
      controller.updateAI(gameState)
    },

    /**
     * Get AI statistics
     */
    getStats(playerIndex?: number) {
      const performance = controller.getPerformanceStats(playerIndex)
      const errors = controller.getErrorStats(playerIndex)

      return {
        performance: performance.getSummary(),
        errors,
        hasIssues: controller.hasSystemicIssues(playerIndex),
      }
    },

    /**
     * Reset AI state
     */
    reset() {
      controller.reset()
    },

    /**
     * Cleanup AI resources
     */
    cleanup() {
      controller.cleanup()
    },
  }
}