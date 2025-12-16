// ===================
// BASE AI ERROR
// ===================

import type { AIDecision } from '../types'

/**
 * Base AI Error class
 */
export abstract class AIError extends Error {
  abstract readonly code: string
  abstract readonly category: 'strategy' | 'computation' | 'validation' | 'decision' | 'system'

  constructor(
    message: string,
    public readonly context?: {
      playerId?: number
      gameState?: any
      decision?: AIDecision
      timestamp?: Date
      stackTrace?: string
    }
  ) {
    super(message)
    this.name = this.constructor.name

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get error severity level
   */
  getSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    return 'medium'
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return true
  }

  /**
   * Get suggested fallback action
   */
  getFallbackAction(): string | null {
    return null
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.getSeverity(),
      recoverable: this.isRecoverable(),
      fallbackAction: this.getFallbackAction(),
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Critical AI Error that should stop AI processing
 */
export class CriticalAIError extends AIError {
  getSeverity(): 'critical' {
    return 'critical'
  }

  isRecoverable(): boolean {
    return false
  }
}