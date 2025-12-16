// ===================
// AI METRICS
// ===================

import type { AIMeasurement, AIDecisionType, AIDifficulty } from './performance-monitor'

/**
 * Performance metrics summary
 */
export interface PerformanceSummary {
  totalMeasurements: number
  successRate: number
  averageDuration: number
  medianDuration: number
  p95Duration: number
  p99Duration: number
  averageMemoryUsage: number
  averageDecisionQuality: number
  averageConfidence: number
  errorRate: number
  fallbackRate: number
}

/**
 * Detailed performance metrics by category
 */
export interface DetailedMetrics {
  byDifficulty: Record<AIDifficulty, PerformanceSummary>
  byDecisionType: Record<AIDecisionType, PerformanceSummary>
  byTimeOfDay: Record<string, PerformanceSummary>
  trends: {
    durationTrend: 'improving' | 'stable' | 'degrading'
    successRateTrend: 'improving' | 'stable' | 'degrading'
    memoryTrend: 'improving' | 'stable' | 'degrading'
  }
}

/**
 * AI Metrics calculator and analyzer
 */
export class AIMetrics {
  private measurements: AIMeasurement[]

  constructor(measurements: AIMeasurement[]) {
    this.measurements = measurements
  }

  /**
   * Get basic performance summary
   */
  getSummary(): PerformanceSummary {
    if (this.measurements.length === 0) {
      return this.getEmptySummary()
    }

    const durations = this.measurements.map(m => m.duration)
    const memoryUsages = this.measurements.map(m => Math.abs(m.memoryDelta))
    const decisionQualities = this.measurements.map(m => m.decisionQuality || 0).filter(q => q > 0)
    const confidences = this.measurements.map(m => m.confidence || 0).filter(c => c > 0)

    return {
      totalMeasurements: this.measurements.length,
      successRate: this.calculateSuccessRate(),
      averageDuration: this.average(durations),
      medianDuration: this.median(durations),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      averageMemoryUsage: this.average(memoryUsages),
      averageDecisionQuality: decisionQualities.length > 0 ? this.average(decisionQualities) : 0,
      averageConfidence: confidences.length > 0 ? this.average(confidences) : 0,
      errorRate: this.calculateErrorRate(),
      fallbackRate: this.calculateFallbackRate(),
    }
  }

  /**
   * Get detailed metrics analysis
   */
  getDetailedMetrics(): DetailedMetrics {
    return {
      byDifficulty: this.getMetricsByDifficulty(),
      byDecisionType: this.getMetricsByDecisionType(),
      byTimeOfDay: this.getMetricsByTimeOfDay(),
      trends: this.getTrends(),
    }
  }

  /**
   * Get metrics grouped by difficulty
   */
  private getMetricsByDifficulty(): Record<AIDifficulty, PerformanceSummary> {
    const difficulties: AIDifficulty[] = ['easy', 'medium', 'hard']
    const result = {} as Record<AIDifficulty, PerformanceSummary>

    difficulties.forEach(difficulty => {
      const filtered = this.measurements.filter(m => m.difficulty === difficulty)
      const metrics = new AIMetrics(filtered)
      result[difficulty] = metrics.getSummary()
    })

    return result
  }

  /**
   * Get metrics grouped by decision type
   */
  private getMetricsByDecisionType(): Record<AIDecisionType, PerformanceSummary> {
    const types: AIDecisionType[] = ['card_play', 'bid', 'hidden_bid', 'buy', 'fixed_price']
    const result = {} as Record<AIDecisionType, PerformanceSummary>

    types.forEach(type => {
      const filtered = this.measurements.filter(m => m.type === type)
      const metrics = new AIMetrics(filtered)
      result[type] = metrics.getSummary()
    })

    return result
  }

  /**
   * Get metrics grouped by time of day
   */
  private getMetricsByTimeOfDay(): Record<string, PerformanceSummary> {
    const result: Record<string, PerformanceSummary> = {}

    // Group by hour
    const measurementsByHour = new Map<number, AIMeasurement[]>()

    this.measurements.forEach(measurement => {
      const hour = measurement.timestamp.getHours()
      const hourMeasurements = measurementsByHour.get(hour) || []
      hourMeasurements.push(measurement)
      measurementsByHour.set(hour, hourMeasurements)
    })

    // Calculate metrics for each hour
    measurementsByHour.forEach((measurements, hour) => {
      const metrics = new AIMetrics(measurements)
      result[`${hour}:00`] = metrics.getSummary()
    })

    return result
  }

  /**
   * Get performance trends
   */
  private getTrends(): DetailedMetrics['trends'] {
    if (this.measurements.length < 20) {
      return {
        durationTrend: 'stable',
        successRateTrend: 'stable',
        memoryTrend: 'stable',
      }
    }

    const recent = this.measurements.slice(-10)
    const earlier = this.measurements.slice(-20, -10)

    const recentAvgDuration = this.average(recent.map(m => m.duration))
    const earlierAvgDuration = this.average(earlier.map(m => m.duration))

    const recentSuccessRate = this.calculateSuccessRateFor(recent)
    const earlierSuccessRate = this.calculateSuccessRateFor(earlier)

    const recentAvgMemory = this.average(recent.map(m => Math.abs(m.memoryDelta)))
    const earlierAvgMemory = this.average(earlier.map(m => Math.abs(m.memoryDelta)))

    return {
      durationTrend: this.calculateTrend(recentAvgDuration, earlierAvgDuration),
      successRateTrend: this.calculateTrend(recentSuccessRate, earlierSuccessRate, true),
      memoryTrend: this.calculateTrend(recentAvgMemory, earlierAvgMemory),
    }
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): number {
    if (this.measurements.length === 0) return 0
    const successes = this.measurements.filter(m => m.success).length
    return successes / this.measurements.length
  }

  /**
   * Calculate success rate for specific measurements
   */
  private calculateSuccessRateFor(measurements: AIMeasurement[]): number {
    if (measurements.length === 0) return 0
    const successes = measurements.filter(m => m.success).length
    return successes / measurements.length
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.measurements.length === 0) return 0
    const errors = this.measurements.filter(m => !m.success).length
    return errors / this.measurements.length
  }

  /**
   * Calculate fallback rate
   */
  private calculateFallbackRate(): number {
    if (this.measurements.length === 0) return 0
    const fallbacks = this.measurements.filter(m => m.fallbackUsed).length
    return fallbacks / this.measurements.length
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    recent: number,
    earlier: number,
    higherIsBetter: boolean = false
  ): 'improving' | 'stable' | 'degrading' {
    const ratio = recent / earlier

    if (Math.abs(1 - ratio) < 0.1) {
      return 'stable'
    }

    if (higherIsBetter) {
      return ratio > 1.1 ? 'improving' : 'degrading'
    } else {
      return ratio < 0.9 ? 'improving' : 'degrading'
    }
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  }

  /**
   * Calculate median of numbers
   */
  private median(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const sorted = [...numbers].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle]
  }

  /**
   * Calculate percentile of numbers
   */
  private percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0
    const sorted = [...numbers].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * Get empty summary
   */
  private getEmptySummary(): PerformanceSummary {
    return {
      totalMeasurements: 0,
      successRate: 0,
      averageDuration: 0,
      medianDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      averageMemoryUsage: 0,
      averageDecisionQuality: 0,
      averageConfidence: 0,
      errorRate: 0,
      fallbackRate: 0,
    }
  }
}