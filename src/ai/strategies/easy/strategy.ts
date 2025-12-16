// ===================
// EASY AI STRATEGY
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
import { createProbabilityUtils } from '../../utils'

/**
 * Easy AI Strategy - Random but valid decisions
 * Provides basic gameplay without strategic thinking
 */
export class EasyAIStrategy implements AIStrategy {
  public readonly difficulty = 'easy' as const
  public readonly name = 'Easy AI'
  public readonly description = 'Makes random but valid decisions'

  private probability = createProbabilityUtils(Date.now())

  constructor(private seed?: number) {
    if (seed) {
      this.probability = createProbabilityUtils(seed)
    }
  }

  /**
   * Choose a random card to auction
   */
  async chooseCardToAuction(context: AIDecisionContext): Promise<AICardPlayDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      // Return a decision with null card instead of throwing
      return {
        type: 'card_play',
        action: 'play_card',
        confidence: 0.1,
        cardId: '',
        card: null,
        reasoning: 'Easy AI: No cards in hand',
      }
    }

    // Choose random card from hand
    const card = this.probability.randomChoice(player.hand)

    return {
      type: 'card_play',
      action: 'play_card',
      confidence: 0.5, // Low confidence for random choice
      cardId: card.id,
      card,
      reasoning: 'Easy AI: Random card selection',
    }
  }

  /**
   * Make random bid decision in open auction
   */
  async chooseOpenBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentHighBid: number | null
  ): Promise<AIBidDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // Randomly decide to bid or pass
    const shouldBid = currentHighBid === null || this.probability.random() < 0.6

    if (!shouldBid) {
      return {
        type: 'bid',
        confidence: 0.4,
        action: 'pass',
        reasoning: 'Easy AI: Randomly decided to pass',
      }
    }

    // Calculate random bid amount
    const minBid = (currentHighBid || 0) + 1
    const maxBid = Math.min(player.money, currentHighBid ? currentHighBid + 20 : 30)

    if (minBid > maxBid) {
      return {
        type: 'bid',
        confidence: 0.3,
        action: 'pass',
        reasoning: 'Easy AI: Cannot afford to bid',
      }
    }

    const bidAmount = this.probability.randomInt(minBid, maxBid)

    return {
      type: 'bid',
      confidence: 0.5,
      action: 'bid',
      amount: bidAmount,
      reasoning: `Easy AI: Random bid between ${minBid} and ${maxBid}`,
    }
  }

  /**
   * Make random bid in one-offer auction
   */
  async chooseOneOfferBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<AIOneOfferBidDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // Randomly decide to bid or pass (with some bias toward passing)
    const shouldBid = this.probability.random() < 0.4

    if (!shouldBid || currentBid >= player.money) {
      return {
        type: 'one_offer_bid',
        confidence: 0.3,
        action: 'pass',
        reasoning: 'Easy AI: Randomly decided to pass or cannot afford',
      }
    }

    // Bid slightly higher than current bid with some randomness
    const minBid = currentBid + 1
    const maxBid = Math.min(player.money, currentBid + 15)
    const bidAmount = this.probability.randomInt(minBid, maxBid)

    return {
      type: 'one_offer_bid',
      confidence: 0.4,
      action: 'bid',
      amount: bidAmount,
      reasoning: `Easy AI: Random bid in one-offer auction`,
    }
  }

  /**
   * Make random hidden bid
   */
  async chooseHiddenBid(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIHiddenBidDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // 60% chance to bid 0 (pass)
    if (this.probability.random() < 0.6) {
      return {
        type: 'hidden_bid',
        confidence: 0.3,
        amount: 0,
        reasoning: 'Easy AI: Randomly decided not to bid',
      }
    }

    // If bidding, choose random amount
    const maxBid = Math.min(player.money, 25)
    const bidAmount = this.probability.randomInt(1, maxBid)

    return {
      type: 'hidden_bid',
      confidence: 0.4,
      amount: bidAmount,
      reasoning: 'Easy AI: Random hidden bid amount',
    }
  }

  /**
   * Set random fixed price
   */
  async chooseFixedPrice(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIFixedPriceDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // Choose random price between 10 and 60% of money
    const minPrice = 10
    const maxPrice = Math.max(minPrice, Math.floor(player.money * 0.6))
    const price = this.probability.randomInt(minPrice, maxPrice)

    let priceReasoning: 'aggressive' | 'conservative' | 'optimal' | 'desperate'
    if (price > player.money * 0.5) {
      priceReasoning = 'aggressive'
    } else if (price < 20) {
      priceReasoning = 'conservative'
    } else if (price > player.money * 0.4) {
      priceReasoning = 'optimal'
    } else {
      priceReasoning = 'desperate'
    }

    return {
      type: 'fixed_price',
      confidence: 0.5,
      price,
      priceReasoning,
      reasoning: `Easy AI: Random fixed price between ${minPrice} and ${maxPrice}`,
    }
  }

  /**
   * Randomly decide to offer or decline in double auction
   */
  async chooseDoubleOffer(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<AIDoubleOfferDecision> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // Check if we have a matching card
    const primaryArtist = 'card' in auction ? auction.card.artist : null
    let matchingCards: Card[] = []

    if (primaryArtist) {
      matchingCards = player.hand.filter(card => card.artist === primaryArtist && card.id !== auction.card.id)
    }

    // Randomly decide to offer (50/50 if we have cards, decline if no cards)
    const shouldOffer = matchingCards.length > 0 && this.probability.random() < 0.5

    if (!shouldOffer || matchingCards.length === 0) {
      let strategy: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition' = 'conserve_cards'
      if (matchingCards.length === 0) {
        strategy = 'conserve_cards'
      } else {
        strategy = 'opposition'
      }

      return {
        type: 'double_offer',
        confidence: 0.4,
        action: 'decline',
        strategy,
        reasoning: 'Easy AI: Randomly decided to decline double offer',
      }
    }

    // Choose random matching card to offer
    const cardToOffer = this.probability.randomChoice(matchingCards)

    let strategy: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition'
    if (this.probability.random() < 0.3) {
      strategy = 'control_artist'
    } else if (this.probability.random() < 0.6) {
      strategy = 'force_auction'
    } else {
      strategy = 'opposition'
    }

    return {
      type: 'double_offer',
      confidence: 0.5,
      action: 'offer',
      cardId: cardToOffer.id,
      strategy,
      reasoning: 'Easy AI: Randomly decided to offer matching card',
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
        // Simple buy logic: 50% chance to buy
        const shouldBuy = this.probability.random() < 0.5
        return {
          type: 'buy',
          action: shouldBuy ? 'buy' : 'pass',
          confidence: 0.5,
          reasoning: shouldBuy ? 'Easy AI: Randomly decided to buy' : 'Easy AI: Randomly decided to pass',
        }

      default:
        throw new Error(`Unknown decision type: ${decisionType}`)
    }
  }

  /**
   * Get thinking delay for Easy AI
   */
  getThinkingDelay(): ThinkingDelay {
    return {
      min: 100,    // 0.1 seconds minimum
      max: 800,    // 0.8 seconds maximum
      distribution: 'uniform',
      humanPauses: true,
    }
  }

  /**
   * Initialize strategy for new game
   */
  initialize(gameState: GameState, playerIndex: number): void {
    // Easy AI doesn't need initialization
    // Could set a deterministic seed for testing if needed
  }

  /**
   * Update strategy based on game events
   */
  update(context: AIDecisionContext): void {
    // Easy AI doesn't learn or adapt
    // Strategy remains random throughout the game
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No resources to clean up
  }

  /**
   * Get strategy statistics for debugging
   */
  getStats() {
    return {
      difficulty: this.difficulty,
      decisionsMade: 0,
      averageConfidence: 0.5,
      randomness: 'high',
    }
  }
}