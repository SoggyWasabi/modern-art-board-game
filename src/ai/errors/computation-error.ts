// ===================
// AI COMPUTATION ERROR
// ===================

import type { GameState } from '../../types/game'
import { AIError } from './ai-error'

/**
 * Error during AI computation (mathematical, algorithmic, etc.)
 */
export class AIComputationError extends AIError {
  readonly code = 'AI_COMPUTATION_ERROR'
  readonly category = 'computation' as const

  constructor(
    message: string,
    public readonly computationType: 'expected_value' | 'probability' | 'monte_carlo' | 'market_analysis' | 'optimization',
    public readonly operation: string,
    context?: AIComputationError['context']
  ) {
    super(message, {
      ...context,
      timestamp: context?.timestamp || new Date(),
    })
  }

  getFallbackAction(): string {
    switch (this.computationType) {
      case 'expected_value':
        return 'Use simple heuristic estimation'
      case 'probability':
        return 'Use uniform probability distribution'
      case 'monte_carlo':
        return 'Use deterministic calculation'
      case 'market_analysis':
        return 'Use basic market indicators'
      case 'optimization':
        return 'Use greedy approach'
      default:
        return 'Use simple approximation'
    }
  }
}

/**
 * Numerical error (overflow, underflow, division by zero, etc.)
 */
export class NumericalError extends AIComputationError {
  readonly code = 'NUMERICAL_ERROR'

  constructor(
    computationType: AIComputationError['computationType'],
    operation: string,
    public readonly numericalIssue: 'overflow' | 'underflow' | 'division_by_zero' | 'invalid_number' | 'precision_loss',
    public readonly value?: number,
    context?: AIComputationError['context']
  ) {
    super(
      `Numerical error in ${operation}: ${numericalIssue}${value !== undefined ? ` (value: ${value})` : ''}`,
      computationType,
      operation,
      context
    )
  }

  getSeverity(): 'medium' | 'high' {
    return this.numericalIssue === 'division_by_zero' ? 'high' : 'medium'
  }

  getFallbackAction(): string {
    switch (this.numericalIssue) {
      case 'division_by_zero':
        return 'Use safe default value (1)'
      case 'overflow':
        return 'Use maximum safe value'
      case 'underflow':
        return 'Use minimum safe value'
      case 'invalid_number':
        return 'Use NaN-safe default'
      case 'precision_loss':
        return 'Use rounded value'
      default:
        return 'Use safe numerical fallback'
    }
  }
}

/**
 * Convergence error in iterative algorithms
 */
export class ConvergenceError extends AIComputationError {
  readonly code = 'CONVERGENCE_ERROR'

  constructor(
    computationType: AIComputationError['computationType'],
    operation: string,
    public readonly iterations: number,
    public readonly tolerance: number,
    context?: AIComputationError['context']
  ) {
    super(
      `Failed to converge in ${operation} after ${iterations} iterations (tolerance: ${tolerance})`,
      computationType,
      operation,
      context
    )
  }

  getFallbackAction(): string {
    return 'Use best current approximation'
  }
}

/**
 * Memory error during computation
 */
export class MemoryError extends AIComputationError {
  readonly code = 'MEMORY_ERROR'

  constructor(
    computationType: AIComputationError['computationType'],
    operation: string,
    public readonly memoryUsage?: number,
    context?: AIComputationError['context']
  ) {
    super(
      `Memory error during ${operation}${memoryUsage ? ` (usage: ${memoryUsage}MB)` : ''}`,
      computationType,
      operation,
      context
    )
  }

  getSeverity(): 'high' {
    return 'high'
  }

  getFallbackAction(): string {
    return 'Use simplified computation with lower memory footprint'
  }
}