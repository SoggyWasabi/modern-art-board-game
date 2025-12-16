// ===================
// MEDIUM AI MARKET ANALYSIS
// ===================

import type { Artist, GameState } from '../../../types/game'
import type { MarketAnalysis, ArtistCompetitiveness, OpponentModel } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Market analysis utilities for Medium AI
 * Provides deeper market understanding than basic valuation
 */
export class MediumAIMarketAnalysis {
  private probability = createProbabilityUtils()

  /**
   * Analyze current market conditions
   */
  analyzeMarket(gameState: GameState, playerIndex: number): MarketAnalysis {
    const artistCompetitiveness = this.analyzeArtistCompetitiveness(gameState)
    const marketState = this.determineMarketState(artistCompetitiveness)
    const volatility = this.calculateMarketVolatility(gameState)
    const remainingCards = this.calculateRemainingCards(gameState)

    return {
      marketState,
      artistCompetitiveness,
      volatility,
      remainingCards,
    }
  }

  /**
   * Detailed analysis of each artist's competitiveness
   */
  private analyzeArtistCompetitiveness(gameState: GameState): Record<Artist, ArtistCompetitiveness> {
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const competitiveness: Record<Artist, ArtistCompetitiveness> = {} as any

    artists.forEach(artist => {
      const analysis = this.analyzeSingleArtist(gameState, artist)
      competitiveness[artist] = analysis
    })

    return competitiveness
  }

  /**
   * Analyze a single artist's market position
   */
  private analyzeSingleArtist(gameState: GameState, artist: Artist): ArtistCompetitiveness {
    const totalCardsInGame = this.getTotalCardsForArtist(artist)
    const playedCards = (gameState.board.playedCards[artist] || []).length
    const remainingCards = totalCardsInGame - playedCards

    // Calculate current rank
    const rank = this.calculateArtistRank(gameState, artist)

    // Calculate cards needed for value tiles
    const cardsNeededForValue = this.calculateCardsNeededForValue(gameState, artist)

    // Calculate market control (0-1)
    const marketControl = this.calculateMarketControl(playedCards, remainingCards)

    // Determine competition level
    const competitionLevel = this.determineCompetitionLevel(playedCards, remainingCards, rank)

    // Calculate expected final value
    const expectedFinalValue = this.calculateExpectedFinalValue(
      artist,
      rank,
      gameState.round.roundNumber,
      remainingCards
    )

    return {
      artist,
      rank,
      cardsNeededForValue,
      marketControl,
      competitionLevel,
      expectedFinalValue,
    }
  }

  /**
   * Calculate rank of artist based on cards played
   */
  private calculateArtistRank(gameState: GameState, targetArtist: Artist): number {
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const artistCounts = artists.map(artist => ({
      artist,
      count: (gameState.board.playedCards[artist] || []).length,
    }))

    artistCounts.sort((a, b) => b.count - a.count)

    return artistCounts.findIndex(a => a.artist === targetArtist) + 1
  }

  /**
   * Calculate how many cards needed to secure value
   */
  private calculateCardsNeededForValue(gameState: GameState, artist: Artist): number {
    const currentCount = (gameState.board.playedCards[artist] || []).length

    if (currentCount >= 3) {
      return 0 // Already in top 3
    }

    // Get third place count
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const counts = artists.map(a => (gameState.board.playedCards[a] || []).length)
    counts.sort((a, b) => b - a)

    const thirdPlace = counts[2] || 0

    return Math.max(0, thirdPlace - currentCount + 1)
  }

  /**
   * Calculate market control percentage
   */
  private calculateMarketControl(playedCards: number, remainingCards: number): number {
    const totalCards = playedCards + remainingCards
    if (totalCards === 0) return 0

    // Control increases with more cards played
    return Math.min(1, playedCards / Math.max(5, totalCards * 0.3))
  }

  /**
   * Determine competition level
   */
  private determineCompetitionLevel(
    playedCards: number,
    remainingCards: number,
    rank: number
  ): 'low' | 'medium' | 'high' {
    // High competition if many cards played but not in top position
    if (playedCards >= 2 && rank > 2) {
      return 'high'
    }

    // Medium competition if moderate activity
    if (playedCards >= 1 && remainingCards <= 10) {
      return 'medium'
    }

    // Low competition otherwise
    return 'low'
  }

  /**
   * Calculate expected final value with probability
   */
  private calculateExpectedFinalValue(
    artist: Artist,
    rank: number,
    currentRound: number,
    remainingCards: number
  ): number {
    // Base value from rank
    const rankValues = [40, 25, 10, 0, 0] // Average value across all rounds
    const baseValue = rankValues[rank - 1] || 0

    // Probability of maintaining or improving rank
    let maintainProbability = 0.5

    if (remainingCards === 0) {
      maintainProbability = rank <= 3 ? 1.0 : 0.0
    } else if (remainingCards < 3) {
      maintainProbability = rank <= 2 ? 0.8 : 0.3
    } else if (remainingCards < 8) {
      maintainProbability = rank <= 2 ? 0.6 : 0.2
    }

    // Round multiplier (values increase over time)
    const roundMultiplier = 1 + (currentRound - 1) * 0.5

    return Math.round(baseValue * maintainProbability * roundMultiplier)
  }

