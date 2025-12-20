// ===================
// MEDIUM AI STRATEGY
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
  AnyAIDecision,
} from '../../types'
import { MediumAICardPlay } from './card-play'
import { MediumAIBidding } from './bidding'
import { MediumAICardValuation } from './valuation'

/**
 * Medium AI Strategy - Expected value calculator
 * Uses mathematical optimization and basic strategic thinking
 */
export class MediumAIStrategy implements AIStrategy {
  public readonly difficulty = 'medium' as const
  public readonly name = 'Medium AI'
  public readonly description = 'Uses expected value calculations and basic strategy'

  private cardPlay: MediumAICardPlay
  private bidding: MediumAIBidding
  private valuation: MediumAICardValuation

  constructor(private seed?: number) {
    this.cardPlay = new MediumAICardPlay(seed)
    this.bidding = new MediumAIBidding(seed)
    this.valuation = new MediumAICardValuation()
  }

  /**
   * Choose card with highest expected value
   */
  async chooseCardToAuction(context: AIDecisionContext): Promise<AICardPlayDecision> {
    const card = await this.cardPlay.selectOptimalCard(context)

    if (!card) {
      throw new Error('No cards available to select')
    }

    return {
      type: 'card_play',
      action: 'play_card',
      confidence: card.evaluation.confidence,
      cardId: card.card.id,
      card: card.card,
      reasoning: `Medium AI: Selected ${card.card.artist} with EV ${card.evaluation.strategicValue.toFixed(2)}`,
    }
  }

  /**
   * Make strategic bid in open auction
   */
  async chooseOpenBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentHighBid: number | null
  ): Promise<AIBidDecision> {
    const decision = await this.bidding.makeOpenBid(context, auction, currentHighBid)

    return {
      type: 'bid',
      confidence: decision.confidence,
      action: decision.action,
      amount: decision.amount,
      reasoning: decision.reasoning,
      maxBid: decision.maxBid,
    }
  }

  /**
   * Make strategic bid in one-offer auction
   */
  async chooseOneOfferBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<AIOneOfferBidDecision> {
    const decision = await this.bidding.makeOneOfferBid(context, auction, currentBid)

    return {
      type: 'one_offer_bid',
      confidence: decision.confidence,
      action: decision.action,
      amount: decision.amount,
      position: decision.position,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Make strategic hidden bid
   */
  async chooseHiddenBid(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIHiddenBidDecision> {
    const decision = await this.bidding.makeHiddenBid(context, auction)

    return {
      type: 'hidden_bid',
      confidence: decision.confidence,
      amount: decision.amount,
      bluffFactor: decision.bluffFactor,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Set strategic fixed price
   */
  async chooseFixedPrice(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIFixedPriceDecision> {
    const decision = await this.bidding.setFixedPrice(context, auction)

    return {
      type: 'fixed_price',
      confidence: decision.confidence,
      price: decision.price,
      priceReasoning: decision.priceReasoning,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Strategic decision for double auction
   */
  async chooseDoubleOffer(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIDoubleOfferDecision> {
    const decision = await this.bidding.makeDoubleOffer(context, auction)

    return {
      type: 'double_offer',
      confidence: decision.confidence,
      action: decision.action,
      cardId: decision.cardId,
      strategy: decision.strategy,
      reasoning: decision.reasoning,
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
    const actualDelay = Math.random() * (delay.max - delay.min) + delay.min
    await new Promise(resolve => setTimeout(resolve, actualDelay))

    switch (decisionType) {
      case 'card_play':
        return await this.chooseCardToAuction(context)

      case 'bid':
        if (!options?.auction) {
          throw new Error('Auction state required for bid decisions')
        }
        return await this.chooseOpenBid(context, options.auction, options.currentBid || null)

      case 'hidden_bid':
        if (!options?.auction) {
          throw new Error('Auction state required for hidden bid decisions')
        }
        return await this.chooseHiddenBid(context, options.auction)

      case 'fixed_price':
        if (!options?.auction) {
          throw new Error('Auction state required for fixed price decisions')
        }
        return await this.chooseFixedPrice(context, options.auction, options.currentBid || 0)

      case 'buy':
        if (!options?.auction) {
          throw new Error('Auction state required for buy decisions')
        }
        // For buy decisions, evaluate if the fixed price is good value
        const fixedPrice = (options.auction as any).price || 0
        const cardValue = this.valuation.evaluateCard(options.auction.card || { id: 'unknown', artist: 'Unknown' as Artist, auctionType: 'fixed_price' as AuctionType }, context.gameState, context.playerIndex)

        return {
          type: 'buy',
          action: cardValue.estimatedValue > fixedPrice * 1.2 ? 'buy' : 'pass',
          confidence: 0.7,
          reasoning: cardValue.estimatedValue > fixedPrice * 1.2
            ? `Good value: ${cardValue.estimatedValue.toFixed(1)} vs ${fixedPrice}`
            : `Poor value: ${cardValue.estimatedValue.toFixed(1)} vs ${fixedPrice}`,
        }

      default:
        throw new Error(`Unknown decision type: ${decisionType}`)
    }
  }

  /**
   * Get thinking delay for Medium AI
   */
  getThinkingDelay(): ThinkingDelay {
    return {
      min: 1500,   // 1.5 seconds minimum
      max: 5000,   // 5 seconds maximum
      distribution: 'normal',
      humanPauses: true,
    }
  }

  /**
   * Initialize strategy for new game
   */
  initialize(gameState: GameState, playerIndex: number): void {
    // Medium AI analyzes initial game state
    this.cardPlay.initialize(gameState, playerIndex)
    this.bidding.initialize(gameState, playerIndex)
  }

  /**
   * Update strategy based on game events
   */
  update(context: AIDecisionContext): void {
    // Medium AI adapts to changing market conditions
    this.cardPlay.update(context)
    this.bidding.update(context)
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cardPlay.cleanup()
    this.bidding.cleanup()
  }

  /**
   * Get strategy statistics for debugging
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      decisionsMade: this.cardPlay.getDecisionCount() + this.bidding.getDecisionCount(),
      averageConfidence: this.getAverageConfidence(),
      evCalculations: this.cardPlay.getEVCalculationCount(),
      strategic: 'medium',
    }
  }

  /**
   * Get average confidence across decisions
   */
  private getAverageConfidence(): number {
    const cardPlayStats = this.cardPlay.getStats()
    const biddingStats = this.bidding.getStats()

    const totalConfidence = cardPlayStats.totalConfidence + biddingStats.totalConfidence
    const totalDecisions = cardPlayStats.decisionsMade + biddingStats.decisionsMade

    return totalDecisions > 0 ? totalConfidence / totalDecisions : 0.5
  }
}