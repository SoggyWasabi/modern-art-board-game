// ===================
// AI ERROR REPORTER
// ===================

import type { AIError } from './ai-error'

/**
 * Reports and logs AI errors for debugging and monitoring
 */
export class ErrorReporter {
  private errorLog: AIError[] = []
  private maxLogSize = 1000

  /**
   * Report an error
   */
  report(error: AIError): void {
    // Add to in-memory log
    this.errorLog.push(error)

    // Trim log if needed
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(error)
    }

    // Could also send to external monitoring service
    this.sendToMonitoring(error)
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 50): AIError[] {
    return this.errorLog.slice(-count)
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: AIError['category']): AIError[] {
    return this.errorLog.filter(error => error.category === category)
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: string): AIError[] {
    return this.errorLog.filter(error => error.code === code)
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    total: number
    byCategory: Record<string, number>
    byCode: Record<string, number>
    bySeverity: Record<string, number>
    recoverableRate: number
    recentTrend: 'improving' | 'stable' | 'degrading'
  } {
    const byCategory: Record<string, number> = {}
    const byCode: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    let recoverableCount = 0

    this.errorLog.forEach(error => {
      // Count by category
      byCategory[error.category] = (byCategory[error.category] || 0) + 1

      // Count by code
      byCode[error.code] = (byCode[error.code] || 0) + 1

      // Count by severity
      const severity = error.getSeverity()
      bySeverity[severity] = (bySeverity[severity] || 0) + 1

      // Count recoverable
      if (error.isRecoverable()) {
        recoverableCount++
      }
    })

    const recentTrend = this.calculateTrend()

    return {
      total: this.errorLog.length,
      byCategory,
      byCode,
      bySeverity,
      recoverableRate: this.errorLog.length > 0 ? recoverableCount / this.errorLog.length : 0,
      recentTrend,
    }
  }

  /**
   * Calculate error trend
   */
  private calculateTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.errorLog.length < 20) {
      return 'stable'
    }

    // Compare recent errors to older errors
    const recentCount = this.errorLog.slice(-10).length
    const olderCount = this.errorLog.slice(-20, -10).length

    if (recentCount < olderCount * 0.8) {
      return 'improving'
    } else if (recentCount > olderCount * 1.2) {
      return 'degrading'
    }

    return 'stable'
  }

  /**
   * Log to console
   */
  private logToConsole(error: AIError): void {
    const severity = error.getSeverity().toUpperCase()
    const icon = this.getSeverityIcon(error.getSeverity())

    console.group(`${icon} AI Error [${severity}] ${error.code}`)
    console.error('Message:', error.message)
    console.log('Category:', error.category)
    console.log('Recoverable:', error.isRecoverable())
    console.log('Fallback Action:', error.getFallbackAction())

    if (error.context) {
      console.log('Context:', error.context)
    }

    console.log('Stack:', error.stack)
    console.groupEnd()
  }

  /**
   * Get severity icon for console output
   */
  private getSeverityIcon(severity: ReturnType<AIError['getSeverity']>): string {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '⚡'
      case 'low':
        return 'ℹ️'
      default:
        return '❓'
    }
  }

  /**
   * Send to external monitoring service
   */
  private sendToMonitoring(error: AIError): void {
    // In production, this could send to services like:
    // - Sentry
    // - DataDog
    // - Custom monitoring API

    // For now, we'll just store locally
    // This could be enhanced with actual monitoring integration
  }

  /**
   * Export error data for analysis
   */
  exportData(): string {
    const summary = this.getErrorSummary()
    const errors = this.errorLog.map(error => error.toJSON())

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary,
      errors,
    }, null, 2)
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = []
  }
}