// ===================
// HARD AI CARD PLAY
// ===================

import type { Card, Artist, GameState } from '../../../types/game'
import type { AIDecisionContext, CardEvaluation, AIPersonality } from '../../types'
import { MediumAICardValuation } from '../medium'
import { createProbabilityUtils } from '../../utils'

/**
 * Hard AI card selection with advanced strategic thinking
 */
export class HardAICardPlay {
  private valuation: MediumAICardValuation
  private probability = createProbabilityUtils()
  private decisionCount = 0
  private strategicMoves = 0

  constructor(private personality: AIPersonality, seed?: number) {
    this.valuation = new MediumAICardValuation()
  }

  /**
   * Select strategic card with complex considerations
   */
  async selectStrategicCard(context: AIDecisionContext): Promise<{
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
  } | null> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Multi-layered strategic analysis
    const candidates = await this.analyzeAllCards(player.hand, context)

    if (candidates.length === 0) {
      return null
    }

    // Apply personality-based selection
    const selected = this.selectCardByPersonality(candidates, context)

    // Record strategic move
    if (selected.evaluation.strategicValue > 0.7) {
      this.strategicMoves++
    }

    this.decisionCount++
    return selected
  }

  /**
   * Comprehensive analysis of all cards in hand
   */
  private async analyzeAllCards(
    hand: Card[],
    context: AIDecisionContext
  ): Promise<Array<{
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
    strategicImportance: number
  }>> {
    const analyzed: Array<{
      card: Card
      evaluation: CardEvaluation
      estimatedValue: number
      nashEquilibrium?: number
      strategicImportance: number
    }> = []

    for (const card of hand) {
      const evaluation = this.valuation.evaluateCard(card, context.gameState, context.playerIndex)
      const estimatedValue = this.calculateEstimatedValue(card, context)
      const nashEquilibrium = this.calculateNashEquilibrium(card, context)
      const strategicImportance = this.calculateStrategicImportance(card, evaluation, context)

      analyzed.push({
        card,
        evaluation,
        estimatedValue,
        nashEquilibrium,
        strategicImportance,
      })
    }

    return analyzed
  }

  /**
   * Select card based on personality and strategic considerations
   */
  private selectCardByPersonality(
    candidates: Array<{
      card: Card
      evaluation: CardEvaluation
      estimatedValue: number
      nashEquilibrium?: number
      strategicImportance: number
    }>,
    context: AIDecisionContext
  ): {
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
  } {
    // Different selection strategies based on personality
    let selectionStrategy: 'value_optimized' | 'strategic_control' | 'psychological' | 'opposition'

    const strategyThreshold = this.probability.random()

    if (this.personality.aggressiveness > 0.7) {
      selectionStrategy = 'strategic_control'
    } else if (this.personality.patience > 0.7) {
      selectionStrategy = 'value_optimized'
    } else if (this.personality.bluffingFrequency > 0.5) {
      selectionStrategy = 'psychological'
    } else {
      selectionStrategy = strategyThreshold < 0.5 ? 'opposition' : 'value_optimized'
    }

    return this.executeSelectionStrategy(candidates, selectionStrategy, context)
  }

  /**
   * Execute specific selection strategy
   */
  private executeSelectionStrategy(
    candidates: Array<{
      card: Card
      evaluation: CardEvaluation
      estimatedValue: number
      nashEquilibrium?: number
      strategicImportance: number
    }>,
    strategy: 'value_optimized' | 'strategic_control' | 'psychological' | 'opposition',
    context: AIDecisionContext
  ): {
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
  } {
    switch (strategy) {
      case 'value_optimized':
        // Select highest estimated value with confidence adjustment
        return candidates.reduce((best, current) => {
          const bestScore = best.estimatedValue * best.evaluation.confidence
          const currentScore = current.estimatedValue * current.evaluation.confidence
          return currentScore > bestScore ? current : best
        })

      case 'strategic_control':
        // Select card that gives most market control
        return candidates.reduce((best, current) => {
          const bestControl = best.evaluation.artistControl
          const currentControl = current.evaluation.artistControl
          return currentControl > bestControl ? current : best
        })

      case 'psychological':
        // Select card that will create psychological pressure
        return this.selectPsychologicalCard(candidates, context)

      case 'opposition':
        // Select card to counter opponent strategy
        return this.selectOppositionCard(candidates, context)

      default:
        return candidates[0]
    }
  }

  /**
   * Select card for psychological impact
   */
  private selectPsychologicalCard(
    candidates: Array<{
      card: Card
      evaluation: CardEvaluation
      estimatedValue: number
      nashEquilibrium?: number
      strategicImportance: number
    }>,
    context: AIDecisionContext
  ): {
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
  } {
    // Choose card that appears less valuable but actually is
    const hiddenValueCards = candidates.filter(c =>
      c.evaluation.strategicValue > 0.6 && c.evaluation.baseValue < 30
    )

    if (hiddenValueCards.length > 0) {
      return hiddenValueCards[0]
    }

    // Otherwise, choose auction type that creates most uncertainty
    const uncertaintyCards = candidates.filter(c => c.card.auctionType === 'hidden' || c.card.auctionType === 'double')

    return uncertaintyCards.length > 0 ? uncertaintyCards[0] : candidates[0]
  }

  /**
   * Select card to counter opponent strategy
   */
  private selectOppositionCard(
    candidates: Array<{
      card: Card
      evaluation: CardEvaluation
      estimatedValue: number
      nashEquilibrium?: number
      strategicImportance: number
    }>,
    context: AIDecisionContext
  ): {
    card: Card
    evaluation: CardEvaluation
    estimatedValue: number
    nashEquilibrium?: number
  } {
    // Analyze opponent preferences
    const opponents = Array.from(context.opponentModels.values())
    const opponentArtistBias = this.calculateOpponentArtistBias(opponents)

    // Choose card that opponents likely undervalue
    let bestCandidate = candidates[0]
    let bestScore = 0

    candidates.forEach(candidate => {
      const opponentBias = opponentArtistBias[candidate.card.artist] || 0
      const surpriseFactor = 1 - opponentBias // Lower bias = higher surprise
      const score = candidate.estimatedValue * surpriseFactor * candidate.evaluation.confidence

      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    })

    return bestCandidate
  }

  /**
   * Calculate estimated value beyond basic evaluation
   */
  private calculateEstimatedValue(card: Card, context: AIDecisionContext): number {
    const baseValue = this.valuation.evaluateCard(card, context.gameState, context.playerIndex).baseValue

    // Consider future potential
    const marketAnalysis = context.marketAnalysis
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]

    // Future value appreciation
    let futureValue = 0
    const roundsRemaining = 4 - context.gameState.round.roundNumber

    if (artistCompetitiveness.rank <= 2) {
      futureValue = artistCompetitiveness.expectedFinalValue * (roundsRemaining * 0.2)
    }

    // Strategic value adjustments
    const strategicAdjustment = this.calculateStrategicAdjustment(card, context)

    return baseValue + futureValue + strategicAdjustment
  }

  /**
   * Calculate Nash equilibrium for auction scenarios
   */
  private calculateNashEquilibrium(card: Card, context: AIDecisionContext): number | undefined {
    // Simplified Nash equilibrium calculation
    // In reality, this would involve solving complex game theory problems

    const marketAnalysis = context.marketAnalysis
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]
    const opponents = Array.from(context.opponentModels.values())

    // Basic equilibrium: average of expected value adjusted for competition
    const avgOpponentValue = this.calculateAverageOpponentValue(opponents, card.artist, marketAnalysis)
    const competitionFactor = 1 - (artistCompetitiveness.competitionLevel === 'high' ? 0.3 : 0.1)

    const equilibrium = (artistCompetitiveness.expectedFinalValue + avgOpponentValue) / 2 * competitionFactor

    return Math.max(0, equilibrium)
  }

  /**
   * Calculate strategic importance of playing this card
   */
  private calculateStrategicImportance(
    card: Card,
    evaluation: CardEvaluation,
    context: AIDecisionContext
  ): number {
    let importance = evaluation.strategicValue

    // Round-based adjustments
    const roundNumber = context.gameState.round.roundNumber
    if (roundNumber >= 3) {
      importance *= 1.3 // Late game cards are more important
    } else if (roundNumber === 1) {
      importance *= 0.8 // Early game cards are less critical
    }

    // Market state adjustments
    const marketAnalysis = context.marketAnalysis
    if (marketAnalysis.marketState === 'consolidated') {
      importance *= 1.2 // More important in consolidated markets
    } else if (marketAnalysis.marketState === 'emerging') {
      importance *= 0.9 // Less important in emerging markets
    }

    // Artist rank adjustments
    const artistRank = marketAnalysis.artistCompetitiveness[card.artist]?.rank || 5
    if (artistRank <= 2) {
      importance *= 1.1 // Top artists are more important
    } else if (artistRank >= 4) {
      importance *= 0.8 // Bottom artists are less important
    }

    return Math.min(1, importance)
  }

  /**
   * Calculate strategic adjustments beyond base value
   */
  private calculateStrategicAdjustment(card: Card, context: AIDecisionContext): number {
    let adjustment = 0

    // Artist control potential
    const player = context.gameState.players[context.playerIndex]
    const ownedCards = (player.purchases || []).filter(p => p.artist === card.artist).length
    if (ownedCards > 0) {
      adjustment += ownedCards * 5 // Bonus for artist control
    }

    // Card scarcity
    const marketAnalysis = context.marketAnalysis
    const remainingCards = marketAnalysis.remainingCards[card.artist] || 0
    if (remainingCards <= 2) {
      adjustment += 10 // Scarcity bonus
    }

    // Auction type strategic value
    const auctionTypeValues: Record<string, number> = {
      open: 0,
      one_offer: 2,
      hidden: 5,
      fixed_price: -2,
      double: 8,
    }

    adjustment += auctionTypeValues[card.auctionType] || 0

    return adjustment
  }

  /**
   * Calculate average opponent value for an artist
   */
  private calculateAverageOpponentValue(
    opponents: any[],
    artist: Artist,
    marketAnalysis: any
  ): number {
    if (opponents.length === 0) return 0

    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[artist]
    let totalValue = 0

    opponents.forEach(opponent => {
      // Estimate opponent's valuation based on their tendencies
      const baseValue = artistCompetitiveness.expectedFinalValue
      const riskAdjustment = 1 - (opponent.riskTolerance * 0.3)
      const aggressivenessAdjustment = 1 + (opponent.tendencies?.aggressiveness || 0.5) * 0.2

      totalValue += baseValue * riskAdjustment * aggressivenessAdjustment
    })

    return totalValue / opponents.length
  }

  /**
   * Calculate opponent artist bias
   */
  private calculateOpponentArtistBias(opponents: any[]): Record<Artist, number> {
    const bias: Record<Artist, number> = {
      'Manuel Carvalho': 0,
      'Sigrid Thaler': 0,
      'Daniel Melim': 0,
      'Ramon Martins': 0,
      'Rafael Silveira': 0,
    }

    opponents.forEach(opponent => {
      const preferences = opponent.artistPreferences || {}
      Object.keys(bias).forEach(artist => {
        bias[artist as Artist] += (preferences[artist] || 0)
      })
    })

    // Average across opponents
    Object.keys(bias).forEach(artist => {
      bias[artist as Artist] = (bias[artist as Artist] || 0) / opponents.length
    })

    return bias
  }

  /**
   * Initialize with game state
   */
  initialize(gameState: any, playerIndex: number): void {
    this.decisionCount = 0
    this.strategicMoves = 0
  }

  /**
   * Update with new context
   */
  update(context: AIDecisionContext): void {
    // Hard AI adapts strategy based on game evolution
    // Could implement complex learning algorithms here
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No resources to clean up
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      decisionsMade: this.decisionCount,
      strategicMoves: this.strategicMoves,
      strategicMoveRate: this.decisionCount > 0 ? this.strategicMoves / this.decisionCount : 0,
    }
  }

  /**
   * Get average confidence
   */
  getAverageConfidence(): number {
    return 0.8 // Hard AI has high confidence
  }

  /**
   * Get decision count
   */
  getDecisionCount(): number {
    return this.decisionCount
  }
}