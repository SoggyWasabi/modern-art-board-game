// ===================
// HARD AI DECEPTION
// ===================

import type { Artist, Card, GameState } from '../../../types/game'
import type { AIDecisionContext } from '../../types'
import type { OpponentModel } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Deception and psychological warfare for Hard AI
 * Implements bluffing, pattern breaking, and opponent manipulation
 */
export class HardAIDeception {
  private probability = createProbabilityUtils()

  // Deception state
  private deceptionProfile = {
    bluffFrequency: 0.3,
    patternBreaking: 0.4,
    opponentManipulation: 0.5,
    unpredictability: 0.6,
  }

  /**
   * Decide whether to bluff in current situation
   */
  shouldBluff(
    context: AIDecisionContext,
    auctionType: string,
    cardValue: number,
    opponents: OpponentModel[]
  ): {
    shouldBluff: boolean
    bluffStrength: number
    targetOpponent?: string
    reasoning: string
  } {
    // Base bluff probability from personality
    let bluffChance = this.deceptionProfile.bluffFrequency

    // Adjust based on auction type
    if (auctionType === 'hidden') {
      bluffChance += 0.3 // Hidden auctions are good for bluffing
    } else if (auctionType === 'open') {
      bluffChance -= 0.2 // Open auctions are harder to bluff
    }

    // Adjust based on card value (bluff more with low-value cards)
    if (cardValue < 20) {
      bluffChance += 0.2
    } else if (cardValue > 40) {
      bluffChance -= 0.2
    }

    // Adjust based on opponents
    const gullibleOpponents = opponents.filter(opp => opp.predictability > 0.7)
    if (gullibleOpponents.length > 0) {
      bluffChance += 0.2
    }

    // Adjust based on game state
    if (context.importance > 0.8) {
      bluffChance += 0.1 // More willing to bluff in important situations
    }

    // Random factor for unpredictability
    bluffChance += (this.probability.random() - 0.5) * 0.2

    const shouldBluff = this.probability.random() < Math.max(0.1, Math.min(0.9, bluffChance))

    if (!shouldBluff) {
      return {
        shouldBluff: false,
        bluffStrength: 0,
        reasoning: 'Deception analysis: Conditions not favorable for bluff',
      }
    }

    // Determine bluff strength
    const bluffStrength = this.calculateBluffStrength(cardValue, auctionType, opponents)

    // Select target opponent if applicable
    let targetOpponent: string | undefined
    if (auctionType === 'hidden' && gullibleOpponents.length > 0) {
      // Target most predictable opponent in hidden auctions
      targetOpponent = gullibleOpponents.reduce((most, current) =>
        current.predictability > most.predictability ? current : most
      ).playerId
    }

    return {
      shouldBluff: true,
      bluffStrength,
      targetOpponent,
      reasoning: `Bluff opportunity identified (strength: ${bluffStrength.toFixed(2)})`,
    }
  }

  /**
   * Calculate bluff strength (0-1)
   */
  private calculateBluffStrength(
    cardValue: number,
    auctionType: string,
    opponents: OpponentModel[]
  ): number {
    let strength = 0.5

    // Stronger bluffs with low-value cards
    if (cardValue < 15) {
      strength += 0.3
    } else if (cardValue < 25) {
      strength += 0.1
    }

    // Adjust for auction type
    if (auctionType === 'hidden') {
      strength += 0.2
    } else if (auctionType === 'one_offer') {
      strength += 0.1
    }

    // Stronger bluffs against predictable opponents
    const avgPredictability = opponents.reduce((sum, opp) => sum + opp.predictability, 0) / opponents.length
    strength += avgPredictability * 0.3

    // Stronger bluffs when we have money advantage
    // This would need actual money comparison
    strength += 0.1

    return Math.max(0.1, Math.min(0.9, strength))
  }

