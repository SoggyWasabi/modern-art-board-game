// ===================
// MEDIUM AI VALUATION
// ===================

import type { Artist, Card, GameState } from '../../../types/game'
import type { MarketAnalysis, CardEvaluation } from '../../types'
import { ExpectedValueCalculator } from './expected-value'
import { createProbabilityUtils } from '../../utils'

/**
 * Card valuation utilities for Medium AI
 * Analyzes cards from multiple perspectives
 */
export class MediumAICardValuation {
  private evCalculator = new ExpectedValueCalculator()
  private probability = createProbabilityUtils()

  /**
   * Comprehensive card evaluation
   */
  evaluateCard(card: Card, gameState: GameState, playerIndex: number): CardEvaluation {
    const marketAnalysis = this.createMarketAnalysis(gameState)
    const player = gameState.players[playerIndex]

    // Calculate various value components
    const baseValue = this.calculateBaseValue(card, marketAnalysis)
    const marketPotential = this.calculateMarketPotential(card, marketAnalysis, gameState)
    const auctionComplexity = this.calculateAuctionComplexity(card.auctionType, marketAnalysis)
    const artistControl = this.calculateArtistControl(card, gameState, playerIndex)
    const riskLevel = this.calculateRiskLevel(card, marketAnalysis, player.money)

    // Combine into strategic value
    const strategicValue = this.calculateStrategicValue(
      baseValue,
      marketPotential,
      artistControl,
      riskLevel
    )

    // Calculate confidence
    const confidence = this.calculateEvaluationConfidence(
      card,
      marketAnalysis,
      gameState.round.roundNumber
    )

    // Calculate estimated monetary value based on strategic value and market conditions
    const estimatedValue = this.calculateEstimatedMonetaryValue(card, strategicValue, marketAnalysis, gameState.round.roundNumber)

    return {
      card,
      baseValue,
      marketPotential,
      auctionComplexity,
      artistControl,
      riskLevel,
      strategicValue,
      estimatedValue,
      confidence,
    }
  }

  /**
   * Create market analysis from game state
   */
  private createMarketAnalysis(gameState: GameState): MarketAnalysis {
    // This would typically use the MarketSimulator
    // For now, create a basic analysis
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const artistCompetitiveness: Record<Artist, any> = {} as any

    artists.forEach(artist => {
      const cardsPlayed = (gameState.board.playedCards[artist] || []).length
      const rank = this.calculateArtistRank(gameState, artist)
      const cardsNeeded = Math.max(0, 3 - cardsPlayed) // Need 3 for top 3

      artistCompetitiveness[artist] = {
        artist,
        rank,
        cardsNeededForValue: cardsNeeded,
        marketControl: cardsPlayed / 5, // Normalize to 0-1
        competitionLevel: this.getCompetitionLevel(cardsPlayed),
        expectedFinalValue: this.calculateExpectedFinalValue(artist, rank, gameState.round.roundNumber),
      }
    })

    return {
      marketState: this.getMarketState(artistCompetitiveness),
      artistCompetitiveness,
      volatility: this.calculateMarketVolatility(gameState),
      remainingCards: this.calculateRemainingCards(gameState),
    }
  }

  /**
   * Calculate base value of card
   */
  private calculateBaseValue(card: Card, marketAnalysis: MarketAnalysis): number {
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]

    // Base value from artist competitiveness
    let baseValue = artistCompetitiveness.expectedFinalValue

    // Adjust for card scarcity
    const remainingCards = marketAnalysis.remainingCards[card.artist]
    if (remainingCards <= 2) {
      baseValue *= 1.2 // Scarce cards are more valuable
    } else if (remainingCards > 10) {
      baseValue *= 0.9 // Common cards are less valuable
    }

