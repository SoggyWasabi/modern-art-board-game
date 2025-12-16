// ===================
// MEDIUM AI CARD PLAY
// ===================

import type { Card, Artist } from '../../../types/game'
import type { AIDecisionContext, CardEvaluation } from '../../types'
import { MediumAICardValuation } from './valuation'
import { ExpectedValueCalculator } from './expected-value'
import { createProbabilityUtils } from '../../utils'

/**
 * Medium AI card selection - chooses optimal cards based on EV
 */
export class MediumAICardPlay {
  private valuation: MediumAICardValuation
  private evCalculator: ExpectedValueCalculator
  private probability = createProbabilityUtils()

  private decisionCount = 0
  private evCalculationCount = 0

  constructor(seed?: number) {
    this.valuation = new MediumAICardValuation()
    this.evCalculator = new ExpectedValueCalculator()
  }

  /**
   * Select optimal card to auction
   */
  async selectOptimalCard(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState, cardEvaluations } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Evaluate all cards in hand
    const evaluatedCards = await this.evaluateHand(player.hand, context)

    // Filter out cards that would end the round badly
    const safeCards = this.filterSafeCards(evaluatedCards, context)

    if (safeCards.length === 0) {
      // No safe cards, choose least risky
      return evaluatedCards[0] || null
    }

    // Select card with highest strategic value
    const bestCard = this.selectBestCard(safeCards, context)

