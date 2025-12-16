// ===================
// AI MONITORING FACTORY
// ===================

import { PerformanceMonitor } from './performance-monitor'
import { PerformanceProfiler } from './profiler'
import { ErrorReporter } from '../errors/error-reporter'

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enablePerformanceMonitoring: boolean
  enableProfiling: boolean
  enableErrorReporting: boolean
  maxMeasurements: number
  maxProfileSessions: number
  autoCleanup: boolean
  cleanupInterval: number // in minutes
}

/**
 * Default monitoring configuration
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  enablePerformanceMonitoring: true,
  enableProfiling: process.env.NODE_ENV === 'development',
  enableErrorReporting: true,
  maxMeasurements: 1000,
  maxProfileSessions: 100,
  autoCleanup: true,
  cleanupInterval: 30, // 30 minutes
}

/**
 * Create a new performance monitor with configuration
 */
export function createPerformanceMonitor(config?: Partial<MonitoringConfig>): {
  monitor: PerformanceMonitor
  profiler?: PerformanceProfiler
  errorReporter?: ErrorReporter
  cleanup: () => void
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Create monitor
  const monitor = new PerformanceMonitor()

  // Create profiler if enabled
  const profiler = finalConfig.enableProfiling ? new PerformanceProfiler() : undefined

  // Create error reporter if enabled
  const errorReporter = finalConfig.enableErrorReporting ? new ErrorReporter() : undefined

  // Set up auto cleanup if enabled
  let cleanupInterval: NodeJS.Timeout | null = null
  if (finalConfig.autoCleanup) {
    cleanupInterval = setInterval(() => {
      monitor.clearMeasurements()
      profiler?.clearData()
      errorReporter?.clearLog()
    }, finalConfig.cleanupInterval * 60 * 1000)
  }

  const cleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }
  }

  return {
    monitor,
    profiler,
    errorReporter,
    cleanup,
  }
}