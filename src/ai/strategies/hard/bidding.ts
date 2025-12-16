// ===================
// HARD AI BIDDING
// ===================

import type { Card, Artist, GameState } from '../../../types/game'
import type { AuctionState } from '../../../types/auction'
import type { AIDecisionContext, AIPersonality, OpponentModel } from '../../types'
import { ExpectedValueCalculator } from '../medium'
import { MediumAIMarketAnalysis } from '../medium'
import { createProbabilityUtils } from '../../utils'

/**
 * Hard AI bidding with game theory and psychological elements
 */
export class HardAIBidding {
  private evCalculator: ExpectedValueCalculator
  private marketAnalysis: MediumAIMarketAnalysis
  private probability = createProbabilityUtils()

  private decisionCount = 0
  private totalConfidence = 0
  private successfulBluffs = 0
  private failedRisks = 0

  constructor(
    private personality: AIPersonality,
    private memory: any,
    private deception: any,
    seed?: number
  ) {
    this.evCalculator = new ExpectedValueCalculator()
    this.marketAnalysis = new MediumAIMarketAnalysis()
  }

  /**
   * Make optimal bid with game theory considerations
   */
  async makeOptimalBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentHighBid: number | null
  ): Promise<{
    action: 'bid' | 'pass'
    amount?: number
    confidence: number
    reasoning: string
    estimatedValue?: number
    minBid?: number
    maxBid?: number
  }> {
    if (!('card' in auction)) {
      return {
        action: 'pass',
        confidence: 0.1,
        reasoning: 'Hard AI: Invalid auction state',
      }
    }

    const card = auction.card
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    // Advanced market analysis
    const marketAnalysis = this.marketAnalysis.analyzeMarket(gameState, context.playerIndex)
    const opponents = Array.from(context.opponentModels.values())

    // Calculate true value considering opponent modeling
    const trueValue = this.calculateTrueValue(card, context, opponents)

    // Game theory optimal bidding
    const gameTheoryBid = this.calculateGameTheoryOptimalBid(
      card,
      trueValue,
      player.money,
      marketAnalysis,
      currentHighBid,
      opponents
    )

    // Apply personality adjustments
    const personalityAdjustedBid = this.applyPersonalityToBidding(
      gameTheoryBid,
      trueValue,
      player.money
    )

    // Risk assessment with opponent modeling
    const riskAssessment = this.assessBiddingRisk(
      personalityAdjustedBid,
      opponents,
      marketAnalysis
    )

    // Final decision
    const shouldBid = riskAssessment.ev > 0 && riskAssessment.confidence > 0.6

    if (!shouldBid) {
      this.decisionCount++
      this.totalConfidence += 0.7

      return {
        action: 'pass',
        confidence: 0.7,
        reasoning: `Hard AI: Risk assessment negative (EV: ${riskAssessment.ev.toFixed(1)})`,
      }
    }

    this.decisionCount++
    this.totalConfidence += riskAssessment.confidence

    return {
      action: 'bid',
      amount: personalityAdjustedBid,
      confidence: riskAssessment.confidence,
      reasoning: `Hard AI: Game theory optimal bid with opponent modeling`,
      estimatedValue: trueValue,
      minBid: gameTheoryBid.minBid,
      maxBid: gameTheoryBid.maxBid,
    }
  }

  /**
   * Make positional bid in one-offer auction
   */
  async makePositionalBid(
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<{
    action: 'bid' | 'pass'
    amount?: number
    confidence: number
    reasoning: string
    position?: 'first' | 'middle' | 'last' | 'auctioneer'
    estimatedValue?: number
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        action: 'pass',
        confidence: 0.1,
        reasoning: 'Hard AI: Invalid auction state',
      }
    }

    const card = auction.card
    const position = this.calculateBidPosition(gameState, context.playerIndex, auction.auctioneerId)

    // Advanced positional analysis
    const positionalAdvantage = this.calculatePositionalAdvantage(position, card, context)
    const trueValue = this.calculateTrueValue(card, context, Array.from(context.opponentModels.values()))

    // Position-adjusted optimal bid
    let optimalBid = trueValue * positionalAdvantage.multiplier

    // Apply personality with position consideration
    if (position === 'auctioneer' && this.personality.patience > 0.6) {
      optimalBid *= 0.8 // Patient auctioneers bid less
    } else if (position === 'last' && this.personality.aggressiveness > 0.7) {
      optimalBid *= 1.2 // Aggressive last bidders bid more
    }

    optimalBid = Math.floor(optimalBid)

    // Decision logic with opponent prediction
    const opponentPrediction = this.predictOpponentAuctioneerDecision(context, currentBid, trueValue)
    const shouldBid = optimalBid > currentBid && optimalBid <= player.money

    this.decisionCount++
    const confidence = shouldBid ? 0.8 : 0.6
    this.totalConfidence += confidence

    return {
      action: shouldBid ? 'bid' : 'pass',
      amount: shouldBid ? optimalBid : undefined,
      confidence,
      position,
      reasoning: shouldBid
        ? `Hard AI: Positional bid (${position}) with opponent prediction`
        : `Hard AI: Passed due to poor position or value`,
      estimatedValue: trueValue,
    }
  }

  /**
   * Make game theory optimal hidden bid
   */
  async makeGameTheoryOptimalBid(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    amount: number
    confidence: number
    reasoning: string
    trueValue?: number
    nashEquilibrium?: number
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        amount: 0,
        confidence: 0.1,
        reasoning: 'Hard AI: Invalid auction state',
      }
    }

    const card = auction.card
    const opponents = Array.from(context.opponentModels.values())

    // Calculate true value
    const trueValue = this.calculateTrueValue(card, context, opponents)

    // Calculate Nash equilibrium for hidden auction
    const nashEquilibrium = this.calculateHiddenAuctionNashEquilibrium(card, trueValue, opponents, context)

    // Mixed strategy implementation
    const mixedStrategy = this.implementMixedStrategy(trueValue, nashEquilibrium, opponents)

    // Apply personality-based adjustments
    let finalAmount = mixedStrategy.amount
    if (this.personality.bluffingFrequency > this.probability.random()) {
      finalAmount = this.addBluffToHiddenBid(mixedStrategy.amount, trueValue, opponents)
    }

    // Ensure within player's budget
    finalAmount = Math.min(finalAmount, player.money)

    this.decisionCount++
    const confidence = 0.8
    this.totalConfidence += confidence

    return {
      amount: finalAmount,
      confidence,
      reasoning: `Hard AI: Mixed strategy bid (Nash: ${nashEquilibrium.toFixed(1)})`,
      trueValue,
      nashEquilibrium,
    }
  }

  /**
   * Set market-manipulating fixed price
   */
  async setMarketManipulatingPrice(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    optimalPrice: number
    confidence: number
    reasoning: string
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        optimalPrice: 10,
        confidence: 0.1,
        reasoning: 'Hard AI: Invalid auction state',
      }
    }

    const card = auction.card
    const opponents = Array.from(context.opponentModels.values())

    // Calculate optimal price based on opponent modeling
    const trueValue = this.calculateTrueValue(card, context, opponents)
    const opponentMaxBids = this.estimateOpponentMaxBids(opponents, player.money)

    // Strategic pricing to manipulate opponent behavior
    let optimalPrice: number

    if (this.personality.aggressiveness > 0.7 && opponentMaxBids.maxBid > trueValue) {
      // Aggressive: set price just above what opponents can afford
      optimalPrice = Math.min(opponentMaxBids.maxBid + 5, Math.floor(trueValue * 1.2))
    } else if (this.personality.patience > 0.7) {
      // Patient: set price to maximize purchase probability
      optimalPrice = Math.floor(opponentMaxBids.avgBid * 0.8)
    } else {
      // Balanced: optimize for expected value
      optimalPrice = Math.floor(trueValue * 0.7)
    }

    // Apply psychological pricing
    optimalPrice = this.applyPsychologicalPricing(optimalPrice)

    // Ensure reasonable bounds
    optimalPrice = Math.max(10, Math.min(optimalPrice, player.money * 0.8))

    this.decisionCount++
    const confidence = 0.8
    this.totalConfidence += confidence

    return {
      optimalPrice,
      confidence,
      reasoning: `Hard AI: Market-manipulating price based on opponent analysis`,
    }
  }

  /**
   * Make complex strategic double auction decision
   */
  async makeComplexDoubleDecision(
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<{
    action: 'offer' | 'decline'
    cardId?: string
    strategy?: 'control_artist' | 'force_auction' | 'conserve_cards' | 'opposition'
    confidence: number
    reasoning: string
    estimatedValue?: number
  }> {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (!('card' in auction)) {
      return {
        action: 'decline',
        confidence: 0.1,
        strategy: 'conserve_cards',
        reasoning: 'Hard AI: Invalid auction state',
      }
    }

    const primaryCard = auction.card
    const matchingCards = player.hand.filter(
      card => card.artist === primaryCard.artist && card.id !== primaryCard.id
    )

    // Complex strategic analysis
    const strategicAnalysis = this.analyzeDoubleAuctionStrategy(context, primaryCard, matchingCards)

    // Advanced game theory for double auction
    const gameTheoryDecision = this.calculateDoubleAuctionGameTheory(context, primaryCard, matchingCards)

    // Personality-based final decision
    let finalAction = gameTheoryDecision.action
    let finalStrategy = gameTheoryDecision.strategy
    let selectedCard = gameTheoryDecision.card

    // Apply personality overrides
    if (this.personality.aggressiveness > 0.8 && matchingCards.length > 0 && strategicAnalysis.controlOpportunity > 0.7) {
      finalAction = 'offer'
      finalStrategy = 'control_artist'
      selectedCard = this.probability.randomChoice(matchingCards)
    } else if (this.personality.patience > 0.8 && strategicAnalysis.riskLevel > 0.6) {
      finalAction = 'decline'
      finalStrategy = 'conserve_cards'
    }

    this.decisionCount++
    const confidence = 0.8
    this.totalConfidence += confidence

    return {
      action: finalAction,
      cardId: selectedCard?.id,
      strategy: finalStrategy,
      confidence,
      reasoning: `Hard AI: Complex strategic analysis with game theory`,
      estimatedValue: strategicAnalysis.estimatedValue,
    }
  }

  // Private helper methods

  private calculateTrueValue(
    card: Card,
    context: AIDecisionContext,
    opponents: OpponentModel[]
  ): number {
    const baseValue = this.evCalculator.calculateCardEV(card, context.marketAnalysis, context.gameState.round.roundNumber)

    // Adjust based on opponent bidding patterns
    let opponentAdjustment = 0
    opponents.forEach(opponent => {
      const aggressiveness = opponent.tendencies?.aggressiveness || 0.5
      const riskTolerance = opponent.tendencies?.riskTolerance || 0.5

      if (opponent.aggressiveness > 0.7 && card.artist in (opponent.artistPreferences || {})) {
        opponentAdjustment += baseValue * 0.1 * aggressiveness
      }

      if (opponent.riskTolerance < 0.3) {
        opponentAdjustment -= baseValue * 0.1 * (1 - riskTolerance)
      }
    })

    return baseValue + opponentAdjustment
  }

  private calculateGameTheoryOptimalBid(
    card: Card,
    trueValue: number,
    playerMoney: number,
    marketAnalysis: any,
    currentHighBid: number | null,
    opponents: OpponentModel[]
  ): { minBid: number; maxBid: number; amount: number } {
    const minBid = (currentHighBid || 0) + 1

    // Calculate bid range based on opponent modeling
    const avgOpponentBid = this.estimateAverageOpponentBid(opponents, card.artist)
    const maxOpponentBid = this.estimateMaxOpponentBid(opponents, card.artist)

    let maxBid: number

    if (maxOpponentBid < trueValue * 0.8) {
      // Weak opponents: bid higher
      maxBid = Math.min(playerMoney, Math.floor(trueValue * 1.1))
    } else if (avgOpponentBid > trueValue * 1.2) {
      // Strong opponents: bid conservatively
      maxBid = Math.min(playerMoney, Math.floor(trueValue * 0.9))
    } else {
      // Moderate opponents: balanced bidding
      maxBid = Math.min(playerMoney, Math.floor(trueValue * 1.0))
    }

    // Optimal bid between min and max
    const amount = Math.min(maxBid, Math.max(minBid, Math.floor((minBid + maxBid) / 2)))

    return { minBid, maxBid, amount }
  }

  private applyPersonalityToBidding(
    gameTheoryBid: { minBid: number; maxBid: number; amount: number },
    trueValue: number,
    playerMoney: number
  ): number {
    let adjustedAmount = gameTheoryBid.amount

    // Personality-based adjustments
    if (this.personality.aggressiveness > 0.7) {
      adjustedAmount = Math.min(gameTheoryBid.maxBid, Math.floor(adjustedAmount * 1.1))
    } else if (this.personality.aggressiveness < 0.3) {
      adjustedAmount = Math.max(gameTheoryBid.minBid, Math.floor(adjustedAmount * 0.9))
    }

    // Risk tolerance adjustments
    if (this.personality.riskTolerance > 0.7) {
      adjustedAmount = Math.min(playerMoney, Math.floor(adjustedAmount * 1.05))
    } else if (this.personality.riskTolerance < 0.3) {
      adjustedAmount = Math.floor(adjustedAmount * 0.95)
    }

    return Math.max(gameTheoryBid.minBid, Math.min(gameTheoryBid.maxBid, adjustedAmount))
  }

  private assessBiddingRisk(
    bidAmount: number,
    opponents: OpponentModel[],
    marketAnalysis: any
  ): { ev: number; confidence: number } {
    // Complex risk assessment with multiple factors
    const opponentRisk = this.assessOpponentRisk(opponents, bidAmount)
    const marketRisk = this.assessMarketRisk(marketAnalysis, bidAmount)

    // Combine risks
    const totalRisk = (opponentRisk * 0.6) + (marketRisk * 0.4)

    // Calculate expected value (simplified)
    const ev = bidAmount * (1 - totalRisk) // Rough approximation

    // Confidence based on risk level
    const confidence = Math.max(0.3, 1 - totalRisk)

    return { ev, confidence }
  }

  private calculateBidPosition(
    gameState: GameState,
    playerIndex: number,
    auctioneerId: string
  ): 'first' | 'middle' | 'last' | 'auctioneer' {
    const auctioneerIndex = gameState.players.findIndex(p => p.id === auctioneerId)
    if (auctioneerIndex === playerIndex) {
      return 'auctioneer'
    }

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

  private calculatePositionalAdvantage(
    position: 'first' | 'middle' | 'last' | 'auctioneer',
    card: Card,
    context: AIDecisionContext
  ): { multiplier: number; confidence: number } {
    const multipliers = {
      first: 0.9,
      middle: 1.0,
      last: 1.1,
      auctioneer: 0.8,
    }

    const confidences = {
      first: 0.7,
      middle: 0.8,
      last: 0.6,
      auctioneer: 0.9,
    }

    return {
      multiplier: multipliers[position],
      confidence: confidences[position],
    }
  }

  private predictOpponentAuctioneerDecision(
    context: AIDecisionContext,
    currentBid: number,
    trueValue: number
  ): boolean {
    // Predict if auctioneer will accept or outbid
    const auctioneerModel = context.opponentModels[context.gameState.round.currentAuctioneerIndex]

    if (!auctioneerModel) {
      return this.probability.random() < 0.5
    }

    const aggressiveness = auctioneerModel.tendencies?.aggressiveness || 0.5
    const riskTolerance = auctioneerModel.riskTolerance || 0.5

    // Simplified prediction
    const decisionThreshold = trueValue * (0.7 + aggressiveness * 0.3)

    return currentBid < decisionThreshold
  }

  private calculateHiddenAuctionNashEquilibrium(
    card: Card,
    trueValue: number,
    opponents: OpponentModel[],
    context: AIDecisionContext
  ): number {
    // Simplified Nash equilibrium calculation
    // In reality, this would solve complex simultaneous game theory problems

    const avgOpponentValue = opponents.reduce((sum, opp) => {
      const riskAversion = 1 - (opp.riskTolerance || 0.5)
      return sum + (trueValue * riskAversion)
    }, 0) / Math.max(1, opponents.length)

    // Nash equilibrium is somewhere between true value and average opponent value
    return (trueValue + avgOpponentValue) / 2
  }

  private implementMixedStrategy(
    trueValue: number,
    nashEquilibrium: number,
    opponents: OpponentModel[]
  ): { amount: number; strategy: string } {
    // Implement mixed strategy based on opponent types
    const aggressiveOpponents = opponents.filter(opp => (opp.tendencies?.aggressiveness || 0) > 0.6).length
    const conservativeOpponents = opponents.filter(opp => (opp.riskTolerance || 0) < 0.4).length

    let strategy = 'honest'
    let amount = nashEquilibrium

    if (aggressiveOpponents > conservativeOpponents) {
      // More aggressive opponents: bid lower to let them overpay
      if (this.probability.random() < 0.6) {
        strategy = 'underbid'
        amount = Math.floor(nashEquilibrium * 0.8)
      }
    } else if (conservativeOpponents > aggressiveOpponents) {
      // More conservative opponents: bid higher to secure value
      if (this.probability.random() < 0.6) {
        strategy = 'overbid'
        amount = Math.floor(nashEquilibrium * 1.2)
      }
    }

    return { amount, strategy }
  }

  private addBluffToHiddenBid(
    baseAmount: number,
    trueValue: number,
    opponents: OpponentModel[]
  ): number {
    const bluffStrength = this.personality.bluffingFrequency
    const predictableOpponents = opponents.filter(opp => (opp.predictability || 0) > 0.7).length

    if (predictableOpponents === 0 || bluffStrength < 0.3) {
      return baseAmount
    }

    // Bluff: deviate from true value
    const bluffDirection = this.probability.random() < 0.5 ? -1 : 1
    const bluffMagnitude = bluffStrength * predictableOpponents / opponents.length

    return Math.max(0, baseAmount + (bluffDirection * trueValue * bluffMagnitude * 0.3))
  }

  private estimateOpponentMaxBids(opponents: OpponentModel[], ourMoney: number): { maxBid: number; avgBid: number } {
    const bids = opponents.map(opp => {
      const maxMoney = opp.estimatedMoney || 50 // Fallback estimate
      const aggressiveness = opp.tendencies?.aggressiveness || 0.5
      return Math.min(maxMoney * aggressiveness, ourMoney * 1.5)
    })

    return {
      maxBid: Math.max(...bids),
      avgBid: bids.reduce((sum, bid) => sum + bid, 0) / bids.length,
    }
  }

  private estimateAverageOpponentBid(opponents: OpponentModel[], artist: Artist): number {
    const artistBids = opponents.map(opp => {
      const bias = opp.artistPreferences?.[artist] || 0
      const aggressiveness = opp.tendencies?.aggressiveness || 0.5
      const baseBid = 20
      return baseBid * (1 + bias) * aggressiveness
    })

    return artistBids.reduce((sum, bid) => sum + bid, 0) / opponents.length
  }

  private estimateMaxOpponentBid(opponents: OpponentModel[], artist: Artist): number {
    return Math.max(...opponents.map(opp => {
      const bias = opp.artistPreferences?.[artist] || 0
      const aggressiveness = opp.tendencies?.aggressiveness || 0.5
      const baseBid = 20
      return baseBid * (1 + bias) * (1 + aggressiveness)
    }))
  }

  private assessOpponentRisk(opponents: OpponentModel[], bidAmount: number): number {
    // Assess risk based on opponent strength and behavior
    const avgAggressiveness = opponents.reduce((sum, opp) => sum + (opp.tendencies?.aggressiveness || 0.5), 0) / opponents.length

    // Higher aggressiveness = higher risk
    return avgAggressiveness
  }

  private assessMarketRisk(marketAnalysis: any, bidAmount: number): number {
    // Assess risk based on market conditions
    const volatility = marketAnalysis.volatility || 0.5
    const competitionLevel = marketAnalysis.marketState === 'competitive' ? 0.7 : 0.3

    return (volatility * 0.6) + (competitionLevel * 0.4)
  }

  private analyzeDoubleAuctionStrategy(
    context: AIDecisionContext,
    primaryCard: Card,
    matchingCards: Card[]
  ): {
    controlOpportunity: number
    riskLevel: number
    estimatedValue: number
    strategicAdvantage: number
  } {
    const artistCompetitiveness = context.marketAnalysis.artistCompetitiveness[primaryCard.artist]

    const controlOpportunity = matchingCards.length > 0 && artistCompetitiveness.cardsNeededForValue <= 2 ? 0.8 : 0.3
    const riskLevel = artistCompetitiveness.rank >= 4 ? 0.7 : 0.3
    const estimatedValue = artistCompetitiveness.expectedFinalValue
    const strategicAdvantage = this.calculateStrategicAdvantage(context, primaryCard)

    return {
      controlOpportunity,
      riskLevel,
      estimatedValue,
      strategicAdvantage,
    }
  }

  private calculateDoubleAuctionGameTheory(
    context: AIDecisionContext,
    primaryCard: Card,
    matchingCards: Card[]
  ): { action: 'offer' | 'decline'; strategy: string; card?: Card } {
    // Complex game theory analysis for double auction
    const analysis = this.analyzeDoubleAuctionStrategy(context, primaryCard, matchingCards)

    let action: 'offer' | 'decline' = 'decline'
    let strategy = 'conserve_cards'
    let selectedCard: Card | undefined

    // Decision based on expected value
    const offerValue = analysis.controlOpportunity * analysis.strategicAdvantage
    const riskCost = analysis.riskLevel * analysis.estimatedValue

    if (offerValue > riskCost && matchingCards.length > 0) {
      action = 'offer'
      strategy = 'control_artist'
      selectedCard = matchingCards[0]
    } else if (analysis.strategicAdvantage > 0.6 && this.personality.aggressiveness > 0.6) {
      action = 'offer'
      strategy = 'force_auction'
      selectedCard = matchingCards[0]
    }

    return { action, strategy, card: selectedCard }
  }

  private calculateStrategicAdvantage(context: AIDecisionContext, card: Card): number {
    // Calculate how much advantage this card gives in current situation
    const marketAnalysis = context.marketAnalysis
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]

    let advantage = 0.5 // Base advantage

    // Advantage based on artist position
    if (artistCompetitiveness.rank <= 2) {
      advantage += 0.3
    } else if (artistCompetitiveness.rank >= 4) {
      advantage -= 0.2
    }

    // Advantage based on market state
    if (marketAnalysis.marketState === 'emerging') {
      advantage += 0.2
    } else if (marketAnalysis.marketState === 'consolidated') {
      advantage -= 0.1
    }

    return Math.max(0, Math.min(1, advantage))
  }

  private applyPsychologicalPricing(price: number): number {
    // Apply psychological pricing techniques
    // Round numbers, just below thresholds, etc.
    if (price % 10 !== 0 && price > 10) {
      return Math.round(price / 10) * 10
    }

    // Price just below psychological thresholds
    const thresholds = [20, 30, 40, 50]
    for (const threshold of thresholds) {
      if (price > threshold && price < threshold + 2) {
        return threshold
      }
    }

    return price
  }

  /**
   * Calculate bid for regular auction
   */
  async calculateBid(
    card: Card,
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<any> {
    const decision = await this.makeOptimalBid(context, auction, currentBid)

    return {
      type: 'bid',
      confidence: decision.confidence,
      action: decision.action,
      amount: decision.amount || 0,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Calculate hidden bid
   */
  async calculateHiddenBid(
    card: Card,
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<any> {
    const decision = await this.makeGameTheoryOptimalBid(context, auction)

    return {
      type: 'hidden_bid',
      confidence: decision.confidence,
      amount: decision.amount,
      bluffFactor: decision.bluffFactor || 0,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Calculate fixed price decision
   */
  async calculateFixedPriceDecision(
    card: Card,
    context: AIDecisionContext,
    auction: AuctionState,
    currentBid: number
  ): Promise<any> {
    const decision = await this.setMarketManipulatingPrice(context, auction)

    return {
      type: 'fixed_price',
      confidence: decision.confidence,
      price: decision.optimalPrice || 10,
      priceReasoning: decision.reasoning as any,
      reasoning: decision.reasoning,
    }
  }

  /**
   * Calculate buy decision
   */
  async calculateBuyDecision(
    card: Card,
    context: AIDecisionContext,
    auction: AuctionState
  ): Promise<any> {
    // Simple buy decision logic - would be more sophisticated in full implementation
    const trueValue = await this.calculateTrueValue(card, context)
    const fixedPrice = auction.fixedPrice || 0

    const shouldBuy = trueValue > fixedPrice * 1.2 // Buy if we get good value

    return {
      type: 'buy',
      confidence: shouldBuy ? 0.8 : 0.6,
      action: shouldBuy ? 'buy' : 'pass',
      reasoning: shouldBuy
        ? `Good value: true value ${trueValue.toFixed(1)} vs price ${fixedPrice}`
        : `Poor value: true value ${trueValue.toFixed(1)} vs price ${fixedPrice}`,
    }
  }

  private initialize(gameState: any, playerIndex: number): void {
    this.decisionCount = 0
    this.totalConfidence = 0
    this.successfulBluffs = 0
    this.failedRisks = 0
  }

  private update(context: AIDecisionContext): void {
    // Update bidding strategy based on game evolution
  }

  private cleanup(): void {
    // No resources to clean up
  }

  private getStats() {
    return {
      decisionsMade: this.decisionCount,
      totalConfidence: this.totalConfidence,
      successfulBluffs: this.successfulBluffs,
      failedRisks: this.failedRisks,
    }
  }

  private getAverageConfidence(): number {
    return this.decisionCount > 0 ? this.totalConfidence / this.decisionCount : 0.8
  }

  private getDecisionCount(): number {
    return this.decisionCount
  }
}