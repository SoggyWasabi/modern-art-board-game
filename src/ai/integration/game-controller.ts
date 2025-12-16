// ===================
// AI GAME CONTROLLER
// ===================

import type {
  GameState,
  Player,
  Card,
  GamePhase
} from '../../types/game'
import type {
  AIDecision,
  AIDecisionType
} from '../types'
import { AIManager } from '../ai-manager'
import { ErrorHandler } from '../errors/error-handler'
import { PerformanceMonitor } from '../monitoring/performance-monitor'
import {
  gameStateToAIContext,
  getDecisionTypeFromPhase,
  aiDecisionToGameAction
} from './game-engine'

/**
 * AI Game Controller
 *
 * Integrates AI system with game engine to provide automatic decision making
 * for AI players. Handles all AI interactions and maintains performance metrics.
 */
export class AIGameController {
  private aiManager: AIManager
  private errorHandler: ErrorHandler
  private performanceMonitor: PerformanceMonitor
  private activeAIs: Map<number, { difficulty: string; lastDecision?: number }> = new Map()

  constructor() {
    this.aiManager = new AIManager()
    this.errorHandler = new ErrorHandler()
    this.performanceMonitor = new PerformanceMonitor()
  }

  /**
   * Register AI players from game state
   */
  registerAIPlayers(gameState: GameState): void {
    gameState.players.forEach((player, index) => {
      if (player.isAI && player.aiDifficulty) {
        this.registerAI(index, player.aiDifficulty)
      }
    })
  }

  /**
   * Register a single AI player
   */
  registerAI(playerIndex: number, difficulty: 'easy' | 'medium' | 'hard'): void {
    this.aiManager.registerAI(playerIndex, difficulty, Date.now() + playerIndex)
    this.activeAIs.set(playerIndex, { difficulty })
  }

  /**
   * Unregister an AI player
   */
  unregisterAI(playerIndex: number): void {
    this.aiManager.unregisterAI(playerIndex)
    this.activeAIs.delete(playerIndex)
  }

  /**
   * Check if player has AI
   */
  hasAI(playerIndex: number): boolean {
    return this.activeAIs.has(playerIndex)
  }

