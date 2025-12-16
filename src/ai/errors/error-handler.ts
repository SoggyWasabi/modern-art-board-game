// ===================
// AI ERROR HANDLER
// ===================

import type {
  AIDecision,
  AIDecisionType,
  AIDifficulty,
  GameState,
  Card,
  Artist
} from '../../types/game'
import type { AIDecisionContext } from '../types'
import {
  AIError,
  CriticalAIError,
} from './ai-error'
import {
  AIDecisionError,
  NoValidDecisionError,
  DecisionTimeoutError,
  InvalidDecisionError,
} from './decision-error'
import { ErrorFactory } from './error-factory'

/**
 * Handles AI errors with fallback decisions and recovery strategies
 */
export class ErrorHandler {
  private errorHistory: Map<string, AIError[]> = new Map()

  /**
   * Handle AI error and return fallback decision
   */
  async handleError(
    error: AIError,
    context: AIDecisionContext,
    fallbackDecision?: AIDecision
  ): Promise<{
    decision: AIDecision
    errorHandled: boolean
    fallbackUsed: boolean
  }> {
    // Record error
    this.recordError(error, context.playerIndex)

    // Try to recover based on error type
    try {
      const fallbackDecision = await this.createFallbackDecision(error, context)

      return {
        decision: fallbackDecision,
        errorHandled: true,
        fallbackUsed: true,
      }
    } catch (fallbackError) {
      // Last resort: create emergency decision
      const emergencyDecision = this.createEmergencyDecision(error, context)

      return {
        decision: emergencyDecision,
        errorHandled: false,
        fallbackUsed: true,
      }
    }
  }

  /**
   * Create fallback decision based on error type
   */
  private async createFallbackDecision(
    error: AIError,
    context: AIDecisionContext
  ): Promise<AIDecision> {
    if (error instanceof CriticalAIError) {
      // For critical errors, use emergency fallback immediately
      throw new Error('Critical error - skipping to emergency fallback')
    }

    if (error instanceof AIDecisionError) {
      return this.createDecisionFallback(error, context)
    }

    // For other errors, try to infer decision type from context
    const decisionType = this.inferDecisionType(context)
    return this.createGenericFallback(decisionType, context)
  }

  /**
   * Create decision-specific fallback
   */
  private async createDecisionFallback(
    error: AIDecisionError,
    context: AIDecisionContext
  ): Promise<AIDecision> {
    const { gameState, playerIndex } = context
    const player = gameState.players[playerIndex]

    switch (error.decisionType) {
      case 'card_play':
        return {
          type: 'card_play',
          action: 'play_card',
          card: player.hand[0] || null, // First card or null if empty
        }

      case 'bid':
        return {
          type: 'bid',
          action: 'pass',
        }

      case 'hidden_bid':
        return {
          type: 'hidden_bid',
          action: 'pass',
        }

      case 'buy':
        return {
          type: 'buy',
          action: 'pass',
        }

      case 'fixed_price':
        return {
          type: 'fixed_price',
          action: 'decline',
        }

      default:
        return this.createEmergencyFallback(error, context)
    }
  }

  /**
   * Create generic fallback for decision type
   */
  private createGenericFallback(
    decisionType: AIDecisionType,
    context: AIDecisionContext
  ): AIDecision {
    const { gameState, playerIndex } = context
    const player = gameState.players[playerIndex]

    switch (decisionType) {
      case 'card_play':
        return {
          type: 'card_play',
          action: 'play_card',
          card: player.hand[0] || null,
        }

      case 'bid':
        return {
          type: 'bid',
          action: 'pass',
        }

      case 'hidden_bid':
        return {
          type: 'hidden_bid',
          action: 'pass',
        }

      case 'buy':
        return {
          type: 'buy',
          action: 'pass',
        }

      case 'fixed_price':
        return {
          type: 'fixed_price',
          action: 'decline',
        }

      default:
        return {
          type: 'bid' as AIDecisionType,
          action: 'pass',
        }
    }
  }

  /**
   * Create emergency fallback decision
   */
  private createEmergencyDecision(
    error: AIError,
    context: AIDecisionContext
  ): AIDecision {
    // Emergency fallback is always to pass/skip
    return {
      type: 'bid' as AIDecisionType,
      action: 'pass',
    }
  }