  /**
   * Determine overall market state
   */
  private determineMarketState(
    artistCompetitiveness: Record<Artist, ArtistCompetitiveness>
  ): 'emerging' | 'competitive' | 'consolidated' | 'saturated' {
    const values = Object.values(artistCompetitiveness)

    // Count dominant artists
    const dominantCount = values.filter(a => a.rank <= 2 && a.marketControl > 0.4).length
    const competitiveCount = values.filter(a => a.rank <= 3).length

    if (dominantCount === 0 && competitiveCount >= 4) {
      return 'emerging'
    } else if (dominantCount >= 2 && competitiveCount >= 3) {
      return 'competitive'
    } else if (dominantCount >= 2 && competitiveCount <= 3) {
      return 'consolidated'
    } else {
      return 'saturated'
    }
  }

  /**
   * Calculate market volatility
   */
  private calculateMarketVolatility(gameState: GameState): number {
    const totalCardsPlayed = Object.values(gameState.round.cardsPlayedPerArtist)
      .reduce((sum, count) => sum + count, 0)

    const totalCards = 70
    const cardsRemaining = totalCards - totalCardsPlayed

    // Early game volatility
    const earlyGameVolatility = cardsRemaining / totalCards

    // Round-based volatility
    const roundVolatility = (4 - gameState.round.roundNumber) / 4

    // Artist concentration volatility
    const distribution = Object.values(gameState.round.cardsPlayedPerArtist)
    const maxPlayed = Math.max(...distribution, 0)
    const concentrationVolatility = maxPlayed > 0 ? 1 - (maxPlayed / totalCardsPlayed) : 0.5

    // Combine factors
    const volatility = (earlyGameVolatility * 0.4) +
                     (roundVolatility * 0.3) +
                     (concentrationVolatility * 0.3)

    return Math.max(0, Math.min(1, volatility))
  }

  /**
   * Calculate remaining cards per artist
   */
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
   * Get total cards for artist in game
   */
  private getTotalCardsForArtist(artist: Artist): number {
    const cardCounts: Record<Artist, number> = {
      'Manuel Carvalho': 12,
      'Sigrid Thaler': 13,
      'Daniel Melim': 15,
      'Ramon Martins': 15,
      'Rafael Silveira': 15,
    }

    return cardCounts[artist]
  }

  /**
   * Predict future market conditions
   */
  predictFutureMarket(
    currentMarket: MarketAnalysis,
    gameState: GameState,
    turnsAhead: number = 2
  ): MarketAnalysis {
    // Simulate potential market changes
    const simulatedMarket = { ...currentMarket }

    // Estimate cards that will be played
    const avgCardsPerTurn = 1.5
    const estimatedCardsPlayed = avgCardsPerTurn * turnsAhead

    // Adjust competitiveness based on predictions
    Object.keys(simulatedMarket.artistCompetitiveness).forEach(artist => {
      const artistKey = artist as Artist
      const current = simulatedMarket.artistCompetitiveness[artistKey]

      // Simulate how competitiveness might change
      const rankChange = this.predictRankChange(current, estimatedCardsPlayed)
      current.rank = Math.max(1, Math.min(5, current.rank + rankChange))

      // Update other derived values
      current.expectedFinalValue = this.calculateExpectedFinalValue(
        artistKey,
        current.rank,
        gameState.round.roundNumber + 1,
        simulatedMarket.remainingCards[artistKey]
      )
    })

    // Adjust volatility (usually decreases as game progresses)
    simulatedMarket.volatility *= 0.9

    return simulatedMarket
  }

  /**
   * Predict how an artist's rank might change
   */
  private predictRankChange(
    current: ArtistCompetitiveness,
    estimatedCardsPlayed: number
  ): number {
    // Simple heuristic based on current position and cards needed
    if (current.cardsNeededForValue > 0) {
      // Needs cards to improve position
      return -1 // Might improve rank
    } else if (current.rank === 1) {
      // Already dominant
      return 0 // Stable
    } else {
      // Might lose position
      return 1
    }
  }

  /**
   * Identify market opportunities
   */
  identifyOpportunities(
    marketAnalysis: MarketAnalysis,
    playerMoney: number
  ): Array<{
    type: 'undervalued_artist' | 'market_control' | 'late_game_push'
    artist: Artist
    value: number
    risk: number
    description: string
  }> {
    const opportunities: Array<{
      type: 'undervalued_artist' | 'market_control' | 'late_game_push'
      artist: Artist
      value: number
      risk: number
      description: string
    }> = []

    Object.values(marketAnalysis.artistCompetitiveness).forEach(artist => {
      // Undervalued artists
      if (artist.rank >= 3 && artist.expectedFinalValue > 20) {
        opportunities.push({
          type: 'undervalued_artist',
          artist: artist.artist,
          value: artist.expectedFinalValue * 0.7,
          risk: 0.6,
          description: `Artist ${artist.artist} is undervalued with good potential`,
        })
      }

      // Market control opportunities
      if (artist.cardsNeededForValue <= 2 && artist.marketControl < 0.5) {
        opportunities.push({
          type: 'market_control',
          artist: artist.artist,
          value: 30,
          risk: 0.4,
          description: `Can gain control of ${artist.artist} with few cards`,
        })
      }

      // Late game push opportunities
      if (artist.rank <= 2 && artist.competitionLevel === 'high') {
        opportunities.push({
          type: 'late_game_push',
          artist: artist.artist,
          value: artist.expectedFinalValue,
          risk: 0.5,
          description: `Strong position in competitive ${artist.artist} market`,
        })
      }
    })

    // Sort by value-risk ratio
    opportunities.sort((a, b) => (b.value / b.risk) - (a.value / a.risk))

    return opportunities.slice(0, 3) // Return top 3 opportunities
  }
}