  /**
   * Generate deceptive bid amount
   */
  generateDeceptiveBid(
    trueValue: number,
    bluffStrength: number,
    minBid: number,
    maxBid: number,
    auctionType: string
  ): {
    amount: number
    deceptionType: 'overbid' | 'underbid' | 'random' | 'calculated'
    expectedBluffSuccess: number
  } {
    const deceptionTypes: Array<'overbid' | 'underbid' | 'random' | 'calculated'> = [
      'overbid',
      'underbid',
      'random',
      'calculated',
    ]

    // Choose deception type based on bluff strength and auction
    let deceptionType = deceptionTypes[Math.floor(this.probability.random() * deceptionTypes.length)]

    if (auctionType === 'hidden' && bluffStrength > 0.7) {
      // Strong bluffs in hidden auctions often use underbidding
      deceptionType = 'underbid'
    } else if (auctionType === 'open' && bluffStrength > 0.6) {
      // Strong bluffs in open auctions might use overbidding
      deceptionType = 'overbid'
    }

    let amount: number
    let expectedBluffSuccess: number

    switch (deceptionType) {
      case 'overbid':
        // Bid significantly higher than true value
        amount = Math.min(maxBid, Math.floor(trueValue * (1 + bluffStrength * 0.5)))
        expectedBluffSuccess = 0.4
        break

      case 'underbid':
        // Bid lower than expected to seem disinterested
        amount = Math.max(minBid, Math.floor(trueValue * (1 - bluffStrength * 0.3)))
        expectedBluffSuccess = 0.6
        break

      case 'random':
        // Random bid within range
        amount = this.probability.randomInt(minBid, maxBid)
        expectedBluffSuccess = 0.3
        break

      case 'calculated':
        // Calculate bid based on opponent behavior
        amount = Math.floor((minBid + maxBid) / 2 + (this.probability.random() - 0.5) * (maxBid - minBid))
        expectedBluffSuccess = 0.5
        break

      default:
        amount = minBid
        expectedBluffSuccess = 0.2
    }

    return {
      amount: Math.max(minBid, Math.min(maxBid, amount)),
      deceptionType,
      expectedBluffSuccess,
    }
  }

  /**
   * Break patterns to avoid predictability
   */
  shouldBreakPattern(
    recentActions: Array<{ type: string; timestamp: number }>,
    patternType: string
  ): {
    shouldBreak: boolean
    breakType: 'randomize' | 'reverse' | 'delay' | 'exaggerate'
    confidence: number
  } {
    // Detect if we're becoming predictable
    const patternConsistency = this.analyzePatternConsistency(recentActions, patternType)

    if (patternConsistency > 0.8) {
      // High consistency = need to break pattern
      return {
        shouldBreak: true,
        breakType: this.probability.randomChoice(['randomize', 'reverse', 'delay', 'exaggerate']),
        confidence: patternConsistency,
      }
    }

    // Random pattern breaking for unpredictability
    const breakChance = this.deceptionProfile.patternBreaking * 0.5
    const shouldBreak = this.probability.random() < breakChance

    return {
      shouldBreak,
      breakType: this.probability.randomChoice(['randomize', 'reverse', 'delay', 'exaggerate']),
      confidence: 0.3,
    }
  }

  /**
   * Analyze pattern consistency
   */
  private analyzePatternConsistency(
    actions: Array<{ type: string; timestamp: number }>,
    patternType: string
  ): number {
    if (actions.length < 3) return 0.5

    // Analyze timing patterns
    const timeDiffs = []
    for (let i = 1; i < actions.length; i++) {
      timeDiffs.push(actions[i].timestamp - actions[i - 1].timestamp)
    }

    const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
    const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length
    const standardDeviation = Math.sqrt(variance)

    // Lower standard deviation relative to average = more consistent
    const consistency = Math.max(0, 1 - (standardDeviation / Math.max(1, avgTimeDiff)))

    return consistency
  }

