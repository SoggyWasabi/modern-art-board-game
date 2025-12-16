// ===================
// HARD AI STRATEGY
// ===================

import type { Artist, Card, GameState } from '../../../types/game'
import type { AuctionState } from '../../../types/auction'
import type {
  AIStrategy,
  AIDecisionContext,
  AICardPlayDecision,
  AIBidDecision,
  AIFixedPriceDecision,
  AIDoubleOfferDecision,
  AIHiddenBidDecision,
  AIOneOfferBidDecision,
  ThinkingDelay,
  AIPersonality,
  AnyAIDecision,
} from '../../types'
import { HardAIPersonalitySystem } from './personalities'
import { HardAIMemory } from './memory'
import { HardAIDeception } from './deception'
import { HardAICardPlay } from './card-play'
import { HardAIBidding } from './bidding'
import { createProbabilityUtils } from '../../utils'

/**
 * Hard AI Strategy - Advanced strategic master with psychological warfare
 * Uses optimal play, opponent modeling, and complex decision trees
 */
export class HardAIStrategy implements AIStrategy {
  public readonly difficulty = 'hard' as const
  public readonly name = 'Hard AI'
  public readonly description = 'Advanced strategic master with psychological warfare'

  private personality: AIPersonality
  private memory: HardAIMemory
  private deception: HardAIDeception
  private cardPlay: HardAICardPlay
  private bidding: HardAIBidding
  private probability = createProbabilityUtils()

  constructor(personality?: AIPersonality, seed?: number) {
    this.personality = personality || new HardAIPersonalitySystem().createRandomPersonality()
    this.memory = new HardAIMemory()
    this.deception = new HardAIDeception()
    this.cardPlay = new HardAICardPlay(this.personality, seed)
    this.bidding = new HardAIBidding(this.personality, this.memory, this.deception, seed)
  }

  /**
   * Choose optimal card with strategic depth
   */
  async chooseCardToAuction(context: AIDecisionContext): Promise<AICardPlayDecision> {
    const decision = await this.cardPlay.selectStrategicCard(context)

    if (!decision) {
      throw new Error('No cards available to select')
    }

    // Add deception layer if beneficial
    const shouldAddDeception = this.shouldDeceiveInCardPlay(context)
    let reasoning = decision.reasoning

    if (shouldAddDeception.shouldDeceive) {
      reasoning += ` [Deception: ${shouldAddDeception.reason}]`
    }

    return {
      type: 'card_play',
      confidence: decision.confidence,
      cardId: decision.card.id,
      card: decision.card,
      reasoning,
    }
  }

