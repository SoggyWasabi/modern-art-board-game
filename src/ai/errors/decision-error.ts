// ===================
// AI DECISION ERROR
// ===================

import type { AIDecision, AIDecisionType } from '../types'
import { AIError } from './ai-error'

/**
 * Error during AI decision making process
 */
export class AIDecisionError extends AIError {
  readonly code = 'AI_DECISION_ERROR'
  readonly category = 'decision' as const

  constructor(
    message: string,
    public readonly decisionType: AIDecisionType,
    public readonly phase: 'analysis' | 'computation' | 'selection' | 'validation',
    context?: AIDecisionError['context']
  ) {
    super(message, {
      ...context,
      timestamp: context?.timestamp || new Date(),
    })
  }

  getSeverity(): 'medium' | 'high' {
    return this.phase === 'validation' ? 'high' : 'medium'
  }

  getFallbackAction(): string {
    switch (this.decisionType) {
      case 'card_play':
        return 'Play random valid card'
      case 'bid':
        return 'Pass bid'
      case 'hidden_bid':
        return 'Pass hidden bid'
      case 'buy':
        return 'Pass purchase'
      case 'fixed_price':
        return 'Decline fixed price'
      default:
        return 'Take default action'
    }
  }
}

/**
 * No valid decisions available
 */
export class NoValidDecisionError extends AIDecisionError {
  readonly code = 'NO_VALID_DECISION'

  constructor(
    decisionType: AIDecisionType,
    public readonly attemptedDecisions: AIDecision[],
    context?: AIDecisionError['context']
  ) {
    super(
      `No valid decisions available for type: ${decisionType}. Attempted: ${attemptedDecisions.length}`,
      decisionType,
      'selection',
      context
    )
  }

  getSeverity(): 'high' {
    return 'high'
  }

  getFallbackAction(): string {
    return 'Use emergency fallback decision'
  }
}

/**
 * Decision timeout error
 */
export class DecisionTimeoutError extends AIDecisionError {
  readonly code = 'DECISION_TIMEOUT'

  constructor(
    decisionType: AIDecisionType,
    public readonly timeoutMs: number,
    context?: AIDecisionError['context']
  ) {
    super(
      `Decision timeout for type: ${decisionType} after ${timeoutMs}ms`,
      decisionType,
      'computation',
      context
    )
  }

  getSeverity(): 'high' {
    return 'high'
  }

  getFallbackAction(): string {
    return 'Use quick fallback decision'
  }
}

/**
 * Invalid decision format
 */
export class InvalidDecisionError extends AIDecisionError {
  readonly code = 'INVALID_DECISION'

  constructor(
    decisionType: AIDecisionType,
    public readonly decision: AIDecision,
    public readonly validationErrors: string[],
    context?: AIDecisionError['context']
  ) {
    super(
      `Invalid decision for type: ${decisionType}. Errors: ${validationErrors.join(', ')}`,
      decisionType,
      'validation',
      context
    )
  }

  getFallbackAction(): string {
    return 'Correct decision fields or use fallback'
  }
}