    this.decisionCount++
    return bestCard
  }

  /**
   * Evaluate all cards in hand
   */
  private async evaluateHand(hand: Card[], context: AIDecisionContext): Promise<Array<{ card: Card; evaluation: CardEvaluation }>> {
    const evaluatedCards: Array<{ card: Card; evaluation: CardEvaluation }> = []

    for (const card of hand) {
      const evaluation = this.valuation.evaluateCard(card, context.gameState, context.playerIndex)
      evaluatedCards.push({ card, evaluation })

      this.evCalculationCount++
    }

    return evaluatedCards
  }

  /**
   * Filter out cards that would be strategically bad to play
   */
  private filterSafeCards(
    evaluatedCards: Array<{ card: Card; evaluation: CardEvaluation }>,
    context: AIDecisionContext
  ): Array<{ card: Card; evaluation: CardEvaluation }> {
    return evaluatedCards.filter(({ card, evaluation }) => {
      // Don't play 5th card unless it's very valuable
      const currentCount = context.gameState.round.cardsPlayedPerArtist[card.artist] || 0
      if (currentCount >= 4) {
        return evaluation.strategicValue > 0.8 // Only play 5th card if exceptional
      }

      // Avoid cards with very high risk in late game
      if (context.gameState.round.roundNumber >= 3 && evaluation.riskLevel > 0.8) {
        return false
      }

      // Prefer cards with good strategic value
      return evaluation.strategicValue > 0.3
    })
  }

  /**
   * Select best card from safe options
   */
  private selectBestCard(
    safeCards: Array<{ card: Card; evaluation: CardEvaluation }>,
    context: AIDecisionContext
  ): { card: Card; evaluation: CardEvaluation } {
    // Sort by strategic value with some randomization for variety
    const sortedCards = [...safeCards].sort((a, b) => {
      // Primary sort by strategic value
      let valueDiff = b.evaluation.strategicValue - a.evaluation.strategicValue

      // Add small random factor to prevent deterministic play
      const randomFactor = (this.probability.random() - 0.5) * 0.1
      valueDiff += randomFactor

      return valueDiff
    })

    // Consider round-specific strategies
    const roundNumber = context.gameState.round.roundNumber

    if (roundNumber === 1) {
      // Early game: prefer cards with high market potential
      sortedCards.sort((a, b) => b.evaluation.marketPotential - a.evaluation.marketPotential)
    } else if (roundNumber >= 3) {
      // Late game: prefer lower risk, established artists
      sortedCards.sort((a, b) => {
        const riskDiff = a.evaluation.riskLevel - b.evaluation.riskLevel
        const artistDiff = this.getArtistRankDifference(a.card.artist, b.card.artist, context)
        return riskDiff + artistDiff * 0.5
      })
    }

    return sortedCards[0]
  }

  /**
   * Get rank difference between artists (lower rank = better)
   */
  private getArtistRankDifference(artistA: Artist, artistB: Artist, context: AIDecisionContext): number {
    const rankA = context.marketAnalysis.artistCompetitiveness[artistA]?.rank || 5
    const rankB = context.marketAnalysis.artistCompetitiveness[artistB]?.rank || 5

    return rankA - rankB
  }

  /**
   * Alternative card selection method for variety
   */
  async selectCardByStrategy(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState, cardEvaluations } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Choose strategy based on game state
    const strategy = this.chooseCardPlayStrategy(context)

    switch (strategy) {
      case 'high_value':
        return await this.selectHighestValueCard(context)
      case 'market_control':
        return await this.selectMarketControlCard(context)
      case 'risk_averse':
        return await this.selectLowRiskCard(context)
      case 'opportunity':
        return await this.selectOpportunityCard(context)
      default:
        return await this.selectOptimalCard(context)
    }
  }

  /**
   * Choose card play strategy based on context
   */
  private chooseCardPlayStrategy(context: AIDecisionContext): 'high_value' | 'market_control' | 'risk_averse' | 'opportunity' {
    const { gameState, marketAnalysis } = context
    const player = gameState.players[context.playerIndex]

    // Late game with low money = risk averse
    if (gameState.round.roundNumber >= 3 && player.money < 30) {
      return 'risk_averse'
    }

    // Emerging market = look for opportunities
    if (marketAnalysis.marketState === 'emerging') {
      return 'opportunity'
    }

    // High volatility = play it safe
    if (marketAnalysis.volatility > 0.7) {
      return 'risk_averse'
    }

    // Default to high value
    return 'high_value'
  }

  /**
   * Select card with highest value
   */
  private async selectHighestValueCard(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    const evaluatedCards = await this.evaluateHand(player.hand, context)
    evaluatedCards.sort((a, b) => b.evaluation.baseValue - a.evaluation.baseValue)

    return evaluatedCards[0] || null
  }

  /**
   * Select card for market control
   */
  private async selectMarketControlCard(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    const evaluatedCards = await this.evaluateHand(player.hand, context)
    evaluatedCards.sort((a, b) => b.evaluation.artistControl - a.evaluation.artistControl)

    return evaluatedCards[0] || null
  }

  /**
   * Select card with lowest risk
   */
  private async selectLowRiskCard(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    const evaluatedCards = await this.evaluateHand(player.hand, context)
    evaluatedCards.sort((a, b) => a.evaluation.riskLevel - b.evaluation.riskLevel)

    return evaluatedCards[0] || null
  }

  /**
   * Select card based on opportunities
   */
  private async selectOpportunityCard(context: AIDecisionContext): Promise<{ card: Card; evaluation: CardEvaluation } | null> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    const evaluatedCards = await this.evaluateHand(player.hand, context)
    evaluatedCards.sort((a, b) => b.evaluation.marketPotential - a.evaluation.marketPotential)

    return evaluatedCards[0] || null
  }

  /**
   * Initialize with game state
   */
  initialize(gameState: any, playerIndex: number): void {
    this.decisionCount = 0
    this.evCalculationCount = 0
  }

  /**
   * Update with new context
   */
  update(context: AIDecisionContext): void {
    // Medium AI adapts based on market changes
    // Could update evaluation parameters here
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
      totalConfidence: this.decisionCount * 0.7, // Approximate
      evCalculations: this.evCalculationCount,
    }
  }

  /**
   * Get EV calculation count
   */
  getEVCalculationCount(): number {
    return this.evCalculationCount
  }

  /**
   * Get decision count
   */
  getDecisionCount(): number {
    return this.decisionCount
  }
}