    return Math.max(0, baseValue)
  }

  /**
   * Calculate market potential
   */
  private calculateMarketPotential(card: Card, marketAnalysis: MarketAnalysis, gameState: GameState): number {
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]
    const roundNumber = gameState.round.roundNumber

    let potential = 0

    // Potential to increase artist value
    if (artistCompetitiveness.cardsNeededForValue > 0) {
      // This card helps achieve value tiles
      potential += 0.3 * (5 - artistCompetitiveness.rank) / 4
    }

    // Late game potential
    if (roundNumber >= 3) {
      if (artistCompetitiveness.rank <= 2) {
        potential += 0.4 // Top artists in late game
      } else if (artistCompetitiveness.rank >= 4) {
        potential -= 0.2 // Bottom artists have less potential
      }
    }

    // Market state potential
    if (marketAnalysis.marketState === 'emerging') {
      potential += 0.2 // Emerging markets have growth potential
    } else if (marketAnalysis.marketState === 'consolidated') {
      potential -= 0.1 // Consolidated markets have less potential
    }

    return Math.max(0, Math.min(1, potential))
  }

  /**
   * Calculate auction complexity
   */
  private calculateAuctionComplexity(auctionType: string, marketAnalysis: MarketAnalysis): number {
    // Base complexity by auction type
    const baseComplexities: Record<string, number> = {
      open: 0.6,
      one_offer: 0.7,
      hidden: 0.8,
      fixed_price: 0.3,
      double: 0.9,
    }

    let complexity = baseComplexities[auctionType] || 0.5

    // Adjust for market volatility
    complexity *= (1 + marketAnalysis.volatility * 0.3)

    return Math.min(1, complexity)
  }

  /**
   * Calculate artist control potential
   */
  private calculateArtistControl(card: Card, gameState: GameState, playerIndex: number): number {
    const player = gameState.players[playerIndex]
    const artist = card.artist

    // Current control
    const ownedCards = (player.purchases || []).filter(p => p.artist === artist).length
    const handCards = player.hand.filter(c => c.artist === artist).length
    const currentControl = (ownedCards + handCards) / 5

    // Potential control increase from this card
    const controlIncrease = 1 / 5

    // Strategic importance of this artist
    const cardsPlayed = gameState.board.playedCards[artist]?.length || 0
    let strategicImportance = 0.5

    if (cardsPlayed === 0) {
      strategicImportance = 0.3 // First cards are less strategic
    } else if (cardsPlayed >= 3) {
      strategicImportance = 0.8 // Maintaining control is strategic
    } else if (cardsPlayed >= 1) {
      strategicImportance = 0.6 // Building control is strategic
    }

    return Math.min(1, (currentControl + controlIncrease) * strategicImportance)
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(card: Card, marketAnalysis: MarketAnalysis, playerMoney: number): number {
    let risk = 0.3 // Base risk

    // Artist ranking risk
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]
    if (artistCompetitiveness.rank > 3) {
      risk += 0.3 // Lower-ranked artists are riskier
    }

    // Market volatility risk
    risk += marketAnalysis.volatility * 0.3

    // Money pressure risk
    if (playerMoney < 30) {
      risk += 0.2 // Low money increases risk
    }

    // Card availability risk
    const remainingCards = marketAnalysis.remainingCards[card.artist]
    if (remainingCards === 0) {
      risk += 0.4 // No more cards available is risky
    } else if (remainingCards < 3) {
      risk -= 0.1 // Few cards remaining reduces risk
    }

    return Math.max(0, Math.min(1, risk))
  }

  /**
   * Calculate strategic value
   */
  private calculateStrategicValue(
    baseValue: number,
    marketPotential: number,
    artistControl: number,
    riskLevel: number
  ): number {
    // Weighted combination of factors
    const weights = {
      baseValue: 0.4,
      marketPotential: 0.25,
      artistControl: 0.25,
      riskReduction: 0.1,
    }

    // Normalize base value to 0-1 scale
    const normalizedBaseValue = Math.min(1, baseValue / 100)

    // Risk reduction (lower risk = higher value)
    const riskReduction = 1 - riskLevel

    const strategicValue =
      (normalizedBaseValue * weights.baseValue) +
      (marketPotential * weights.marketPotential) +
      (artistControl * weights.artistControl) +
      (riskReduction * weights.riskReduction)

    return Math.max(0, Math.min(1, strategicValue))
  }

  /**
   * Calculate evaluation confidence
   */
  private calculateEvaluationConfidence(
    card: Card,
    marketAnalysis: MarketAnalysis,
    roundNumber: number
  ): number {
    let confidence = 0.7 // Base confidence

    // Higher confidence in later rounds
    confidence += (roundNumber - 1) * 0.05

    // Lower confidence in volatile markets
    confidence -= marketAnalysis.volatility * 0.2

    // Higher confidence for simpler auctions
    const complexityAdjustments: Record<string, number> = {
      fixed_price: 0.1,
      open: 0.0,
      one_offer: -0.05,
      hidden: -0.1,
      double: -0.15,
    }

    confidence += complexityAdjustments[card.auctionType] || 0

    return Math.max(0.2, Math.min(1.0, confidence))
  }

  /**
   * Helper methods for market analysis
   */
  private calculateArtistRank(gameState: GameState, artist: Artist): number {
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const artistCounts = artists.map(a => ({
      artist: a,
      count: (gameState.board.playedCards[a] || []).length,
    }))

    artistCounts.sort((a, b) => b.count - a.count)

    const rank = artistCounts.findIndex(a => a.artist === artist) + 1
    return rank
  }

  private getCompetitionLevel(cardsPlayed: number): 'low' | 'medium' | 'high' {
    if (cardsPlayed === 0) return 'low'
    if (cardsPlayed >= 3) return 'high'
    return 'medium'
  }

  private calculateExpectedFinalValue(artist: Artist, rank: number, roundNumber: number): number {
    // Simplified calculation
    const baseValues = [30, 20, 10, 0, 0] // Values for ranks 1-5
    const baseValue = baseValues[rank - 1] || 0

    // Cumulative value based on round
    const roundMultipliers = [1, 2, 3, 4]
    const multiplier = roundMultipliers[roundNumber - 1] || 1

    return baseValue * multiplier
  }

  private getMarketState(artistCompetitiveness: Record<Artist, any>): 'emerging' | 'competitive' | 'consolidated' | 'saturated' {
    const ranks = Object.values(artistCompetitiveness).map((a: any) => a.rank)
    const avgRank = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length

    if (avgRank > 3.5) return 'emerging'
    if (avgRank > 2.5) return 'competitive'
    if (avgRank > 1.5) return 'consolidated'
    return 'saturated'
  }

  private calculateMarketVolatility(gameState: GameState): number {
    const totalCardsPlayed = Object.values(gameState.round.cardsPlayedPerArtist)
      .reduce((sum, count) => sum + count, 0)

    // Early game is more volatile
    const earlyGameFactor = (70 - totalCardsPlayed) / 70

    // Adjust for round
    const roundFactor = (4 - gameState.round.roundNumber) / 4

    return Math.min(1, earlyGameFactor * roundFactor)
  }

  private calculateRemainingCards(gameState: GameState): Record<Artist, number> {
    const totalCards: Record<Artist, number> = {
      'Manuel Carvalho': 12,
      'Sigrid Thaler': 13,
      'Daniel Melim': 15,
      'Ramon Martins': 15,
      'Rafael Silveira': 15,
    }

    const remaining: Record<Artist, number> = {} as any

    Object.keys(totalCards).forEach(artist => {
      const played = (gameState.board.playedCards[artist as Artist] || []).length
      remaining[artist as Artist] = totalCards[artist as Artist] - played
    })

    return remaining
  }

  /**
   * Calculate estimated monetary value for buy/pass decisions
   */
  private calculateEstimatedMonetaryValue(
    card: Card,
    strategicValue: number,
    marketAnalysis: any,
    roundNumber: number
  ): number {
    // Base value by auction type (in thousands)
    const auctionTypeValues = {
      'open': 25,
      'one_offer': 30,
      'hidden': 20,
      'fixed_price': 22,
      'double': 35
    }

    let baseValue = auctionTypeValues[card.auctionType] || 25
    const originalBaseValue = baseValue

    // Adjust by strategic value (0-1 scale)
    baseValue = baseValue * (0.5 + strategicValue * 0.5)

    // Market analysis adjustments
    const artistData = marketAnalysis.artistCompetitiveness[card.artist]
    if (artistData) {
      // Higher rank = higher value
      const rankBonus = (6 - artistData.rank) * 3  // Rank 1 = +15, Rank 5 = +3
      baseValue += rankBonus

      // Expected final value influence
      baseValue += artistData.expectedFinalValue * 0.3
    }

    // Round progression (values increase over time)
    const roundMultipliers = [1.0, 1.2, 1.4, 1.6]
    const roundMultiplier = roundMultipliers[roundNumber - 1] || 1.0
    baseValue *= roundMultiplier

    // Add some randomness for natural variation
    baseValue *= (0.9 + Math.random() * 0.2)  // ±10% variation

    const finalValue = Math.max(5, Math.floor(baseValue))  // Minimum 5k

    // DEBUG: Log calculation details
    console.log(`Card Value Calculation Debug:`, {
      card: `${card.artist} (${card.auctionType})`,
      originalBaseValue,
      strategicValue,
      afterStrategicAdjustment: baseValue / (0.9 + Math.random() * 0.2) / roundMultiplier,
      artistData: artistData ? {
        rank: artistData.rank,
        expectedFinalValue: artistData.expectedFinalValue
      } : 'none',
      roundNumber,
      roundMultiplier,
      finalValue
    })

    return finalValue
  }
}