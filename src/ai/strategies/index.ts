// ===================
// AI STRATEGIES EXPORT
// ===================

// Easy AI
export { EasyAIStrategy, createEasyAIStrategy } from './easy'

// Medium AI
export { MediumAIStrategy, createMediumAIStrategy } from './medium'

// Hard AI
export { HardAIStrategy, createHardAIStrategy, createHardAIPersonality } from './hard'

// Import factory functions for use in AIStrategyFactory
import { createEasyAIStrategy } from './easy'
import { createMediumAIStrategy } from './medium'
import { createHardAIStrategy, createHardAIPersonality } from './hard'
import type { AIPersonality } from '../types'

// Strategy factory
export class AIStrategyFactory {
  /**
   * Create a new AI strategy instance
   */
  static create(config: {
    difficulty: 'easy' | 'medium' | 'hard'
    seed?: number
    personality?: any
  }) {
    switch (config.difficulty) {
      case 'easy':
        return createEasyAIStrategy(config.seed)

      case 'medium':
        return createMediumAIStrategy(config.seed)

      case 'hard':
        // Create personality for Hard AI if not provided
        const personality = config.personality || createHardAIPersonality()
        return createHardAIStrategy(personality, config.seed)

      default:
        throw new Error(`Unknown AI difficulty: ${config.difficulty}`)
    }
  }

  /**
   * Get available strategy types
   */
  static getAvailableStrategies(): ('easy' | 'medium' | 'hard')[] {
    return ['easy', 'medium', 'hard']
  }

  /**
   * Get default configuration for difficulty level
   */
  static getDefaultConfig(difficulty: 'easy' | 'medium' | 'hard') {
    return {
      difficulty,
      seed: Date.now() + Math.random(), // Random seed
    }
  }
}