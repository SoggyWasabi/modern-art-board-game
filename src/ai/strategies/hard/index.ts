// ===================
// HARD AI STRATEGY EXPORT
// ===================

import { HardAIStrategy } from './strategy'
import { HardAIPersonalitySystem } from './personalities'
import type { AIPersonality } from '../types'

export { HardAIMemory } from './memory'
export { HardAIDeception } from './deception'

// Export the strategy class and personality system
export { HardAIStrategy, HardAIPersonalitySystem }

// Factory function
export function createHardAIStrategy(personality?: AIPersonality, seed?: number) {
  return new HardAIStrategy(personality, seed)
}

// Personality creation function
export function createHardAIPersonality(template?: string, customization?: any) {
  const personalitySystem = new HardAIPersonalitySystem()

  if (template) {
    return personalitySystem.createPersonality(template as any, customization)
  }

  return personalitySystem.createRandomPersonality()
}