  /**
   * Make AI decision for current game state
   */
  async makeAIDecision(
    playerIndex: number,
    gameState: GameState,
    options?: {
      timeoutMs?: number
      forceDecision?: boolean
    }
  ): Promise<{
    decision: AIDecision
    gameAction: any
    tookMs: number
    fallbackUsed: boolean
  }> {
    const startTime = performance.now()
    const measurementId = `ai-decision-${playerIndex}-${Date.now()}`

    // Check if player has AI
    if (!this.hasAI(playerIndex)) {
      throw new Error(`No AI registered for player ${playerIndex}`)
    }

    const aiInfo = this.activeAIs.get(playerIndex)!
    const decisionType = getDecisionTypeFromPhase(gameState)

    if (!decisionType) {
      // No decision needed in this phase
      throw new Error(`No AI decision needed in current game phase`)
    }

    // Start performance monitoring
    this.performanceMonitor.startMeasurement(
      measurementId,
      decisionType,
      aiInfo.difficulty as any,
      playerIndex
    )

    try {
      // Convert game state to AI context
      const aiContext = gameStateToAIContext(gameState, playerIndex)

      // Make AI decision with timeout
      const decision = await this.aiManager.makeDecision(
        playerIndex,
        decisionType,
        gameState,
        {
          timeoutMs: options?.timeoutMs || 5000,
          timeSliceController: {
            shouldContinue: () => true,
            getTimeRemaining: () => options?.timeoutMs || 5000,
          },
        }
      )

      // Convert to game action
      const gameAction = aiDecisionToGameAction(decision, gameState, playerIndex)
      const tookMs = performance.now() - startTime

      // Record successful decision
      this.performanceMonitor.endMeasurement(measurementId, true, {
        decisionQuality: this.estimateDecisionQuality(decision, gameState),
        confidence: 0.8, // Default confidence
      })

      // Update last decision time
      aiInfo.lastDecision = Date.now()

      return {
        decision,
        gameAction,
        tookMs,
        fallbackUsed: false,
      }
    } catch (error) {
      // Handle error and provide fallback
      const fallbackDecision = await this.errorHandler.handleError(
        error as any,
        gameStateToAIContext(gameState, playerIndex)
      )

      const gameAction = aiDecisionToGameAction(
        fallbackDecision.decision,
        gameState,
        playerIndex
      )
      const tookMs = performance.now() - startTime

      // Record failed decision
      this.performanceMonitor.endMeasurement(measurementId, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: fallbackDecision.fallbackUsed,
      })

      return {
        decision: fallbackDecision.decision,
        gameAction,
        tookMs,
        fallbackUsed: fallbackDecision.fallbackUsed,
      }
    }
  }

  /**
   * Get all AI decisions for current state
   */
  async getAllAIDecisions(
    gameState: GameState,
    options?: {
      timeoutMs?: number
      concurrent?: boolean
    }
  ): Promise<Array<{
    playerIndex: number
    decision: AIDecision
    gameAction: any
    tookMs: number
    fallbackUsed: boolean
  }>> {
    const decisionType = getDecisionTypeFromPhase(gameState)
    if (!decisionType) {
      return []
    }

    // Get active players based on game phase
    let activePlayerIndices: number[] = []

    if (gameState.round.phase.type === 'awaiting_card_play') {
      activePlayerIndices = [gameState.round.phase.activePlayerIndex]
    } else if (gameState.round.phase.type === 'auction') {
      // All players might need to bid in auction
      activePlayerIndices = gameState.players
        .map((_, index) => index)
        .filter(index => this.hasAI(index))
    }

    if (options?.concurrent) {
      // Make decisions concurrently
      const promises = activePlayerIndices.map(playerIndex =>
        this.makeAIDecision(playerIndex, gameState, options)
      )

      const decisions = await Promise.all(promises)

      return decisions.map((decision, index) => ({
        playerIndex: activePlayerIndices[index],
        ...decision,
      }))
    } else {
      // Make decisions sequentially
      const results = []

      for (const playerIndex of activePlayerIndices) {
        try {
          const result = await this.makeAIDecision(playerIndex, gameState, options)
          results.push({
            playerIndex,
            ...result,
          })
        } catch (error) {
          console.error(`AI decision failed for player ${playerIndex}:`, error)
          // Continue with other players
        }
      }

      return results
    }
  }

  /**
   * Update AI strategies with new game state
   */
  updateAI(gameState: GameState): void {
    this.activeAIs.forEach((_, playerIndex) => {
      if (this.hasAI(playerIndex)) {
        const aiContext = gameStateToAIContext(gameState, playerIndex)
        this.aiManager.updateAI(playerIndex, aiContext)
      }
    })
  }

  /**
   * Get AI performance statistics
   */
  getPerformanceStats(playerIndex?: number) {
    return this.performanceMonitor.getMetrics({
      playerId: playerIndex,
    })
  }

  /**
   * Get AI error statistics
   */
  getErrorStats(playerIndex?: number) {
    return this.errorHandler.getErrorStats(playerIndex)
  }

  /**
   * Check if any AI has systemic issues
   */
  hasSystemicIssues(playerIndex?: number): boolean {
    return this.errorHandler.hasSystemicIssues(playerIndex)
  }

  /**
   * Reset AI state (for new games)
   */
  reset(): void {
    this.aiManager = new AIManager()
    this.errorHandler = new ErrorHandler()
    this.performanceMonitor.clearMeasurements()
    this.activeAIs.clear()
  }

  /**
   * Cleanup AI resources
   */
  cleanup(): void {
    this.aiManager.cleanup()
    this.errorHandler.clearHistory()
    this.performanceMonitor.clearMeasurements()
  }

  /**
   * Estimate decision quality (simplified heuristic)
   */
  private estimateDecisionQuality(decision: AIDecision, gameState: GameState): number {
    // Simple heuristic - in reality this would be more sophisticated
    if (decision.type === 'card_play' && decision.card) {
      // Check if card play makes sense
      const player = gameState.players[gameState.round.phase.type === 'awaiting_card_play' ?
        gameState.round.phase.activePlayerIndex : 0]
      if (player && player.hand.includes(decision.card)) {
        return 0.8
      }
    }

    if (decision.type === 'bid' && decision.action === 'bid' && decision.amount) {
      // Check if bid is reasonable (not over money)
      const playerIndex = gameState.round.phase.type === 'awaiting_card_play' ?
        gameState.round.phase.activePlayerIndex : 0
      const player = gameState.players[playerIndex]

      if (player && decision.amount <= player.money) {
        return 0.7
      }
    }

    return 0.5 // Default quality
  }

  /**
   * Export AI data for debugging
   */
  exportData() {
    return {
      performance: this.performanceMonitor.exportData(),
      errors: this.errorHandler.getRecentErrors(100),
      activeAIs: Array.from(this.activeAIs.entries()),
    }
  }
}