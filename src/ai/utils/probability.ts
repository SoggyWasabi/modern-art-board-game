// ===================
// PROBABILITY UTILITIES
// ===================

/**
 * Utility functions for probability calculations used by AI decision-making
 */

/**
 * Random number generator with seed for reproducible AI behavior
 */
export class SeededRandom {
  private seed: number

  constructor(seed?: number) {
    this.seed = seed || Date.now()
  }

  /**
   * Generate random float between 0 and 1
   */
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  /**
   * Generate random float between min and max
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min
  }

  /**
   * Generate random choice from array
   */
  randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)]
  }

  /**
   * Shuffle array in place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  /**
   * Generate weighted random choice
   */
  weightedRandomChoice<T>(choices: Array<{ item: T; weight: number }>): T {
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0)
    let random = this.random() * totalWeight

    for (const choice of choices) {
      random -= choice.weight
      if (random <= 0) {
        return choice.item
      }
    }

    return choices[choices.length - 1].item
  }
}

/**
 * Probability distribution utilities
 */
export class ProbabilityDistribution {
  /**
   * Normal distribution (Gaussian) - Box-Muller transform
   */
  static normal(mean: number, stdDev: number, rng: SeededRandom): number {
    let u = 0
    let v = 0

    // Ensure u and v are not zero
    while (u === 0) u = rng.random()
    while (v === 0) v = rng.random()

    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return z * stdDev + mean
  }

  /**
   * Exponential distribution
   */
  static exponential(lambda: number, rng: SeededRandom): number {
    return -Math.log(1 - rng.random()) / lambda
  }

  /**
   * Uniform distribution
   */
  static uniform(min: number, max: number, rng: SeededRandom): number {
    return rng.randomFloat(min, max)
  }

  /**
   * Beta distribution (useful for modeling probabilities)
   */
  static beta(alpha: number, beta: number, rng: SeededRandom): number {
    // Simple approximation using acceptance-rejection
    if (alpha === 1 && beta === 1) {
      return rng.random()
    }

    // For alpha, beta > 1, use a simple approximation
    const x = rng.random()
    const y = rng.random()
    const candidate = x ** (1 / alpha)
    const acceptance = y ** (1 / beta)

    if (candidate + acceptance <= 1) {
      return candidate / (candidate + acceptance)
    }

    // Fallback to uniform
    return rng.random()
  }

  /**
   * Weighted average with uncertainty
   */
  static weightedAverage(values: number[], weights: number[], uncertainty = 0.1): number {
    if (values.length === 0) return 0
    if (values.length !== weights.length) {
      throw new Error('Values and weights must have same length')
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) return 0

    const weightedSum = values.reduce((sum, value, index) => {
      return sum + value * weights[index]
    }, 0)

    const average = weightedSum / totalWeight

    // Add uncertainty
    const noise = (Math.random() - 0.5) * 2 * uncertainty
    return average * (1 + noise)
  }
}

/**
 * Bayesian inference utilities for AI learning
 */
export class BayesianInference {
  /**
   * Update probability based on new evidence
   */
  static updatePrior(
    priorProbability: number,
    likelihood: number,
    evidenceProbability: number
  ): number {
    return (priorProbability * likelihood) / evidenceProbability
  }

  /**
   * Calculate posterior probability for multiple pieces of evidence
   */
  static multipleEvidenceUpdate(
    priorProbability: number,
    evidences: Array<{ likelihood: number; evidenceProbability: number }>
  ): number {
    let posterior = priorProbability

    for (const evidence of evidences) {
      posterior = this.updatePrior(posterior, evidence.likelihood, evidence.evidenceProbability)
    }

    return Math.max(0, Math.min(1, posterior))
  }

  /**
   * Estimate probability from small sample size with confidence interval
   */
  static estimateFromSample(
    successes: number,
    trials: number,
    confidenceLevel = 0.95
  ): { estimate: number; lowerBound: number; upperBound: number } {
    if (trials === 0) {
      return { estimate: 0.5, lowerBound: 0, upperBound: 1 }
    }

    const estimate = successes / trials

    // Wilson score interval for small samples
    const z = this.getZScore(confidenceLevel)
    const n = trials
    const p = estimate

    const discriminant = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
    const center = (p + (z * z) / (2 * n)) / (1 + (z * z) / n)

    return {
      estimate,
      lowerBound: Math.max(0, center - discriminant),
      upperBound: Math.min(1, center + discriminant),
    }
  }

  /**
   * Get z-score for confidence level
   */
  private static getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    }

    return zScores[confidenceLevel] || 1.96
  }
}

/**
 * Monte Carlo simulation utilities
 */
export class MonteCarlo {
  /**
   * Run simulation with multiple trials
   */
  static simulate<T>(
    trials: number,
    simulation: (rng: SeededRandom) => T,
    aggregator: (results: T[]) => number
  ): number {
    const results: T[] = []
    const rng = new SeededRandom()

    for (let i = 0; i < trials; i++) {
      results.push(simulation(rng))
    }

    return aggregator(results)
  }

  /**
   * Estimate probability of event occurring
   */
  static estimateProbability(
    trials: number,
    event: (rng: SeededRandom) => boolean
  ): number {
    return this.simulate(
      trials,
      event,
      (results) => results.filter(Boolean).length / results.length
    )
  }

