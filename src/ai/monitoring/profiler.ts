// ===================
// AI PERFORMANCE PROFILER
// ===================

import type { AIDecisionType, AIDifficulty } from '../types'
import type { AIDecisionContext } from '../types'

/**
 * Profile point for performance analysis
 */
export interface ProfilePoint {
  name: string
  timestamp: number
  memory?: number
  metadata?: Record<string, any>
}

/**
 * Profile session for tracking AI operation performance
 */
export class ProfileSession {
  private points: ProfilePoint[] = []
  private startTime: number
  private startMemory: number

  constructor(
    public readonly id: string,
    public readonly type: AIDecisionType,
    public readonly difficulty: AIDifficulty,
    public readonly playerId: number
  ) {
    this.startTime = performance.now()
    this.startMemory = this.getCurrentMemory()
    this.addPoint('session_start')
  }

  /**
   * Add a profile point
   */
  addPoint(name: string, metadata?: Record<string, any>): void {
    this.points.push({
      name,
      timestamp: performance.now() - this.startTime,
      memory: this.getCurrentMemory() - this.startMemory,
      metadata,
    })
  }

  /**
   * Get duration since session start
   */
  getDuration(): number {
    return performance.now() - this.startTime
  }

  /**
   * Get memory usage since session start
   */
  getMemoryUsage(): number {
    return this.getCurrentMemory() - this.startMemory
  }

  /**
   * Get all profile points
   */
  getPoints(): ProfilePoint[] {
    return [...this.points]
  }

  /**
   * Get profile summary
   */
  getSummary(): {
    id: string
    type: AIDecisionType
    difficulty: AIDifficulty
    playerId: number
    totalDuration: number
    totalMemoryUsage: number
    pointCount: number
    points: Array<{
      name: string
      timestamp: number
      memory?: number
      metadata?: Record<string, any>
    }>
  } {
    return {
      id: this.id,
      type: this.type,
      difficulty: this.difficulty,
      playerId: this.playerId,
      totalDuration: this.getDuration(),
      totalMemoryUsage: this.getMemoryUsage(),
      pointCount: this.points.length,
      points: this.points,
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemory(): number {
    // Use performance.memory if available (Chrome)
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }

    // Fallback: return 0 if memory API not available
    return 0
  }
}

/**
 * AI Performance Profiler for detailed analysis
 */
export class PerformanceProfiler {
  private activeSessions: Map<string, ProfileSession> = new Map()
  private completedSessions: ProfileSession[] = []
  private maxCompletedSessions = 100

  /**
   * Start a new profiling session
   */
  startSession(
    id: string,
    type: AIDecisionType,
    difficulty: AIDifficulty,
    playerId: number
  ): ProfileSession {
    const session = new ProfileSession(id, type, difficulty, playerId)
    this.activeSessions.set(id, session)
    return session
  }

  /**
   * End a profiling session
   */
  endSession(id: string): ProfileSession | null {
    const session = this.activeSessions.get(id)
    if (!session) {
      return null
    }

    session.addPoint('session_end')

    // Move to completed
    this.completedSessions.push(session)
    this.activeSessions.delete(id)

    // Trim completed sessions
    if (this.completedSessions.length > this.maxCompletedSessions) {
      this.completedSessions = this.completedSessions.slice(-this.maxCompletedSessions)
    }

    return session
  }

  /**
   * Get active session
   */
  getActiveSession(id: string): ProfileSession | undefined {
    return this.activeSessions.get(id)
  }

  /**
   * Add profile point to active session
   */
  addProfilePoint(sessionId: string, pointName: string, metadata?: Record<string, any>): void {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.addPoint(pointName, metadata)
    }
  }

  /**
   * Get completed sessions
   */
  getCompletedSessions(filter?: {
    type?: AIDecisionType
    difficulty?: AIDifficulty
    playerId?: number
  }): ProfileSession[] {
    let sessions = [...this.completedSessions]

    if (filter) {
      if (filter.type) {
        sessions = sessions.filter(s => s.type === filter.type)
      }
      if (filter.difficulty) {
        sessions = sessions.filter(s => s.difficulty === filter.difficulty)
      }
      if (filter.playerId) {
        sessions = sessions.filter(s => s.playerId === filter.playerId)
      }
    }

    return sessions
  }

