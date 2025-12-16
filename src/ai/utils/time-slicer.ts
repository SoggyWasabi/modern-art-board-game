// ===================
// TIME SLICER
// ===================

/**
 * Time slicing utilities for maintaining UI responsiveness during AI computation
 * Breaks up long-running computations into small chunks that yield to the UI
 */

export interface TimeSliceOptions {
  /** Maximum time per chunk in milliseconds */
  chunkSize?: number
  /** Maximum total computation time in milliseconds */
  maxTime?: number
  /** Timeout in milliseconds */
  timeoutMs?: number
  /** Whether to enable progressive improvement */
  progressive?: boolean
  /** Callback for progress updates */
  onProgress?: (progress: number) => void
}

export interface TimeSliceResult<T> {
  /** Result of computation */
  value?: T
  /** Whether computation completed successfully */
  success: boolean
  /** Whether computation timed out */
  timedOut: boolean
  /** Whether computation was interrupted */
  interrupted: boolean
  /** Progress percentage (0-100) */
  progress?: number
  /** Time spent in milliseconds */
  timeSpent?: number
  /** Whether computation was cancelled */
  cancelled?: boolean
  /** Error if computation failed */
  error?: Error
}

/**
 * Controller for time slice computation
 */
export class TimeSliceController {
  private startTime: number
  private timeoutMs?: number
  private cancelled: boolean = false

  constructor(options?: TimeSliceOptions) {
    this.startTime = performance.now()
    this.timeoutMs = options?.timeoutMs || options?.maxTime
  }

  /**
   * Check if computation should continue
   */
  shouldContinue(): boolean {
    if (this.cancelled) return false

    if (this.timeoutMs) {
      const elapsed = performance.now() - this.startTime
      return elapsed < this.timeoutMs
    }

    return true
  }

  /**
   * Check if time is running out
   */
  get isTimeRunningOut(): boolean {
    if (!this.timeoutMs) return false

    const elapsed = performance.now() - this.startTime
    const remaining = this.timeoutMs - elapsed
    return remaining < 100 // Less than 100ms remaining
  }

  /**
   * Get remaining time in milliseconds
   */
  getTimeRemaining(): number {
    if (!this.timeoutMs) return Infinity

    const elapsed = performance.now() - this.startTime
    return Math.max(0, this.timeoutMs - elapsed)
  }

  /**
   * Cancel the computation
   */
  cancel(): void {
    this.cancelled = true
  }

  /**
   * Yield control to allow UI to update
   */
  async yield(): Promise<void> {
    // In a real implementation, this would yield to the browser's event loop
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

/**
 * Time slice manager for chunked computation
 */
export class TimeSlicer {
  /**
   * Execute computation with optional time limiting
   */
  async execute<T>(
    computation: (controller: TimeSliceController) => T | Promise<T>,
    options?: TimeSliceOptions
  ): Promise<TimeSliceResult<T>> {
    const startTime = performance.now()
    const controller = new TimeSliceController(options)

    try {
      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined
      if (options?.timeoutMs) {
        timeoutId = setTimeout(() => {
          controller.cancel()
        }, options.timeoutMs)
      }

      // Execute the computation
      const result = await Promise.race([
        computation(controller),
        new Promise<never>((_, reject) => {
          if (options?.timeoutMs) {
            setTimeout(() => reject(new Error('Timeout')), options.timeoutMs)
          }
        })
      ])

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const timeSpent = performance.now() - startTime
      const elapsed = timeSpent
      const timedOut = elapsed >= (options?.timeoutMs || Infinity)

      return {
        value: result,
        success: true,
        timedOut,
        interrupted: timedOut,
        timeSpent
      }
    } catch (error) {
      const timeSpent = performance.now() - startTime
      const err = error instanceof Error ? error : new Error(String(error))
      const timedOut = err.message === 'Timeout'
      const interrupted = !timedOut

      return {
        success: false,
        timedOut,
        interrupted,
        timeSpent,
        error: err
      }
    }
  }

  /**
   * Create a new controller for manual time management
   */
  createController(options?: TimeSliceOptions): TimeSliceController {
    return new TimeSliceController(options)
  }
}

/**
 * Utility functions for time slicing
 */
export const TimeSliceUtils = {
  /**
   * Create time slice options based on AI difficulty
   */
  createOptions(difficulty: 'easy' | 'medium' | 'hard'): TimeSliceOptions {
    switch (difficulty) {
      case 'easy':
        return {
          timeoutMs: 1500,    // Quick decisions
        }

      case 'medium':
        return {
          timeoutMs: 3000,    // Moderate thinking time
        }

      case 'hard':
        return {
          timeoutMs: 6000,    // Deep thinking allowed
        }

      default:
        return {
          timeoutMs: 3000,
        }
    }
  },

  /**
   * Batch process an array with time slicing
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number, controller: TimeSliceController) => R | Promise<R>,
    options?: TimeSliceOptions
  ): Promise<R[]> {
    const slicer = new TimeSlicer()
    const results: R[] = []

    const { value, success } = await slicer.execute(async (controller) => {
      for (let i = 0; i < items.length; i++) {
        if (!controller.shouldContinue()) {
          break
        }

        const result = await processor(items[i], i, controller)
        results.push(result)

        // Yield control periodically
        if (i % 10 === 0) {
          await controller.yield()
        }
      }

      return results
    }, options)

    return success ? (value || []) : []
  },
}

/**
 * Error thrown when time slicing limits are exceeded
 */
export class TimeSliceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeSliceError'
  }
}