// ===================
// AI MARKET UTILITIES
// ===================

import type { Artist } from '../../../types/game'
import type { GameState } from '../../../types/game'

export function createMarketUtils() {
  /**
   * Calculate artist competitiveness based on market state
   */
  function calculateCompetitiveness(market: Record<Artist, any>): Record<Artist, {
    rank: number
    expectedFinalValue: number
    competitionLevel: 'low' | 'medium' | 'high'
    artist: Artist
  }> {
    const artists = Object.entries(market) as [Artist, any][]
    const sorted = artists.sort((a, b) => b[1].totalSales - a[1].totalSales)

    return artists.reduce((acc, [artist, stats], index) => {
      acc[artist] = {
        artist,
        rank: index + 1,
        expectedFinalValue: stats.averagePrice || 30,
        competitionLevel: stats.cardsSold >= 3 ? 'high' : stats.cardsSold >= 2 ? 'medium' : 'low',
      }
      return acc
    }, {} as Record<Artist, { rank: number; expectedFinalValue: number; competitionLevel: 'low' | 'medium' | 'high'; artist: Artist }>)
  }

  /**
   * Determine overall market state
   */
  function determineMarketState(market: Record<Artist, any>): 'emerging' | 'competitive' | 'consolidated' {
    const totalCards = Object.values(market).reduce((sum, stats) => sum + stats.cardsSold, 0)
    const totalSales = Object.values(market).reduce((sum, stats) => sum + stats.totalSales, 0)

    if (totalCards <= 2) return 'emerging'
    if (totalCards >= 8) return 'consolidated'
    return 'competitive'
  }

  /**
   * Predict artist final value
   */
  function predictArtistValue(
    artistStats: any,
    remainingCards: number,
    roundsLeft: number
  ): {
    expectedFinalValue: number
    confidence: number
  } {
    const baseValue = artistStats.averagePrice || 30
    const growthPotential = remainingCards * 0.1
    const expectedValue = baseValue + growthPotential
    const confidence = Math.max(0.3, Math.min(0.9, 1 - (remainingCards * 0.1)))

    return {
      expectedFinalValue: expectedValue,
      confidence,
    }
  }

  /**
   * Find market opportunities
   */
  function findOpportunities(
    market: Record<Artist, any>,
    availableArtists: Artist[]
  ): {
    undervalued: Artist[]
    overvalued: Artist[]
  } {
    const avgPrice = Object.values(market).reduce((sum, stats) => sum + (stats.averagePrice || 0), 0) / Object.keys(market).length

    const opportunities = {
      undervalued: [] as Artist[],
      overvalued: [] as Artist[],
    }

    availableArtists.forEach(artist => {
      const stats = market[artist]
      const price = stats.averagePrice || 0

      if (price < avgPrice * 0.8) {
        opportunities.undervalued.push(artist)
      } else if (price > avgPrice * 1.2) {
        opportunities.overvalued.push(artist)
      }
    })

    return opportunities
  }

  return {
    calculateCompetitiveness,
    determineMarketState,
    predictArtistValue,
    findOpportunities,
  }
}