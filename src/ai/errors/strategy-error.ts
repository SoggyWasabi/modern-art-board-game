// ===================
// AI STRATEGY ERROR
// ===================

import type { AIDifficulty } from '../types'
import { AIError } from './ai-error'

/**
 * Error in AI strategy implementation
 */
export class AIStrategyError extends AIError {
  readonly code = 'AI_STRATEGY_ERROR'
  readonly category = 'strategy' as const

  constructor(
    message: string,
    public readonly difficulty: AIDifficulty,
    public readonly strategyComponent: string,
    context?: AIStrategyError['context']
  ) {
    super(message, {
      ...context,
      timestamp: context?.timestamp || new Date(),
    })
  }

  getFallbackAction(): string {
    switch (this.difficulty) {
      case 'easy':
        return 'Use random fallback strategy'
      case 'medium':
        return 'Use basic EV-based fallback'
      case 'hard':
        return 'Use medium AI as fallback'
      default:
        return 'Use safe default strategy'
    }
  }
}

/**
 * Strategy not implemented
 */
export class StrategyNotImplementedError extends AIStrategyError {
  readonly code = 'STRATEGY_NOT_IMPLEMENTED'

  constructor(
    difficulty: AIDifficulty,
    strategyComponent: string,
    context?: AIStrategyError['context']
  ) {
    super(
      `Strategy component not implemented: ${strategyComponent} for difficulty: ${difficulty}`,
      difficulty,
      strategyComponent,
      context
    )
  }

  getSeverity(): 'high' {
    return 'high'
  }
}

/**
 * Strategy configuration error
 */
export class StrategyConfigurationError extends AIStrategyError {
  readonly code = 'STRATEGY_CONFIGURATION_ERROR'

  constructor(
    difficulty: AIDifficulty,
    strategyComponent: string,
    public readonly configError: string,
    context?: AIStrategyError['context']
  ) {
    super(
      `Strategy configuration error in ${strategyComponent}: ${configError}`,
      difficulty,
      strategyComponent,
      context
    )
  }
}

/**
 * Strategy computation error
 */
export class StrategyComputationError extends AIStrategyError {
  readonly code = 'STRATEGY_COMPUTATION_ERROR'

  constructor(
    difficulty: AIDifficulty,
    strategyComponent: string,
    public readonly computationError: Error,
    context?: AIStrategyError['context']
  ) {
    super(
      `Strategy computation error in ${strategyComponent}: ${computationError.message}`,
      difficulty,
      strategyComponent,
      {
        ...context,
        stackTrace: computationError.stack,
      }
    )
  }

  getSeverity(): 'medium' | 'high' {
    return this.strategyComponent === 'core' ? 'high' : 'medium'
  }
}