  /**
   * Manipulate opponent behavior
   */
  manipulateOpponent(
    opponent: OpponentModel,
    situation: 'auction' | 'card_play' | 'bidding',
    targetEmotion: 'confident' | 'nervous' | 'aggressive' | 'passive'
  ): {
    manipulationAction: string
    expectedEffect: number
    riskLevel: number
  } {
    const manipulationActions = {
      confident: [
        { action: 'Quick confident bid', effect: 0.3, risk: 0.2 },
        { action: 'Bid slightly higher than needed', effect: 0.4, risk: 0.3 },
      ],
      nervous: [
        { action: 'Long hesitation before bidding', effect: 0.4, risk: 0.1 },
        { action: 'Small probing bids', effect: 0.3, risk: 0.2 },
      ],
      aggressive: [
        { action: 'Immediate counter-bid', effect: 0.5, risk: 0.4 },
        { action: 'Bid to intimidate', effect: 0.4, risk: 0.5 },
      ],
      passive: [
        { action: 'Show disinterest with timing', effect: 0.3, risk: 0.2 },
        { action: 'Let opponent set the pace', effect: 0.2, risk: 0.3 },
      ],
    }

    const targetActions = manipulationActions[targetEmotion] || manipulationActions.confident
    const selectedAction = this.probability.randomChoice(targetActions)

    return {
      manipulationAction: selectedAction.action,
      expectedEffect: selectedAction.effect * this.deceptionProfile.opponentManipulation,
      riskLevel: selectedAction.risk,
    }
  }

  /**
   * Create false narrative through actions
   */
  createFalseNarrative(
    gameState: GameState,
    playerIndex: number,
    narrativeType: 'rich_player' | 'poor_player' | 'unpredictable' | 'specialist'
  ): Array<{
    action: string
    timing: number
    confidence: number
  }> {
    const narratives = {
      rich_player: [
        { action: 'Bid aggressively on moderate cards', timing: 1000, confidence: 0.7 },
        { action: 'Overbid slightly to show confidence', timing: 800, confidence: 0.6 },
        { action: 'Quick decision making', timing: 500, confidence: 0.8 },
      ],
      poor_player: [
        { action: 'Long thinking before passing', timing: 3000, confidence: 0.6 },
        { action: 'Hesitant small bids', timing: 2000, confidence: 0.7 },
        { action: 'Frequent passing', timing: 1500, confidence: 0.8 },
      ],
      unpredictable: [
        { action: 'Random bid amounts', timing: Math.random() * 3000, confidence: 0.9 },
        { action: 'Inconsistent timing', timing: Math.random() * 4000 + 500, confidence: 0.8 },
        { action: 'Mixed bidding strategies', timing: 2000, confidence: 0.7 },
      ],
      specialist: [
        { action: 'Focus on specific artist', timing: 1500, confidence: 0.8 },
        { action: 'Ignore other opportunities', timing: 1000, confidence: 0.7 },
        { action: 'Predictable artist preference', timing: 1200, confidence: 0.6 },
      ],
    }

    const selectedNarrative = narratives[narrativeType] || narratives.unpredictable

    return selectedNarrative.map(narrative => ({
      action: narrative.action,
      timing: narrative.timing * (0.8 + Math.random() * 0.4), // Add variance
      confidence: narrative.confidence * (0.9 + Math.random() * 0.2),
    }))
  }