  /**
   * Get performance bottlenecks
   */
  getBottlenecks(): Array<{
    sessionId: string
    bottlenecks: Array<{
      pointName: string
      duration: number
      memoryUsage: number
      severity: 'low' | 'medium' | 'high'
    }>
  }> {
    const bottlenecks: Array<{
      sessionId: string
      bottlenecks: Array<{
        pointName: string
        duration: number
        memoryUsage: number
        severity: 'low' | 'medium' | 'high'
      }>
    }> = []

    this.completedSessions.forEach(session => {
      const points = session.getPoints()
      const sessionBottlenecks: Array<{
        pointName: string
        duration: number
        memoryUsage: number
        severity: 'low' | 'medium' | 'high'
      }> = []

      // Analyze each interval
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]

        const duration = curr.timestamp - prev.timestamp
        const memoryUsage = Math.abs((curr.memory || 0) - (prev.memory || 0))

        const severity = this.calculateSeverity(duration, memoryUsage)

        if (severity !== 'low') {
          sessionBottlenecks.push({
            pointName: curr.name,
            duration,
            memoryUsage,
            severity,
          })
        }
      }

      if (sessionBottlenecks.length > 0) {
        bottlenecks.push({
          sessionId: session.id,
          bottlenecks: sessionBottlenecks,
        })
      }
    })

    return bottlenecks
  }

  /**
   * Calculate bottleneck severity
   */
  private calculateSeverity(duration: number, memoryUsage: number): 'low' | 'medium' | 'high' {
    // Duration thresholds (in milliseconds)
    const durationThresholds = {
      high: 1000,
      medium: 500,
    }

    // Memory thresholds (in MB)
    const memoryThresholds = {
      high: 50 * 1024 * 1024, // 50MB
      medium: 20 * 1024 * 1024, // 20MB
    }

    const durationSeverity = duration >= durationThresholds.high ? 'high' :
      duration >= durationThresholds.medium ? 'medium' : 'low'

    const memorySeverity = memoryUsage >= memoryThresholds.high ? 'high' :
      memoryUsage >= memoryThresholds.medium ? 'medium' : 'low'

    // Return the higher severity
    return durationSeverity === 'high' || memorySeverity === 'high' ? 'high' :
      durationSeverity === 'medium' || memorySeverity === 'medium' ? 'medium' : 'low'
  }

  /**
   * Get average performance by operation
   */
  getAveragePerformance(): Record<string, {
    averageDuration: number
    averageMemoryUsage: number
    sampleCount: number
  }> {
    const performance: Record<string, {
      totalDuration: number
      totalMemoryUsage: number
      sampleCount: number
    }> = {}

    this.completedSessions.forEach(session => {
      const points = session.getPoints()

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const operationName = curr.name

        if (!performance[operationName]) {
          performance[operationName] = {
            totalDuration: 0,
            totalMemoryUsage: 0,
            sampleCount: 0,
          }
        }

        const duration = curr.timestamp - prev.timestamp
        const memoryUsage = Math.abs((curr.memory || 0) - (prev.memory || 0))

        performance[operationName].totalDuration += duration
        performance[operationName].totalMemoryUsage += memoryUsage
        performance[operationName].sampleCount++
      }
    })

    // Convert to averages
    const result: Record<string, {
      averageDuration: number
      averageMemoryUsage: number
      sampleCount: number
    }> = {}

    Object.entries(performance).forEach(([operation, stats]) => {
      result[operation] = {
        averageDuration: stats.totalDuration / stats.sampleCount,
        averageMemoryUsage: stats.totalMemoryUsage / stats.sampleCount,
        sampleCount: stats.sampleCount,
      }
    })

    return result
  }

  /**
   * Clear all profiling data
   */
  clearData(): void {
    this.activeSessions.clear()
    this.completedSessions = []
  }

  /**
   * Export profiling data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      activeSessions: Array.from(this.activeSessions.values()).map(s => s.getSummary()),
      completedSessions: this.completedSessions.map(s => s.getSummary()),
      bottlenecks: this.getBottlenecks(),
      averagePerformance: this.getAveragePerformance(),
    }, null, 2)
  }
}