  /**
   * Estimate expected value
   */
  static estimateExpectedValue(
    trials: number,
    outcome: (rng: SeededRandom) => number
  ): number {
    return this.simulate(
      trials,
      outcome,
      (results) => results.reduce((sum, value) => sum + value, 0) / results.length
    )
  }

  /**
   * Estimate value distribution percentiles
   */
  static estimateDistribution(
    trials: number,
    outcome: (rng: SeededRandom) => number,
    percentiles: number[] = [0.1, 0.25, 0.5, 0.75, 0.9]
  ): Record<number, number> {
    const results: number[] = []

    for (let i = 0; i < trials; i++) {
      results.push(outcome(new SeededRandom()))
    }

    results.sort((a, b) => a - b)

    const distribution: Record<number, number> = {}

    for (const percentile of percentiles) {
      const index = Math.floor(results.length * percentile)
      distribution[percentile] = results[index] || 0
    }

    return distribution
  }
}

/**
 * Decision theory utilities
 */
export class DecisionTheory {
  /**
   * Calculate expected value of a decision
   */
  static expectedValue(outcomes: Array<{ value: number; probability: number }>): number {
    return outcomes.reduce((sum, outcome) => {
      return sum + (outcome.value * outcome.probability)
    }, 0)
  }

  /**
   * Calculate expected utility (with risk aversion)
   */
  static expectedUtility(
    outcomes: Array<{ value: number; probability: number }>,
    riskAversion: number = 0
  ): number {
    return outcomes.reduce((sum, outcome) => {
      const utility = this.utilityFunction(outcome.value, riskAversion)
      return sum + (utility * outcome.probability)
    }, 0)
  }

  /**
   * Utility function with risk aversion
   */
  static utilityFunction(value: number, riskAversion: number): number {
    if (riskAversion === 0) {
      return value
    }

    // Exponential utility function for risk-averse/seeking behavior
    if (riskAversion > 0) {
      // Risk-averse
      return (1 - Math.exp(-riskAversion * value)) / riskAversion
    } else {
      // Risk-seeking
      return (Math.exp(-riskAversion * value) - 1) / (-riskAversion)
    }
  }

  /**
   * Find optimal decision using minimax
   */
  static minimax(
    decisions: Array<{
      name: string
      outcomes: Array<{ opponent: string; value: number }>
    }>
  ): { decision: string; worstCase: number } {
    let bestDecision = decisions[0].name
    let bestWorstCase = -Infinity

    for (const decision of decisions) {
      const worstCase = Math.min(...decision.outcomes.map(o => o.value))

      if (worstCase > bestWorstCase) {
        bestWorstCase = worstCase
        bestDecision = decision.name
      }
    }

    return { decision: bestDecision, worstCase: bestWorstCase }
  }

  /**
   * Apply Bayes' theorem to update beliefs
   */
  static bayesianUpdate(
    priorBeliefs: Record<string, number>,
    evidence: string,
    likelihoods: Record<string, Record<string, number>>
  ): Record<string, number> {
    const posterior: Record<string, number> = {}

    // Calculate normalizing constant
    let normalizer = 0
    for (const [hypothesis, prior] of Object.entries(priorBeliefs)) {
      const likelihood = likelihoods[hypothesis]?.[evidence] || 0
      normalizer += prior * likelihood
    }

    // Calculate posterior probabilities
    for (const [hypothesis, prior] of Object.entries(priorBeliefs)) {
      const likelihood = likelihoods[hypothesis]?.[evidence] || 0
      posterior[hypothesis] = (prior * likelihood) / normalizer
    }

    return posterior
  }
}

/**
 * Create probability utilities with consistent random generator
 */
export function createProbabilityUtils(seed?: number) {
  const rng = new SeededRandom(seed)

  return {
    rng,
    distribution: ProbabilityDistribution,
    bayesian: BayesianInference,
    monteCarlo: MonteCarlo,
    decisionTheory: DecisionTheory,

    // Convenience methods
    random: () => rng.random(),
    randomInt: (min: number, max: number) => rng.randomInt(min, max),
    randomInRange: (min: number, max: number) => rng.randomFloat(min, max),
    randomElement: <T>(array: T[]) => rng.randomChoice(array),
    randomChoice: <T>(array: T[]) => rng.randomChoice(array),
    weightedChoice: <T>(choices: Array<{ item: T; weight: number }>) =>
      rng.weightedRandomChoice(choices),
    weightedRandom: <T>(choices: Array<{ item: T; weight: number }>) =>
      rng.weightedRandomChoice(choices),

    // Distributions
    normal: (mean: number, stdDev: number) => ProbabilityDistribution.normal(mean, stdDev, rng),
    exponential: (lambda: number) => ProbabilityDistribution.exponential(lambda, rng),
    uniform: (min: number, max: number) => ProbabilityDistribution.uniform(min, max, rng),

    // Additional probability utilities
    calculateProbability: (outcomes: number[]) => {
      if (outcomes.length === 0) return 0
      // Average the probabilities
      return outcomes.reduce((sum, p) => sum + p, 0) / outcomes.length
    },

    normalize: (probabilities: number[]) => {
      const sum = probabilities.reduce((a, b) => a + b, 0)
      if (sum === 0) return probabilities.map(() => 0)
      return probabilities.map(p => p / sum)
    }
  }
}