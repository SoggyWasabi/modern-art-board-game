// ===================
// MEDIUM AI BIDDING
// ===================

import type { Card, Artist, GameState } from '../../../types/game'
import type { AuctionState } from '../../../types/auction'
import type { AIDecisionContext } from '../../types'
import { ExpectedValueCalculator } from './expected-value'
import { MediumAIMarketAnalysis } from './market-analysis'
import { createProbabilityUtils } from '../../utils'

/**
 * Medium AI bidding logic - uses EV calculations and strategic thinking
 */
export class MediumAIBidding {
  private evCalculator: ExpectedValueCalculator
  private marketAnalysis: MediumAIMarketAnalysis
  private probability = createProbabilityUtils()

  private decisionCount = 0
  private totalConfidence = 0

  constructor(seed?: number) {
    this.evCalculator = new ExpectedValueCalculator()
    this.marketAnalysis = new MediumAIMarketAnalysis()
  }

  /**
   * Make strategic open bid
   */
  async makeOpenBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentHighBid: number | null
  ): Promise<{
    action: 'bid' | 'pass'
    amount?: number
    maxBid?: number
    confidence: number
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        action: 'pass',
        confidence: 0.1,
        reasoning: 'Medium AI: Invalid auction state',
      }
    }

    const card = auction.card

    // Calculate optimal bid
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const competitionLevel = this.estimateCompetitionLevel(gameState, context.playerIndex)

    const optimalBid = this.evCalculator.calculateOptimalBid(
      card,
      player.money,
      marketAnalysis,
      currentHighBid,
      competitionLevel
    )

    // Decide whether to bid based on EV and risk
    const shouldBid = optimalBid.ev > 0 && optimalBid.confidence > 0.5

    if (!shouldBid || optimalBid.amount > player.money) {
      this.decisionCount++
      this.totalConfidence += 0.6

      return {
        action: 'pass',
        confidence: 0.6,
        reasoning: `Medium AI: EV negative (${optimalBid.ev.toFixed(1)}) or cannot afford bid`,
      }
    }

    this.decisionCount++
    this.totalConfidence += optimalBid.confidence

    return {
      action: 'bid',
      amount: optimalBid.amount,
      maxBid: Math.min(player.money, optimalBid.amount * 1.5),
      confidence: optimalBid.confidence,
      reasoning: `Medium AI: Optimal bid ${optimalBid.amount} with EV ${optimalBid.ev.toFixed(1)}`,
    }
  }

  /**
   * Make strategic one-offer bid
   */
  async makeOneOfferBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<{
    action: 'bid' | 'pass'
    amount?: number
    position?: 'first' | 'middle' | 'last' | 'auctioneer'
    confidence: number
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        action: 'pass',
        confidence: 0.1,
        reasoning: 'Medium AI: Invalid auction state',
      }
    }

    const card = auction.card
    const position = this.calculateBidPosition(gameState, context.playerIndex, auction.auctioneerId)

    // Calculate bid EV considering position
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const cardEV = this.evCalculator.calculateCardEV(card, marketAnalysis, gameState.round.roundNumber)

    // Position-adjusted bidding strategy
    const positionMultiplier = this.getPositionMultiplier(position)
    const maxBid = Math.floor(cardEV * positionMultiplier * 0.9) // Less conservative

    const shouldBid = maxBid > currentBid && maxBid <= player.money * 0.8 // Increased from 0.6 to 0.8

    if (!shouldBid) {
      this.decisionCount++
      this.totalConfidence += 0.5

      return {
        action: 'pass',
        position,
        confidence: 0.5,
        reasoning: `Medium AI: Position disadvantage or EV too low`,
      }
    }

    // Make a more competitive bid
    const minIncrement = Math.max(1, Math.floor(maxBid * 0.1))
    const bidAmount = currentBid + minIncrement

    this.decisionCount++
    this.totalConfidence += 0.7

    return {
      action: 'bid',
      amount: Math.min(bidAmount, maxBid),
      position,
      confidence: 0.7,
      reasoning: `Medium AI: Positional bid with EV consideration`,
    }
  }

  /**
   * Make strategic hidden bid
   */
  async makeHiddenBid(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    amount: number
    confidence: number
    bluffFactor?: number
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        amount: 0,
        confidence: 0.1,
        reasoning: 'Medium AI: Invalid auction state',
      }
    }

    const card = auction.card
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const cardEV = this.evCalculator.calculateCardEV(card, marketAnalysis, gameState.round.roundNumber)

    // Hidden bid strategy: bid around 60% of EV with some variance
    let baseBid = Math.floor(cardEV * 0.6)

    // Add variance for unpredictability
    const variance = Math.floor(cardEV * 0.2 * (this.probability.random() - 0.5))
    baseBid = Math.max(0, baseBid + variance)

    // Occasionally bluff (bid higher or lower than true value)
    let bluffFactor = 0
    if (this.probability.random() < 0.3) { // 30% chance to bluff
      const bluffDirection = this.probability.random() < 0.5 ? -1 : 1
      bluffFactor = 0.3 * bluffDirection
      baseBid = Math.floor(baseBid * (1 + bluffFactor))
    }

    const finalBid = Math.min(baseBid, player.money)

    this.decisionCount++
    const confidence = 0.6 + Math.abs(bluffFactor) * 0.2
    this.totalConfidence += confidence

    return {
      amount: finalBid,
      confidence,
      bluffFactor: bluffFactor !== 0 ? Math.abs(bluffFactor) : undefined,
      reasoning: `Medium AI: Hidden bid based on EV ${cardEV.toFixed(1)} with variance`,
    }
  }

  /**
   * Set strategic fixed price
   */
  async setFixedPrice(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    price: number
    confidence: number
    priceReasoning: 'aggressive' | 'conservative' | 'optimal' | 'desperate'
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        price: 10,
        confidence: 0.1,
        priceReasoning: 'conservative',
        reasoning: 'Medium AI: Invalid auction state',
      }
    }

    const card = auction.card
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const cardEV = this.evCalculator.calculateCardEV(card, marketAnalysis, gameState.round.roundNumber)

    // Fixed price strategy: aim for 70% of EV with adjustments
    let targetPrice = Math.floor(cardEV * 0.7)

    // Adjust for competition level
    const competitionLevel = this.estimateCompetitionLevel(gameState, context.playerIndex)
    if (competitionLevel === 'high') {
      targetPrice = Math.floor(targetPrice * 0.8) // Lower price in competitive markets
    } else if (competitionLevel === 'low') {
      targetPrice = Math.floor(targetPrice * 1.2) // Higher price in uncompetitive markets
    }

    // Ensure price is reasonable
    targetPrice = Math.max(10, Math.min(targetPrice, player.money * 0.8))

    // Determine pricing strategy
    let priceReasoning: 'aggressive' | 'conservative' | 'optimal' | 'desperate'
    const priceRatio = targetPrice / cardEV

    if (priceRatio > 0.9) {
      priceReasoning = 'aggressive'
    } else if (priceRatio > 0.6) {
      priceReasoning = 'optimal'
    } else if (priceRatio > 0.4) {
      priceReasoning = 'conservative'
    } else {
      priceReasoning = 'desperate'
    }

    this.decisionCount++
    const confidence = 0.7 - Math.abs(priceRatio - 0.7) // Confidence higher near optimal ratio
    this.totalConfidence += confidence

    return {
      price: targetPrice,
      confidence,
      priceReasoning,
      reasoning: `Medium AI: Fixed price ${targetPrice} based on EV ${cardEV.toFixed(1)} and competition`,
    }
  }

  /**
   * Make strategic double offer decision
   */
  async makeDoubleOffer(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    action: 'offer' | 'decline'
    cardId?: string
    strategy?: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition'
    confidence: number
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        action: 'decline',
        confidence: 0.1,
        strategy: 'conserve_cards',
        reasoning: 'Medium AI: Invalid auction state',
      }
    }

    const primaryCard = auction.card
    const matchingCards = player.hand.filter(
      card => card.artist === primaryCard.artist && card.id !== primaryCard.id
    )

    // Analyze artist control opportunity
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[primaryCard.artist]

    // Strategic decision
    let shouldOffer = false
    let strategy: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition' = 'conserve_cards'
    let selectedCard: Card | undefined

    // Offer if it helps control artist and we have cards
    if (matchingCards.length > 0 && artistCompetitiveness.cardsNeededForValue <= 2) {
      shouldOffer = true
      strategy = 'control_artist'
      selectedCard = this.probability.randomChoice(matchingCards)
    }
    // Offer to force auction if we have good position
    else if (matchingCards.length > 0 && context.playerIndex === gameState.round.currentAuctioneerIndex) {
      shouldOffer = true
      strategy = 'force_auction'
      selectedCard = matchingCards[0]
    }
    // Offer for strategic opposition
    else if (matchingCards.length > 1 && artistCompetitiveness.rank <= 2) {
      shouldOffer = this.probability.random() < 0.4
      if (shouldOffer) {
        strategy = 'opposition'
        selectedCard = matchingCards[0]
      }
    }

    if (!shouldOffer || !selectedCard) {
      this.decisionCount++
      this.totalConfidence += 0.6

      return {
        action: 'decline',
        strategy,
        confidence: 0.6,
        reasoning: `Medium AI: Declining double offer to conserve cards`,
      }
    }

    this.decisionCount++
    this.totalConfidence += 0.7

    return {
      action: 'offer',
      cardId: selectedCard.id,
      strategy,
      confidence: 0.7,
      reasoning: `Medium AI: Offering ${selectedCard.artist} card for ${strategy} strategy`,
    }
  }

  /**
   * Estimate competition level in auction
   */
  private estimateCompetitionLevel(gameState: GameState, playerIndex: number): 'low' | 'medium' | 'high' {
    const player = gameState.players[playerIndex]
    const avgMoney = gameState.players.reduce((sum, p) => sum + p.money, 0) / gameState.players.length

    if (player.money > avgMoney * 1.5) {
      return 'low' // We have money advantage
    } else if (player.money < avgMoney * 0.7) {
      return 'high' // We have money disadvantage
    } else {
      return 'medium'
    }
  }

  /**
   * Calculate bid position in one-offer auction
   */
  private calculateBidPosition(
    gameState: GameState,
    playerIndex: number,
    auctioneerId: string
  ): 'first' | 'middle' | 'last' | 'auctioneer' {
    const auctioneerIndex = gameState.players.findIndex(p => p.id === auctioneerId)
    if (auctioneerIndex === playerIndex) {
      return 'auctioneer'
    }

    // Calculate position in bidding order (starts left of auctioneer)
    const playerCount = gameState.players.length
    const positionInOrder = (playerIndex - auctioneerIndex - 1 + playerCount) % playerCount

    if (positionInOrder === 0) {
      return 'first'
    } else if (positionInOrder === playerCount - 2) {
      return 'last'
    } else {
      return 'middle'
    }
  }

  /**
   * Get multiplier based on bidding position
   */
  private getPositionMultiplier(position: 'first' | 'middle' | 'last' | 'auctioneer'): number {
    const multipliers = {
      first: 0.8,     // Bid conservatively when first
      middle: 1.0,    // Normal bidding in middle
      last: 1.2,      // Can be more aggressive when last
      auctioneer: 0.6, // Most conservative as auctioneer
    }

    return multipliers[position]
  }

  /**
   * Initialize with game state
   */
  initialize(gameState: any, playerIndex: number): void {
    this.decisionCount = 0
    this.totalConfidence = 0
  }

  /**
   * Update with new context
   */
  update(context: AIDecisionContext): void {
    // Medium AI adapts based on market changes
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
      totalConfidence: this.totalConfidence,
    }
  }
}