  /**
   * Analyze opponent deception attempts
   */
  analyzeOpponentDeception(
    opponentActions: Array<{ type: string; data: any; timestamp: number }>,
    opponentProfile: OpponentModel
  ): {
    isDeceptive: boolean
    deceptionStrength: number
    deceptionType: 'bluffing' | 'pattern_hiding' | 'reverse_psychology' | 'none'
    confidence: number
  } {
    // Look for signs of deception
    const deceptionSignals = []

    // Inconsistent timing
    const timingVariance = this.calculateTimingVariance(opponentActions)
    if (timingVariance > 0.8) {
      deceptionSignals.push({ type: 'timing', strength: 0.6 })
    }

    // Unusual bid patterns
    const bidPatterns = opponentActions.filter(a => a.type === 'bid')
    const bidAnomaly = this.analyzeBidAnomalies(bidPatterns)
    if (bidAnomaly > 0.7) {
      deceptionSignals.push({ type: 'bidding', strength: 0.7 })
    }

    // Sudden strategy changes
    const strategyChanges = this.detectStrategyChanges(opponentActions)
    if (strategyChanges > 0.5) {
      deceptionSignals.push({ type: 'strategy', strength: 0.5 })
    }

    if (deceptionSignals.length === 0) {
      return {
        isDeceptive: false,
        deceptionStrength: 0,
        deceptionType: 'none',
        confidence: 0.8,
      }
    }

    // Calculate overall deception strength
    const avgStrength = deceptionSignals.reduce((sum, signal) => sum + signal.strength, 0) / deceptionSignals.length

    // Determine deception type
    let deceptionType: 'bluffing' | 'pattern_hiding' | 'reverse_psychology' = 'bluffing'
    if (deceptionSignals.some(s => s.type === 'timing')) {
      deceptionType = 'pattern_hiding'
    } else if (deceptionSignals.some(s => s.type === 'strategy')) {
      deceptionType = 'reverse_psychology'
    }

    return {
      isDeceptive: true,
      deceptionStrength: avgStrength,
      deceptionType,
      confidence: Math.min(0.9, avgStrength + 0.1),
    }
  }

  /**
   * Calculate timing variance
   */
  private calculateTimingVariance(actions: Array<{ type: string; timestamp: number }>): number {
    if (actions.length < 3) return 0

    const timeDiffs = []
    for (let i = 1; i < actions.length; i++) {
      timeDiffs.push(actions[i].timestamp - actions[i - 1].timestamp)
    }

    const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
    const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length

    return Math.min(1, Math.sqrt(variance) / avgTimeDiff)
  }

  /**
   * Analyze bid anomalies
   */
  private analyzeBidAnomalies(bidPatterns: Array<{ type: string; data: any; timestamp: number }>): number {
    if (bidPatterns.length < 2) return 0

    // Look for unusual bid amounts
    const amounts = bidPatterns.map(p => p.data.amount || 0)
    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length

    const anomalies = amounts.filter(amount => Math.abs(amount - avgAmount) > avgAmount * 0.5)

    return anomalies.length / amounts.length
  }

  /**
   * Detect strategy changes
   */
  private detectStrategyChanges(actions: Array<{ type: string; data: any; timestamp: number }>): number {
    // This would analyze changes in behavior patterns
    // For now, return a simplified calculation
    if (actions.length < 5) return 0

    const recentActions = actions.slice(-5)
    const olderActions = actions.slice(-10, -5)

    if (olderActions.length === 0) return 0

    const recentActionTypes = new Set(recentActions.map(a => a.type))
    const olderActionTypes = new Set(olderActions.map(a => a.type))

    const typeOverlap = Array.from(recentActionTypes).filter(type => olderActionTypes.has(type)).length

    return 1 - (typeOverlap / Math.max(recentActionTypes.size, olderActionTypes.size))
  }

  /**
   * Update deception profile based on results
   */
  updateDeceptionProfile(
    deceptionUsed: boolean,
    successful: boolean,
    opponentReactions: string[]
  ): void {
    if (!deceptionUsed) return

    // Adjust bluff frequency based on success
    if (successful) {
      this.deceptionProfile.bluffFrequency = Math.min(0.7, this.deceptionProfile.bluffFrequency + 0.05)
    } else {
      this.deceptionProfile.bluffFrequency = Math.max(0.1, this.deceptionProfile.bluffFrequency - 0.05)
    }

    // Adjust unpredictability based on opponent reactions
    const opponentSuspicion = opponentReactions.filter(r => r.includes('suspicious') || r.includes('unusual')).length
    if (opponentSuspicion > opponentReactions.length * 0.5) {
      // Opponents becoming suspicious - be less predictable
      this.deceptionProfile.unpredictability = Math.min(0.9, this.deceptionProfile.unpredictability + 0.1)
    }
  }

  /**
   * Get deception statistics
   */
  getDeceptionStats() {
    return {
      ...this.deceptionProfile,
      effectiveness: 0, // Would track actual deception success rate
    }
  }
}