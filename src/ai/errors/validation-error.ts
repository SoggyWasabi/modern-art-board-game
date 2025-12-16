// ===================
// AI VALIDATION ERROR
// ===================

import type { Card, Artist, AIDecision, GameState } from '../../types/game'
import { AIError } from './ai-error'

/**
 * Error during AI input/output validation
 */
export class AIValidationError extends AIError {
  readonly code = 'AI_VALIDATION_ERROR'
  readonly category = 'validation' as const

  constructor(
    message: string,
    public readonly validationType: 'input' | 'output' | 'state' | 'constraints',
    public readonly invalidValue?: any,
    context?: AIValidationError['context']
  ) {
    super(message, {
      ...context,
      timestamp: context?.timestamp || new Date(),
    })
  }

  getFallbackAction(): string {
    switch (this.validationType) {
      case 'input':
        return 'Use default input values'
      case 'output':
        return 'Use sanitized output'
      case 'state':
        return 'Reset to known good state'
      case 'constraints':
        return 'Apply constraint fixes'
      default:
        return 'Use safe defaults'
    }
  }
}

/**
 * Invalid game state
 */
export class InvalidGameStateError extends AIValidationError {
  readonly code = 'INVALID_GAME_STATE'

  constructor(
    gameState: GameState,
    public readonly stateIssue: string,
    context?: AIValidationError['context']
  ) {
    super(
      `Invalid game state: ${stateIssue}`,
      'state',
      gameState,
      context
    )
  }

  getSeverity(): 'high' {
    return 'high'
  }

  getFallbackAction(): string {
    return 'Use game state snapshot or reset'
  }
}

/**
 * Invalid card data
 */
export class InvalidCardError extends AIValidationError {
  readonly code = 'INVALID_CARD'

  constructor(
    card: Card,
    public readonly cardIssue: string,
    context?: AIValidationError['context']
  ) {
    super(
      `Invalid card: ${cardIssue}`,
      'input',
      card,
      context
    )
  }
}

/**
 * Invalid artist data
 */
export class InvalidArtistError extends AIValidationError {
  readonly code = 'INVALID_ARTIST'

  constructor(
    artist: Artist,
    public readonly artistIssue: string,
    context?: AIValidationError['context']
  ) {
    super(
      `Invalid artist: ${artistIssue}`,
      'input',
      artist,
      context
    )
  }
}

/**
 * Invalid decision parameters
 */
export class InvalidDecisionParametersError extends AIValidationError {
  readonly code = 'INVALID_DECISION_PARAMETERS'

  constructor(
    decision: AIDecision,
    public readonly parameterIssues: string[],
    context?: AIValidationError['context']
  ) {
    super(
      `Invalid decision parameters: ${parameterIssues.join(', ')}`,
      'output',
      decision,
      context
    )
  }
}

/**
 * Constraint violation
 */
export class ConstraintViolationError extends AIValidationError {
  readonly code = 'CONSTRAINT_VIOLATION'

  constructor(
    public readonly constraintName: string,
    public readonly constraintValue: any,
    public readonly actualValue: any,
    context?: AIValidationError['context']
  ) {
    super(
      `Constraint violation: ${constraintName} expected ${constraintValue}, got ${actualValue}`,
      'constraints',
      { constraint: constraintName, expected: constraintValue, actual: actualValue },
      context
    )
  }

  getSeverity(): 'medium' | 'high' {
    return this.constraintName.includes('critical') ? 'high' : 'medium'
  }
}