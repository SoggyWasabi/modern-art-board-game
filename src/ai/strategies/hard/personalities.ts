// ===================
// HARD AI PERSONALITIES
// ===================

import type { Artist, AIDifficulty } from '../../../types/game'
import type { AIPersonality } from '../../types'
import { PersonalityTemplates } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Hard AI personality system
 * Creates distinct AI playing styles with strategic depth
 */
export class HardAIPersonalitySystem {
  private probability = createProbabilityUtils()

  /**
   * Create a personality based on template and customization
   */
  createPersonality(
    template: keyof typeof PersonalityTemplates,
    customization: Partial<AIPersonality> = {}
  ): AIPersonality {
    const baseTemplate = PersonalityTemplates[template]

    const personality: AIPersonality = {
      id: `personality_${Date.now()}_${this.probability.randomInt(1000, 9999)}`,
      ...baseTemplate,
      ...customization,
    }

    // Ensure values are within valid ranges
    return this.validatePersonality(personality)
  }

  /**
   * Create random personality
   */
  createRandomPersonality(): AIPersonality {
    const templates = Object.keys(PersonalityTemplates) as Array<keyof typeof PersonalityTemplates>
    const randomTemplate = this.probability.randomChoice(templates)

    const customization: Partial<AIPersonality> = {
      aggressiveness: this.probability.uniform(0.2, 0.9),
      riskTolerance: this.probability.uniform(0.2, 0.9),
      bluffingFrequency: this.probability.uniform(0.1, 0.7),
      memoryStrength: this.probability.uniform(0.4, 0.9),
      predictability: this.probability.uniform(0.1, 0.7),
      patience: this.probability.uniform(0.2, 0.8),
    }

    return this.createPersonality(randomTemplate, customization)
  }

  /**
   * Create adaptive personality based on game state
   */
  createAdaptivePersonality(gameState: any, playerIndex: number): AIPersonality {
    const player = gameState.players[playerIndex]
    const roundNumber = gameState.round.roundNumber

    // Base personality on money position and game state
    let aggressiveness = 0.5
    let riskTolerance = 0.5
    let patience = 0.5

    // Adjust based on money
    if (player.money > 120) {
      aggressiveness += 0.2 // More aggressive with lots of money
      riskTolerance += 0.2
    } else if (player.money < 30) {
      aggressiveness -= 0.2 // More conservative when low on money
      riskTolerance -= 0.3
      patience += 0.2
    }

    // Adjust based on round
    if (roundNumber >= 3) {
      aggressiveness += 0.2 // More aggressive in late game
      patience -= 0.2
    } else if (roundNumber === 1) {
      patience += 0.2 // More patient in early game
    }

    // Create personality with adapted traits
    const template = this.probability.random() < 0.5 ? 'aggressive' : 'balanced'

    return this.createPersonality(template, {
      aggressiveness: Math.max(0.1, Math.min(0.9, aggressiveness)),
      riskTolerance: Math.max(0.1, Math.min(0.9, riskTolerance)),
      patience: Math.max(0.1, Math.min(0.9, patience)),
    })
  }

  /**
   * Mutate personality slightly (for learning/adaptation)
   */
  mutatePersonality(personality: AIPersonality, mutationRate = 0.1): AIPersonality {
    const mutated = { ...personality }

    // Small random mutations
    if (this.probability.random() < mutationRate) {
      mutated.aggressiveness = Math.max(0.1, Math.min(0.9,
        mutated.aggressiveness + (this.probability.random() - 0.5) * 0.2
      ))
    }

    if (this.probability.random() < mutationRate) {
      mutated.riskTolerance = Math.max(0.1, Math.min(0.9,
        mutated.riskTolerance + (this.probability.random() - 0.5) * 0.2
      ))
    }

    if (this.probability.random() < mutationRate) {
      mutated.bluffingFrequency = Math.max(0.1, Math.min(0.9,
        mutated.bluffingFrequency + (this.probability.random() - 0.5) * 0.2
      ))
    }

    return this.validatePersonality(mutated)
  }

  /**
   * Validate and clamp personality values
   */
  private validatePersonality(personality: AIPersonality): AIPersonality {
    return {
      ...personality,
      aggressiveness: Math.max(0.1, Math.min(0.9, personality.aggressiveness)),
      riskTolerance: Math.max(0.1, Math.min(0.9, personality.riskTolerance)),
      bluffingFrequency: Math.max(0.1, Math.min(0.9, personality.bluffingFrequency)),
      memoryStrength: Math.max(0.1, Math.min(0.9, personality.memoryStrength)),
      predictability: Math.max(0.1, Math.min(0.9, personality.predictability)),
      patience: Math.max(0.1, Math.min(0.9, personality.patience)),
    }
  }

