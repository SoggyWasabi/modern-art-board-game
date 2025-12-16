// ===================
// AI RESOURCE TRACKER
// ===================

/**
 * Resource usage snapshot
 */
export interface ResourceSnapshot {
  timestamp: number
  memory: {
    used: number
    total: number
    limit: number
  }
  cpu: {
    usage: number
  }
}

/**
 * Tracks AI resource usage during operation
 */
export class ResourceTracker {
  private snapshots: ResourceSnapshot[] = []
  private maxSnapshots = 1000
  private totalMemoryUsed = 0
  private peakMemoryUsage = 0
  private startTime = performance.now()

  /**
   * Take a resource snapshot
   */
  takeSnapshot(): ResourceSnapshot {
    const snapshot: ResourceSnapshot = {
      timestamp: performance.now(),
      memory: this.getMemoryInfo(),
      cpu: this.getCpuInfo(),
    }

    this.recordSnapshot(snapshot)
    return snapshot
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): number {
    const memory = this.getMemoryInfo()
    return memory.used
  }

  /**
   * Get total memory used since tracking started
   */
  getTotalMemoryUsed(): number {
    return this.totalMemoryUsed
  }

  /**
   * Get peak memory usage
   */
  getPeakMemoryUsage(): number {
    return this.peakMemoryUsage
  }

  /**
   * Get resource usage history
   */
  getHistory(count?: number): ResourceSnapshot[] {
    return count ? this.snapshots.slice(-count) : [...this.snapshots]
  }

  /**
   * Get resource usage statistics
   */
  getStatistics(): {
    averageMemoryUsage: number
    peakMemoryUsage: number
    memoryGrowthRate: number
    averageCpuUsage: number
    peakCpuUsage: number
    trackingDuration: number
  } {
    if (this.snapshots.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        memoryGrowthRate: 0,
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        trackingDuration: 0,
      }
    }

    const memoryUsages = this.snapshots.map(s => s.memory.used)
    const cpuUsages = this.snapshots.map(s => s.cpu.usage)

    const firstSnapshot = this.snapshots[0]
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]
    const duration = lastSnapshot.timestamp - firstSnapshot.timestamp

    const memoryGrowth = duration > 0
      ? (lastSnapshot.memory.used - firstSnapshot.memory.used) / duration
      : 0

    return {
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      peakMemoryUsage: Math.max(...memoryUsages),
      memoryGrowthRate: memoryGrowth,
      averageCpuUsage: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
      peakCpuUsage: Math.max(...cpuUsages),
      trackingDuration: performance.now() - this.startTime,
    }
  }

  /**
   * Check if resource usage is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStatistics()

    // Check for memory leaks (rapid growth)
    if (stats.memoryGrowthRate > 1024 * 1024) { // 1MB/s
      return false
    }

    // Check for excessive memory usage
    const memoryInfo = this.getMemoryInfo()
    if (memoryInfo.used > memoryInfo.limit * 0.9) { // 90% of limit
      return false
    }

    // Check for excessive CPU usage
    if (stats.averageCpuUsage > 0.8) { // 80% CPU
      return false
    }

    return true
  }

  /**
   * Reset resource tracking
   */
  reset(): void {
    this.snapshots = []
    this.totalMemoryUsed = 0
    this.peakMemoryUsage = 0
    this.startTime = performance.now()
  }

  /**
   * Record a snapshot
   */
  private recordSnapshot(snapshot: ResourceSnapshot): void {
    this.snapshots.push(snapshot)

    // Trim snapshots if needed
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots)
    }

    // Update statistics
    this.totalMemoryUsed += snapshot.memory.used
    this.peakMemoryUsage = Math.max(this.peakMemoryUsage, snapshot.memory.used)
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): { used: number; total: number; limit: number } {
    // Use performance.memory if available (Chrome)
    if ((performance as any).memory) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      }
    }

    // Fallback values for browsers without memory API
    return {
      used: 0,
      total: 0,
      limit: 0,
    }
  }

  /**
   * Get CPU information
   */
  private getCpuInfo(): { usage: number } {
    // Browser CPU estimation is difficult
    // This is a simplified approximation
    const now = performance.now()
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]

    if (!lastSnapshot) {
      return { usage: 0 }
    }

    // Estimate based on frame rate (very rough approximation)
    const frameDelta = now - lastSnapshot.timestamp
    const expectedFrameTime = 16.67 // 60fps
    const cpuUsage = Math.min(1, Math.max(0, (expectedFrameTime - frameDelta) / expectedFrameTime))

    return { usage: cpuUsage }
  }
}