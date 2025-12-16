// ===================
// AI ERROR FACTORY
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
import {
  AIStrategyError,
  StrategyNotImplementedError,
  StrategyConfigurationError,
  StrategyComputationError,
} from './strategy-error'
import {
  AIComputationError,
  NumericalError,
  ConvergenceError,
  MemoryError,
} from './computation-error'
import {
  AIValidationError,
  InvalidGameStateError,
  InvalidCardError,
  InvalidArtistError,
  InvalidDecisionParametersError,
  ConstraintViolationError,
} from './validation-error'

/**
 * Factory for creating AI errors with proper context
 */
export class ErrorFactory {
  /**
   * Create decision error
   */
  static decisionError(
    message: string,
    decisionType: AIDecisionType,
    phase: 'analysis' | 'computation' | 'selection' | 'validation',
    context?: Partial<AIDecisionContext>
  ): AIDecisionError {
    return new AIDecisionError(message, decisionType, phase, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create no valid decisions error
   */
  static noValidDecision(
    decisionType: AIDecisionType,
    attemptedDecisions: AIDecision[],
    context?: Partial<AIDecisionContext>
  ): NoValidDecisionError {
    return new NoValidDecisionError(decisionType, attemptedDecisions, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create timeout error
   */
  static timeout(
    decisionType: AIDecisionType,
    timeoutMs: number,
    context?: Partial<AIDecisionContext>
  ): DecisionTimeoutError {
    return new DecisionTimeoutError(decisionType, timeoutMs, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create strategy error
   */
  static strategyError(
    message: string,
    difficulty: AIDifficulty,
    component: string,
    context?: Partial<AIDecisionContext>
  ): AIStrategyError {
    return new AIStrategyError(message, difficulty, component, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create strategy not implemented error
   */
  static strategyNotImplemented(
    difficulty: AIDifficulty,
    component: string,
    context?: Partial<AIDecisionContext>
  ): StrategyNotImplementedError {
    return new StrategyNotImplementedError(difficulty, component, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create numerical error
   */
  static numericalError(
    operation: string,
    issue: 'overflow' | 'underflow' | 'division_by_zero' | 'invalid_number' | 'precision_loss',
    value?: number,
    context?: Partial<AIDecisionContext>
  ): NumericalError {
    const computationType = this.inferComputationType(operation)
    return new NumericalError(computationType, operation, issue, value, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create validation error
   */
  static validationError(
    message: string,
    type: 'input' | 'output' | 'state' | 'constraints',
    invalidValue?: any,
    context?: Partial<AIDecisionContext>
  ): AIValidationError {
    return new AIValidationError(message, type, invalidValue, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create invalid game state error
   */
  static invalidGameState(
    gameState: GameState,
    issue: string,
    context?: Partial<AIDecisionContext>
  ): InvalidGameStateError {
    return new InvalidGameStateError(gameState, issue, {
      playerId: context?.playerIndex,
      timestamp: new Date(),
    })
  }

  /**
   * Create invalid card error
   */
  static invalidCard(
    card: Card,
    issue: string,
    context?: Partial<AIDecisionContext>
  ): InvalidCardError {
    return new InvalidCardError(card, issue, {
      playerId: context?.playerIndex,
      timestamp: new Date(),
    })
  }

  /**
   * Create critical error
   */
  static critical(
    message: string,
    context?: Partial<AIDecisionContext>
  ): CriticalAIError {
    return new CriticalAIError(message, {
      playerId: context?.playerIndex,
      gameState: context?.gameState,
      timestamp: new Date(),
    })
  }

  /**
   * Create error from exception
   */
  static fromException(
    exception: Error,
    context?: Partial<AIDecisionContext>
  ): AIError {
    // Try to categorize the exception
    if (exception.name === 'RangeError' || exception.message.includes('overflow')) {
      return this.numericalError('unknown', 'overflow', undefined, context)
    }

    if (exception.name === 'TypeError' && exception.message.includes('null')) {
      return this.validationError(
        `Null reference error: ${exception.message}`,
        'input',
        null,
        context
      )
    }

    // Generic error wrapper
    return new AIStrategyError(
      `Unexpected error: ${exception.message}`,
      'hard', // Assume hard difficulty for unexpected errors
      'unknown',
      {
        playerId: context?.playerIndex,
        gameState: context?.gameState,
        timestamp: new Date(),
        stackTrace: exception.stack,
      }
    )
  }

  /**
   * Infer computation type from operation description
   */
  private static inferComputationType(operation: string): AIComputationError['computationType'] {
    const op = operation.toLowerCase()

    if (op.includes('expected') || op.includes('value') || op.includes('ev')) {
      return 'expected_value'
    }
    if (op.includes('probability') || op.includes('prob') || op.includes('chance')) {
      return 'probability'
    }
    if (op.includes('monte') || op.includes('simulation') || op.includes('random')) {
      return 'monte_carlo'
    }
    if (op.includes('market') || op.includes('artist') || op.includes('competitiveness')) {
      return 'market_analysis'
    }
    if (op.includes('optimiz') || op.includes('maximiz') || op.includes('minimiz')) {
      return 'optimization'
    }

    return 'expected_value' // Default fallback
  }
}