  /**
   * Make game theory optimal bid in open auction
   */
  async chooseOpenBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentHighBid: number | null
  ): Promise<AIBidDecision> {
    const decision = await this.bidding.makeOptimalBid(context, auction, currentHighBid)

    // Consider deception
    const deception = this.deception.shouldBluff(
      context,
      'open',
      decision.estimatedValue || 0,
      Array.from(context.opponentModels.values())
    )

    let finalAmount = decision.amount
    let finalAction = decision.action
    let reasoning = decision.reasoning

    if (deception.shouldBluff && this.personality.bluffingFrequency > this.probability.random()) {
      const deceptiveBid = this.deception.generateDeceptiveBid(
        decision.estimatedValue || 0,
        deception.bluffStrength,
        decision.minBid || 0,
        decision.maxBid || 0,
        'open'
      )

      finalAmount = deceptiveBid.amount
      finalAction = finalAmount > 0 ? 'bid' : 'pass'
      reasoning += ` [Deception: ${deceptiveBid.deceptionType} bluff]`
    }

    // Apply personality adjustments
    finalAmount = this.applyPersonalityToBid(finalAmount, decision.estimatedValue || 0)

    return {
      type: 'bid',
      confidence: decision.confidence,
      action: finalAction,
      amount: finalAmount,
      reasoning,
      maxBid: decision.maxBid,
    }
  }

  /**
   * Make strategic one-offer bid with position awareness
   */
  async chooseOneOfferBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<AIOneOfferBidDecision> {
    const decision = await this.bidding.makePositionalBid(context, auction, currentBid)

    // Advanced position-based deception
    const position = decision.position
    const deception = this.deception.shouldBluff(
      context,
      'one_offer',
      decision.estimatedValue || 0,
      Array.from(context.opponentModels.values())
    )

    let finalAmount = decision.amount
    let reasoning = decision.reasoning

    if (deception.shouldBluff && position === 'auctioneer') {
      // Auctioneer can bluff about their intentions
      const bluffAmount = this.calculateAuctioneerBluffAmount(
        decision.estimatedValue || 0,
        currentBid,
        deception.bluffStrength
      )

      finalAmount = bluffAmount
      reasoning += ` [Auctioneer bluff: ${deception.bluffStrength.toFixed(2)}]`
    }

    // Personality-based timing and decision
    const shouldBid = this.personality.patience > this.probability.random() || finalAmount > currentBid

    return {
      type: 'one_offer_bid',
      confidence: decision.confidence,
      action: shouldBid && finalAmount > 0 ? 'bid' : 'pass',
      amount: finalAmount > 0 ? finalAmount : undefined,
      position,
      reasoning,
    }
  }

  /**
   * Make game theory optimal hidden bid
   */
  async chooseHiddenBid(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIHiddenBidDecision> {
    const decision = await this.bidding.makeGameTheoryOptimalBid(context, auction)

    // Hidden auctions are perfect for deception
    const deception = this.deception.shouldBluff(
      context,
      'hidden',
      decision.trueValue || 0,
      Array.from(context.opponentModels.values())
    )

    let finalAmount = decision.amount
    let bluffFactor = 0
    let reasoning = decision.reasoning

    if (deception.shouldBluff || this.personality.bluffingFrequency > 0.5) {
      // Use mixed strategy for hidden bids
      const mixedStrategy = this.calculateMixedStrategyBid(
        decision.trueValue || 0,
        decision.nashEquilibrium || 0,
        deception.bluffStrength
      )

      finalAmount = mixedStrategy.amount
      bluffFactor = mixedStrategy.bluffFactor
      reasoning += ` [Mixed strategy: ${mixedStrategy.strategy}]`
    }

    return {
      type: 'hidden_bid',
      confidence: decision.confidence,
      amount: finalAmount,
      bluffFactor,
      reasoning,
    }
  }

  /**
   * Set strategic fixed price with market manipulation
   */
  async chooseFixedPrice(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIFixedPriceDecision> {
    const decision = await this.bidding.setMarketManipulatingPrice(context, auction)

    // Consider psychological pricing
    const psychologicalPrice = this.applyPsychologicalPricing(
      decision.optimalPrice || 0,
      Array.from(context.opponentModels.values()),
      context
    )

    let priceReasoning: 'aggressive' | 'conservative' | 'optimal' | 'desperate' = 'optimal'
    let reasoning = decision.reasoning

    if (psychologicalPrice.manipulationApplied) {
      priceReasoning = psychologicalPrice.manipulationType === 'intimidation' ? 'aggressive' : 'conservative'
      reasoning += ` [Psychological: ${psychologicalPrice.manipulationType}]`
    }

    return {
      type: 'fixed_price',
      confidence: decision.confidence,
      price: psychologicalPrice.price,
      priceReasoning,
      reasoning,
    }
  }

  /**
   * Complex strategic decision for double auction
   */
  async chooseDoubleOffer(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIDoubleOfferDecision> {
    const decision = await this.bidding.makeComplexDoubleDecision(context, auction)

    // Advanced strategic considerations for double auction
    const strategicAnalysis = this.analyzeDoubleAuctionStrategicValue(context, auction)

    let finalAction = decision.action
    let reasoning = decision.reasoning

    if (strategicAnalysis.shouldForceAuction && this.personality.aggressiveness > 0.7) {
      finalAction = 'offer'
      reasoning += ` [Strategic: Forcing auction for ${strategicAnalysis.reason}]`
    } else if (strategicAnalysis.shouldDeny && this.personality.patience > 0.6) {
      finalAction = 'decline'
      reasoning += ` [Strategic: Denying opportunity for ${strategicAnalysis.reason}]`
    }

    return {
      type: 'double_offer',
      confidence: decision.confidence,
      action: finalAction,
      cardId: decision.cardId,
      strategy: decision.strategy,
      reasoning,
    }
  }

  /**
   * Main decision-making interface
   */
  async makeDecision(
    decisionType: 'card_play' | 'bid' | 'hidden_bid' | 'fixed_price' | 'buy',
    context: AIDecisionContext,
    options?: {
      auction?: AuctionState
      currentBid?: number
      card?: Card
    }
  ): Promise<AnyAIDecision> {
    // Add thinking delay to simulate human consideration
    const delay = this.getThinkingDelay()
    const actualDelay = this.probability.randomInRange(delay.min, delay.max)
    await new Promise(resolve => setTimeout(resolve, actualDelay))

    switch (decisionType) {
      case 'card_play':
        const cardResult = await this.cardPlay.selectStrategicCard(context)
        if (!cardResult) {
          return {
            type: 'card_play',
            action: 'play_card',
            card: null,
            confidence: 0.1,
            reasoning: 'Hard AI: No valid cards available',
          }
        }
        return cardResult

      case 'bid':
        if (!options?.auction) {
          throw new Error('Auction state required for bid decisions')
        }
        return await this.bidding.calculateBid(
          options.auction.card,
          context,
          options.auction,
          options.currentBid || 0
        )

      case 'hidden_bid':
        if (!options?.auction) {
          throw new Error('Auction state required for hidden bid decisions')
        }
        // Use similar logic to regular bid but with hidden considerations
        return await this.bidding.calculateHiddenBid(
          options.auction.card,
          context,
          options.auction
        )

      case 'fixed_price':
        if (!options?.auction) {
          throw new Error('Auction state required for fixed price decisions')
        }
        return await this.bidding.calculateFixedPriceDecision(
          options.auction.card,
          context,
          options.auction,
          options.currentBid || 0
        )

      case 'buy':
        if (!options?.auction) {
          throw new Error('Auction state required for buy decisions')
        }
        return await this.bidding.calculateBuyDecision(
          options.auction.card,
          context,
          options.auction
        )

      default:
        throw new Error(`Unknown decision type: ${decisionType}`)
    }
  }

  /**
   * Get thinking delay for Hard AI
   */
  getThinkingDelay(): ThinkingDelay {
    const baseDelay = {
      min: 3000,   // 3 seconds minimum
      max: 7000,   // 7 seconds maximum
      distribution: 'normal',
      humanPauses: true,
    }

    // Adjust based on personality
    const patienceMultiplier = 0.5 + (this.personality.patience * 0.5)
    const unpredictabilityFactor = (1 - this.personality.predictability) * 0.3

    return {
      ...baseDelay,
      min: baseDelay.min * patienceMultiplier,
      max: baseDelay.max * (1 + unpredictabilityFactor),
    }
  }

  /**
   * Initialize strategy with personality
   */
  initialize(gameState: GameState, playerIndex: number): void {
    this.memory.initializeGame(gameState, playerIndex)
    this.cardPlay.initialize(gameState, playerIndex)
    this.bidding.initialize(gameState, playerIndex)

    // Record initial game state
    this.memory.recordNotableEvent(
      'game_start',
      `Hard AI with ${this.personality.name} personality starting game`,
      0.8
    )
  }

  /**
   * Update strategy and learn from game events
   */
  update(context: AIDecisionContext): void {
    // Update memory with new context
    this.memory.recordPlayerAction(
      context.gameState.players[context.playerIndex].id,
      'context_update',
      context
    )

    // Update personality based on performance
    this.adaptPersonality(context)

    // Update deception profile based on opponent reactions
    this.updateDeceptionProfile(context)

    // Update sub-strategies
    this.cardPlay.update(context)
    this.bidding.update(context)
  }

  /**
   * Clean up resources and save learning
   */
  cleanup(): void {
    this.memory.cleanup()
    this.cardPlay.cleanup()
    this.bidding.cleanup()
  }

  /**
   * Get personality information
   */
  getPersonality(): AIPersonality {
    return this.personality
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return this.memory.getMemoryStats()
  }

  /**
   * Get deception statistics
   */
  getDeceptionStats() {
    return this.deception.getDeceptionStats()
  }

  /**
   * Get comprehensive strategy statistics
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      personality: this.personality.name,
      decisionsMade: this.cardPlay.getDecisionCount() + this.bidding.getDecisionCount(),
      averageConfidence: this.calculateAverageConfidence(),
      strategic: 'advanced',
      memoryStats: this.getMemoryStats(),
      deceptionStats: this.getDeceptionStats(),
    }
  }

  // Private helper methods

  private shouldDeceiveInCardPlay(context: AIDecisionContext): { shouldDeceive: boolean; reason: string } {
    // Deceive if opponents are getting predictable about our card play
    const opponentPredictability = Array.from(context.opponentModels.values())
      .reduce((sum, opp) => sum + opp.predictability, 0) / Math.max(1, context.opponentModels.size)

    if (opponentPredictability > 0.7) {
      return { shouldDeceive: true, reason: 'Opponents too predictable' }
    }

    // Deceive if high importance and we can afford risk
    if (context.importance > 0.8 && this.personality.riskTolerance > 0.6) {
      return { shouldDeceive: true, reason: 'High stakes opportunity' }
    }

    return { shouldDeceive: false, reason: 'No deception needed' }
  }

  private applyPersonalityToBid(bidAmount: number, cardValue: number): number {
    let adjustedAmount = bidAmount

    // Aggressive personalities bid higher
    if (this.personality.aggressiveness > 0.7) {
      adjustedAmount = Math.floor(adjustedAmount * 1.1)
    } else if (this.personality.aggressiveness < 0.3) {
      adjustedAmount = Math.floor(adjustedAmount * 0.9)
    }

    // Risk tolerance affects bidding
    if (this.personality.riskTolerance > 0.7) {
      adjustedAmount = Math.floor(adjustedAmount * 1.05)
    }

    return adjustedAmount
  }

  private calculateAuctioneerBluffAmount(
    trueValue: number,
    currentBid: number,
    bluffStrength: number
  ): number {
    // Auctioneer can bluff about what they'll pay
    if (bluffStrength > 0.6) {
      // Strong bluff: make them think we'll pay more
      return Math.min(currentBid + 20, Math.floor(trueValue * 1.3))
    } else {
      // Weak bluff: signal we might pay less
      return Math.max(1, Math.floor(currentBid * 0.8))
    }
  }

  private calculateMixedStrategyBid(
    trueValue: number,
    nashEquilibrium: number,
    bluffStrength: number
  ): { amount: number; bluffFactor: number; strategy: string } {
    const bluffChance = this.personality.bluffingFrequency * bluffStrength

    if (this.probability.random() < bluffChance) {
      // Bluff: bid away from true value
      const bluffDirection = this.probability.random() < 0.5 ? -1 : 1
      const bluffAmount = trueValue + (bluffDirection * trueValue * 0.4 * bluffStrength)

      return {
        amount: Math.max(0, Math.floor(bluffAmount)),
        bluffFactor: Math.abs(bluffDirection) * bluffStrength,
        strategy: bluffDirection > 0 ? 'overbid_bluff' : 'underbid_bluff',
      }
    } else {
      // True value or Nash equilibrium
      const targetValue = this.probability.random() < 0.5 ? trueValue : nashEquilibrium

      return {
        amount: Math.floor(targetValue),
        bluffFactor: 0,
        strategy: 'honest_value',
      }
    }
  }

  private applyPsychologicalPricing(
    optimalPrice: number,
    opponents: any[],
    context: AIDecisionContext
  ): { price: number; manipulationApplied: boolean; manipulationType: string } {
    // Use round numbers for psychological effect
    if (optimalPrice % 5 !== 0) {
      const roundedPrice = Math.round(optimalPrice / 5) * 5
      return {
        price: roundedPrice,
        manipulationApplied: true,
        manipulationType: 'round_number_psychology',
      }
    }

    // Price just below psychological thresholds
    const thresholds = [20, 30, 40, 50]
    for (const threshold of thresholds) {
      if (optimalPrice > threshold && optimalPrice < threshold + 3) {
        return {
          price: threshold,
          manipulationApplied: true,
          manipulationType: 'threshold_pricing',
        }
      }
    }

    return {
      price: optimalPrice,
      manipulationApplied: false,
      manipulationType: 'none',
    }
  }

  private analyzeDoubleAuctionStrategicValue(
    context: AIDecisionContext,
    auction: any
  ): { shouldForceAuction: boolean; shouldDeny: boolean; reason: string } {
    // Complex strategic analysis for double auction
    const marketAnalysis = context.marketAnalysis
    const primaryArtist = auction.card?.artist

    if (!primaryArtist) {
      return { shouldForceAuction: false, shouldDeny: false, reason: 'Invalid auction' }
    }

    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[primaryArtist]

    // Force auction if we can gain control
    const shouldForceAuction = artistCompetitiveness.cardsNeededForValue <= 1 &&
                               artistCompetitiveness.rank <= 2 &&
                               this.personality.aggressiveness > 0.6

    // Deny if opponent would benefit more
    const shouldDeny = artistCompetitiveness.rank >= 4 &&
                      this.personality.patience > 0.5

    return {
      shouldForceAuction,
      shouldDeny,
      reason: shouldForceAuction ? 'control_opportunity' : shouldDeny ? 'deny_advantage' : 'neutral',
    }
  }

  private adaptPersonality(context: AIDecisionContext): void {
    // Slight personality adaptation based on game state
    const playerMoney = context.gameState.players[context.playerIndex].money
    const avgMoney = context.gameState.players.reduce((sum, p) => sum + p.money, 0) / context.gameState.players.length

    if (playerMoney > avgMoney * 1.5) {
      // Rich: become more aggressive
      this.personality.aggressiveness = Math.min(0.9, this.personality.aggressiveness + 0.01)
    } else if (playerMoney < avgMoney * 0.5) {
      // Poor: become more conservative
      this.personality.aggressiveness = Math.max(0.1, this.personality.aggressiveness - 0.01)
      this.personality.patience = Math.min(0.9, this.personality.patience + 0.01)
    }
  }

  private updateDeceptionProfile(context: AIDecisionContext): void {
    // Analyze opponent reactions to our deception
    const opponents = Array.from(context.opponentModels.values())
    const suspiciousOpponents = opponents.filter(opp => opp.predictability < 0.3).length

    if (suspiciousOpponents > opponents.length * 0.5) {
      // Opponents catching on: reduce deception
      this.deception.getDeceptionStats() // This would update internal state
    }
  }

  private calculateAverageConfidence(): number {
    // Combine confidence from all sub-components
    const cardPlayConfidence = this.cardPlay.getAverageConfidence()
    const biddingConfidence = this.bidding.getAverageConfidence()

    return (cardPlayConfidence + biddingConfidence) / 2
  }
}