  /**
   * Get personality description
   */
  getPersonalityDescription(personality: AIPersonality): string {
    const traits = []

    if (personality.aggressiveness > 0.7) {
      traits.push('aggressive')
    } else if (personality.aggressiveness < 0.3) {
      traits.push('conservative')
    }

    if (personality.riskTolerance > 0.7) {
      traits.push('risk-tolerant')
    } else if (personality.riskTolerance < 0.3) {
      traits.push('risk-averse')
    }

    if (personality.bluffingFrequency > 0.5) {
      traits.push('deceptive')
    } else if (personality.bluffingFrequency < 0.2) {
      traits.push('honest')
    }

    if (personality.patience > 0.7) {
      traits.push('patient')
    } else if (personality.patience < 0.3) {
      traits.push('impulsive')
    }

    if (personality.predictability < 0.3) {
      traits.push('unpredictable')
    } else if (personality.predictability > 0.7) {
      traits.push('consistent')
    }

    return traits.length > 0 ? traits.join(', ') : 'balanced'
  }

  /**
   * Calculate personality compatibility with another personality
   */
  calculateCompatibility(personality1: AIPersonality, personality2: AIPersonality): number {
    // Calculate how compatible two personalities are
    const aggressivenessDiff = Math.abs(personality1.aggressiveness - personality2.aggressiveness)
    const riskToleranceDiff = Math.abs(personality1.riskTolerance - personality2.riskTolerance)
    const bluffingDiff = Math.abs(personality1.bluffingFrequency - personality2.bluffingFrequency)
    const patienceDiff = Math.abs(personality1.patience - personality2.patience)

    // Lower differences = higher compatibility
    const avgDifference = (aggressivenessDiff + riskToleranceDiff + bluffingDiff + patienceDiff) / 4

    return Math.max(0, 1 - avgDifference)
  }

  /**
   * Create counter-personality (opposite strategy)
   */
  createCounterPersonality(targetPersonality: AIPersonality): AIPersonality {
    const counterTraits = {
      aggressiveness: 1 - targetPersonality.aggressiveness,
      riskTolerance: 1 - targetPersonality.riskTolerance,
      bluffingFrequency: targetPersonality.bluffingFrequency > 0.5 ? 0.2 : 0.7,
      patience: 1 - targetPersonality.patience,
      predictability: 1 - targetPersonality.predictability,
    }

    // Choose template that matches counter strategy
    let template: keyof typeof PersonalityTemplates = 'balanced'
    if (counterTraits.aggressiveness > 0.7) {
      template = 'aggressive'
    } else if (counterTraits.aggressiveness < 0.3) {
      template = 'conservative'
    }

    return this.createPersonality(template, counterTraits)
  }

  /**
   * Evolve personality based on game performance
   */
  evolvePersonality(
    personality: AIPersonality,
    performanceMetrics: {
      winRate: number
      averageProfit: number
      successfulBluffs: number
      failedRisks: number
    }
  ): AIPersonality {
    const evolved = { ...personality }

    // Adjust based on performance
    if (performanceMetrics.winRate < 0.3) {
      // Losing games: adjust strategy
      if (performanceMetrics.averageProfit < 0) {
        // Losing money: become more conservative
        evolved.aggressiveness = Math.max(0.2, evolved.aggressiveness - 0.1)
        evolved.riskTolerance = Math.max(0.2, evolved.riskTolerance - 0.1)
        evolved.patience = Math.min(0.8, evolved.patience + 0.1)
      } else {
        // Not winning despite profit: be more aggressive
        evolved.aggressiveness = Math.min(0.8, evolved.aggressiveness + 0.1)
        evolved.riskTolerance = Math.min(0.8, evolved.riskTolerance + 0.1)
      }
    } else if (performanceMetrics.winRate > 0.7) {
      // Winning games: maintain or enhance strategy
      if (performanceMetrics.successfulBluffs > 3) {
        evolved.bluffingFrequency = Math.min(0.8, evolved.bluffingFrequency + 0.1)
      }
    }

    // Adjust bluffing based on success rate
    if (performanceMetrics.failedRisks > performanceMetrics.successfulBluffs * 2) {
      evolved.bluffingFrequency = Math.max(0.1, evolved.bluffingFrequency - 0.1)
    }

    return this.validatePersonality(evolved)
  }

  /**
   * Generate personality fingerprint for identification
   */
  generateFingerprint(personality: AIPersonality): string {
    const values = [
      personality.aggressiveness.toFixed(2),
      personality.riskTolerance.toFixed(2),
      personality.bluffingFrequency.toFixed(2),
      personality.memoryStrength.toFixed(2),
      personality.predictability.toFixed(2),
      personality.patience.toFixed(2),
    ]

    return values.join('|')
  }

  /**
   * Compare two personalities
   */
  comparePersonalities(personality1: AIPersonality, personality2: AIPersonality): {
    similarity: number
    differences: string[]
  } {
    const differences: string[] = []
    let totalDiff = 0

    const traits = [
      'aggressiveness',
      'riskTolerance',
      'bluffingFrequency',
      'memoryStrength',
      'predictability',
      'patience',
    ] as const

    traits.forEach(trait => {
      const diff = Math.abs(personality1[trait] - personality2[trait])
      totalDiff += diff

      if (diff > 0.3) {
        const highLow1 = personality1[trait] > 0.5 ? 'high' : 'low'
        const highLow2 = personality2[trait] > 0.5 ? 'high' : 'low'
        differences.push(`${trait}: ${highLow1} vs ${highLow2}`)
      }
    })

    const similarity = Math.max(0, 1 - (totalDiff / traits.length))

    return { similarity, differences }
  }
}