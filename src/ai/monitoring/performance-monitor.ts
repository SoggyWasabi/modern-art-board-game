// ===================
// AI PERFORMANCE MONITOR
// ===================

import type { AIDecisionType, AIDifficulty } from '../types'
import type { AIDecisionContext } from '../types'
import { AIMetrics } from './metrics'
import { ResourceTracker } from './resource-tracker'

/**
 * Performance metrics for a single AI operation
 */
export interface AIMeasurement {
  id: string
  type: AIDecisionType
  difficulty: AIDifficulty
  playerId: number

  // Timing metrics
  startTime: number
  endTime: number
  duration: number

  // Memory metrics
  memoryBefore: number
  memoryAfter: number
  memoryDelta: number

  // Decision quality metrics
  decisionQuality?: number
  confidence?: number

  // System metrics
  cpuUsage?: number
  timeSliceCount?: number

  // Metadata
  success: boolean
  error?: string
  fallbackUsed: boolean
  timestamp: Date
}

/**
 * Monitors AI performance and resource usage
 */
export class PerformanceMonitor {
  private measurements: AIMeasurement[] = []
  private currentMeasurements: Map<string, Partial<AIMeasurement>> = new Map()
  private resourceTracker = new ResourceTracker()
  private maxMeasurements = 1000

  /**
   * Start monitoring a new AI operation
   */
  startMeasurement(
    id: string,
    type: AIDecisionType,
    difficulty: AIDifficulty,
    playerId: number
  ): void {
    const startTime = performance.now()
    const memoryBefore = this.resourceTracker.getCurrentMemoryUsage()

    this.currentMeasurements.set(id, {
      id,
      type,
      difficulty,
      playerId,
      startTime,
      memoryBefore,
      timestamp: new Date(),
    })
  }

  /**
   * End monitoring and record measurement
   */
  endMeasurement(
    id: string,
    success: boolean,
    metadata?: {
      decisionQuality?: number
      confidence?: number
      timeSliceCount?: number
      error?: string
      fallbackUsed?: boolean
    }
  ): AIMeasurement | null {
    const current = this.currentMeasurements.get(id)
    if (!current) {
      return null
    }

    const endTime = performance.now()
    const memoryAfter = this.resourceTracker.getCurrentMemoryUsage()
    const duration = endTime - (current.startTime || 0)

    const measurement: AIMeasurement = {
      id,
      type: current.type!,
      difficulty: current.difficulty!,
      playerId: current.playerId!,
      startTime: current.startTime!,
      endTime,
      duration,
      memoryBefore: current.memoryBefore!,
      memoryAfter,
      memoryDelta: memoryAfter - current.memoryBefore!,
      success,
      fallbackUsed: metadata?.fallbackUsed || false,
      timestamp: current.timestamp!,
      ...metadata,
    }

    // Record measurement
    this.recordMeasurement(measurement)

    // Clean up current measurement
    this.currentMeasurements.delete(id)

    return measurement
  }

  /**
   * Record a completed measurement
   */
  private recordMeasurement(measurement: AIMeasurement): void {
    this.measurements.push(measurement)

    // Trim measurements if needed
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(-this.maxMeasurements)
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(filter?: {
    difficulty?: AIDifficulty
    type?: AIDecisionType
    playerId?: number
    timeRange?: { start: Date; end: Date }
  }): AIMetrics {
    let filtered = this.measurements

    // Apply filters
    if (filter) {
      if (filter.difficulty) {
        filtered = filtered.filter(m => m.difficulty === filter.difficulty)
      }
      if (filter.type) {
        filtered = filtered.filter(m => m.type === filter.type)
      }
      if (filter.playerId) {
        filtered = filtered.filter(m => m.playerId === filter.playerId)
      }
      if (filter.timeRange) {
        filtered = filtered.filter(m =>
          m.timestamp >= filter.timeRange!.start &&
          m.timestamp <= filter.timeRange!.end
        )
      }
    }

    return new AIMetrics(filtered)
  }

  /**
   * Get recent measurements
   */
  getRecentMeasurements(count: number = 50): AIMeasurement[] {
    return this.measurements.slice(-count)
  }

  /**
   * Get measurements by player
   */
  getPlayerMeasurements(playerId: number): AIMeasurement[] {
    return this.measurements.filter(m => m.playerId === playerId)
  }

  /**
   * Check if performance is degrading
   */
  isPerformanceDegrading(playerId?: number, windowSize: number = 10): boolean {
    const recent = this.getRecentMeasurements(windowSize)
    const filtered = playerId ? recent.filter(m => m.playerId === playerId) : recent

    if (filtered.length < windowSize) {
      return false
    }

    // Compare average duration of recent measurements to earlier ones
    const recentAvg = filtered.slice(-5).reduce((sum, m) => sum + m.duration, 0) / 5
    const earlierAvg = filtered.slice(-10, -5).reduce((sum, m) => sum + m.duration, 0) / 5

    return recentAvg > earlierAvg * 1.5 // 50% slower
  }

  /**
   * Get resource usage summary
   */
  getResourceUsageSummary(): {
    averageMemoryDelta: number
    maxMemoryDelta: number
    totalMemoryUsed: number
    averageCpuUsage: number
    averageTimeSlices: number
  } {
    if (this.measurements.length === 0) {
      return {
        averageMemoryDelta: 0,
        maxMemoryDelta: 0,
        totalMemoryUsed: 0,
        averageCpuUsage: 0,
        averageTimeSlices: 0,
      }
    }

    const memoryDeltas = this.measurements.map(m => m.memoryDelta)
    const cpuUsages = this.measurements.map(m => m.cpuUsage || 0)
    const timeSlices = this.measurements.map(m => m.timeSliceCount || 0)

    return {
      averageMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
      maxMemoryDelta: Math.max(...memoryDeltas),
      totalMemoryUsed: this.resourceTracker.getTotalMemoryUsed(),
      averageCpuUsage: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
      averageTimeSlices: timeSlices.reduce((a, b) => a + b, 0) / timeSlices.length,
    }
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    this.measurements = []
    this.currentMeasurements.clear()
    this.resourceTracker.reset()
  }

  /**
   * Export performance data
   */
  exportData(): string {
    const summary = this.getResourceUsageSummary()
    const metrics = this.getMetrics()

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary,
      metrics: metrics.getSummary(),
      measurements: this.measurements,
    }, null, 2)
  }
}