  /**
   * Create emergency fallback for specific error
   */
  private createEmergencyFallback(
    error: AIDecisionError,
    context: AIDecisionContext
  ): AIDecision {
    const { gameState, playerIndex } = context

    // For timeout errors, use instant decision
    if (error instanceof DecisionTimeoutError) {
      return {
        type: error.decisionType,
        action: error.decisionType === 'card_play' ? 'play_card' : 'pass',
        card: error.decisionType === 'card_play'
          ? gameState.players[playerIndex].hand[0] || null
          : undefined,
      }
    }

    // For invalid decisions, try to fix them
    if (error instanceof InvalidDecisionError) {
      return this.sanitizeDecision(error.decision, context)
    }

    // For no valid decisions, use emergency
    if (error instanceof NoValidDecisionError) {
      return this.createEmergencyDecision(error, context)
    }

    return this.createEmergencyDecision(error, context)
  }

  /**
   * Sanitize invalid decision
   */
  private sanitizeDecision(
    decision: AIDecision,
    context: AIDecisionContext
  ): AIDecision {
    // Basic sanitization - ensure required fields exist and are valid
    const sanitized = { ...decision }

    // Ensure action is valid
    if (!sanitized.action) {
      sanitized.action = 'pass'
    }

    // Ensure numeric fields are valid numbers
    if ('amount' in sanitized && (typeof sanitized.amount !== 'number' || isNaN(sanitized.amount))) {
      (sanitized as any).amount = 0
    }

    if ('maxBid' in sanitized && (typeof sanitized.maxBid !== 'number' || isNaN(sanitized.maxBid))) {
      (sanitized as any).maxBid = 100
    }

    return sanitized
  }

  /**
   * Infer decision type from context
   */
  private inferDecisionType(context: AIDecisionContext): AIDecisionType {
    const { gameState, playerIndex } = context
    const player = gameState.players[playerIndex]

    // If it's the player's turn and they have cards in hand, it's likely card_play
    if (player.hand.length > 0 && gameState.currentPlayer === playerIndex) {
      return 'card_play'
    }

    // If there's an active auction, it's likely a bid
    if (gameState.phase === 'auction' && gameState.currentAuction) {
      return 'bid'
    }

    // Default to bid
    return 'bid'
  }

  /**
   * Record error for analysis
   */
  private recordError(error: AIError, playerId: number): void {
    const playerKey = `player_${playerId}`
    const history = this.errorHistory.get(playerKey) || []

    history.push(error)

    // Keep only last 50 errors per player
    if (history.length > 50) {
      history.shift()
    }

    this.errorHistory.set(playerKey, history)
  }

  /**
   * Get error statistics
   */
  getErrorStats(playerId?: number): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsByCode: Record<string, number>
    recoverableErrors: number
    criticalErrors: number
  } {
    const allErrors = playerId
      ? this.errorHistory.get(`player_${playerId}`) || []
      : Array.from(this.errorHistory.values()).flat()

    const stats = {
      totalErrors: allErrors.length,
      errorsByCategory: {} as Record<string, number>,
      errorsByCode: {} as Record<string, number>,
      recoverableErrors: 0,
      criticalErrors: 0,
    }

    allErrors.forEach(error => {
      // Count by category
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1

      // Count by code
      stats.errorsByCode[error.code] = (stats.errorsByCode[error.code] || 0) + 1

      // Count recoverable vs critical
      if (error instanceof CriticalAIError) {
        stats.criticalErrors++
      } else if (error.isRecoverable()) {
        stats.recoverableErrors++
      }
    })

    return stats
  }

  /**
   * Check if error pattern suggests systemic issues
   */
  hasSystemicIssues(playerId?: number): boolean {
    const stats = this.getErrorStats(playerId)

    // Check for high error rate
    if (stats.totalErrors > 20) {
      return true
    }

    // Check for many critical errors
    if (stats.criticalErrors > 3) {
      return true
    }

    // Check for recurring errors
    const errorCounts = Object.values(stats.errorsByCode)
    if (errorCounts.some(count => count > 5)) {
      return true
    }

    return false
  }

  /**
   * Clear error history
   */
  clearHistory(playerId?: number): void {
    if (playerId) {
      this.errorHistory.delete(`player_${playerId}`)
    } else {
      this.errorHistory.clear()
    }
  }
}