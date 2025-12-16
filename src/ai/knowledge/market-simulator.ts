// ===================
// MARKET SIMULATOR
// ===================

import type { Artist, Card, GameState } from '../../types/game'
import type { MarketAnalysis, ArtistCompetitiveness, CardEvaluation } from '../types'

/**
 * Market simulator that predicts artist values and market conditions
 * Used by Medium and Hard AI for strategic planning
 */
export class MarketSimulator {
  private readonly artists: Artist[] = [
    'Manuel Carvalho',
    'Sigrid Thaler',
    'Daniel Melim',
    'Ramon Martins',
    'Rafael Silveira',
  ]

  /**
   * Analyze current market state and competitiveness
   */
  analyzeMarket(gameState: GameState): MarketAnalysis {
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
   * Analyze competitiveness for each artist
   */
  private analyzeArtistCompetitiveness(gameState: GameState): Record<Artist, ArtistCompetitiveness> {
    const competitiveness: Record<Artist, ArtistCompetitiveness> = {} as any

    this.artists.forEach(artist => {
      const playedCards = gameState.board.playedCards[artist] || []
      const cardsPlayed = playedCards.length
      const totalCards = this.getTotalCardsForArtist(artist)
      const remainingCards = totalCards - cardsPlayed

      const analysis = this.calculateArtistCompetitiveness(
        artist,
        cardsPlayed,
        remainingCards,
        gameState
      )

      competitiveness[artist] = analysis
    })

    return competitiveness
  }

  /**
   * Get total number of cards for an artist in the game
   */
  private getTotalCardsForArtist(artist: Artist): number {
    // These values come from the game rules
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
   * Calculate detailed competitiveness analysis for an artist
   */
  private calculateArtistCompetitiveness(
    artist: Artist,
    cardsPlayed: number,
    remainingCards: number,
    gameState: GameState
  ): ArtistCompetitiveness {
    // Determine current rank based on cards played
    const allArtists = this.artists.map(a => ({
      artist: a,
      played: (gameState.board.playedCards[a] || []).length,
    }))

    allArtists.sort((a, b) => b.played - a.played)
    const rank = allArtists.findIndex(a => a.artist === artist) + 1

    // Calculate cards needed for value tiles
    let cardsNeededForValue = 0
    if (cardsPlayed >= 3) {
      cardsNeededForValue = 0 // Already in top 3
    } else {
      // Need to reach 3rd place minimum
      const thirdPlace = Math.max(0, allArtists[2]?.played || 0)
      cardsNeededForValue = Math.max(0, thirdPlace - cardsPlayed + 1)
    }

    // Calculate market control (0-1)
    const totalCardsInGame = 70 // Total cards in game
    const marketControl = cardsPlayed / Math.max(5, totalCardsInGame / this.artists.length)

    // Determine competition level
    let competitionLevel: 'low' | 'medium' | 'high'
    if (cardsPlayed === 0) {
      competitionLevel = 'low'
    } else if (remainingCards > 10) {
      competitionLevel = 'medium'
    } else {
      competitionLevel = 'high'
    }

    // Calculate expected final value
    const expectedFinalValue = this.calculateExpectedFinalValue(
      artist,
      cardsPlayed,
      remainingCards,
      gameState.round.roundNumber
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
   * Calculate expected final value for an artist
   */
  private calculateExpectedFinalValue(
    artist: Artist,
    cardsPlayed: number,
    remainingCards: number,
    currentRound: number
  ): number {
    // Base probability of being in top 3
    let top3Probability = 0

    if (cardsPlayed >= 5) {
      top3Probability = 1.0 // Guaranteed top 3 if 5 cards played
    } else if (cardsPlayed >= 3) {
      top3Probability = 0.8 // Strong chance if already competitive
    } else if (cardsPlayed >= 1) {
      top3Probability = 0.4 // Possible but needs more cards
    } else {
      top3Probability = 0.1 // Very unlikely
    }

    // Adjust based on remaining cards
    if (remainingCards === 0) {
      // No more cards available, current position is final
      top3Probability = cardsPlayed >= 3 ? 1.0 : 0.0
    }

    // Calculate potential value based on rounds remaining
    const roundsRemaining = 4 - currentRound
    const maxPotentialValue = 30 + (20 * roundsRemaining) // 30 + 20 per remaining round

    return Math.round(maxPotentialValue * top3Probability)
  }

  /**
   * Determine overall market state
   */
  private determineMarketState(
    artistCompetitiveness: Record<Artist, ArtistCompetitiveness>
  ): 'emerging' | 'competitive' | 'consolidated' | 'saturated' {
    const competitiveness = Object.values(artistCompetitiveness)

    // Count dominant artists (rank 1-2 with good control)
    const dominantCount = competitiveness.filter(
      c => c.rank <= 2 && c.marketControl > 0.3
    ).length

    // Count competitive artists (rank 1-4)
    const competitiveCount = competitiveness.filter(c => c.rank <= 4).length

    // Determine market state
    if (dominantCount === 0 && competitiveCount >= 4) {
      return 'emerging' // No clear leaders yet
    } else if (dominantCount >= 2 && competitiveCount >= 3) {
      return 'competitive' // Multiple strong contenders
    } else if (dominantCount >= 2 && competitiveCount <= 3) {
      return 'consolidated' // Market narrowing down
    } else {
      return 'saturated' // Market decided, few opportunities
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

    // Early game is more volatile
    const earlyGameFactor = cardsRemaining / totalCards

    // Check if any artist is close to 5 cards (round ending)
    const closeToEnd = Object.values(gameState.round.cardsPlayedPerArtist)
      .some(count => count >= 4)

    const roundStabilityFactor = closeToEnd ? 0.3 : 1.0

    return Math.min(1.0, earlyGameFactor * roundStabilityFactor)
  }

  /**
   * Calculate remaining cards per artist
   */
  private calculateRemainingCards(gameState: GameState): Record<Artist, number> {
    const remaining: Record<Artist, number> = {} as any

    this.artists.forEach(artist => {
      const total = this.getTotalCardsForArtist(artist)
      const played = (gameState.board.playedCards[artist] || []).length
      remaining[artist] = total - played
    })

    return remaining
  }

  /**
   * Evaluate strategic value of a card
   */
  evaluateCard(card: Card, gameState: GameState, playerIndex: number): CardEvaluation {
    const marketAnalysis = this.analyzeMarket(gameState)
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]

    // Base value from current market position
    const baseValue = artistCompetitiveness.expectedFinalValue

    // Market potential based on remaining cards
    const marketPotential = this.calculateMarketPotential(
      card.artist,
      marketAnalysis.remainingCards[card.artist],
      gameState.round.roundNumber
    )

    // Auction complexity based on type and market state
    const auctionComplexity = this.calculateAuctionComplexity(card.auctionType, marketAnalysis)

    // Artist control potential
    const artistControl = this.calculateArtistControlPotential(
      card.artist,
      gameState,
      playerIndex
    )

    // Risk assessment
    const riskLevel = this.calculateCardRisk(card, marketAnalysis)

    // Overall strategic value
    const strategicValue = this.calculateStrategicValue(
      baseValue,
      marketPotential,
      artistControl,
      riskLevel
    )

    // Confidence in evaluation
    const confidence = this.calculateEvaluationConfidence(
      marketAnalysis,
      card.auctionType,
      gameState.round.roundNumber
    )

    return {
      card,
      baseValue,
      marketPotential,
      auctionComplexity,
      artistControl,
      riskLevel,
      strategicValue,
      confidence,
    }
  }

  /**
   * Calculate market potential for an artist
   */
  private calculateMarketPotential(
    artist: Artist,
    remainingCards: number,
    currentRound: number
  ): number {
    if (remainingCards === 0) return 0

    // Potential increases with more cards available
    const availabilityFactor = remainingCards / 15 // Normalize to max cards

    // Early rounds have more potential
    const roundFactor = (4 - currentRound) / 4

    return Math.min(1.0, availabilityFactor * roundFactor)
  }

  /**
   * Calculate auction complexity (0-1, higher is more complex)
   */
  private calculateAuctionComplexity(
    auctionType: string,
    marketAnalysis: MarketAnalysis
  ): number {
    const baseComplexities: Record<string, number> = {
      open: 0.7,
      one_offer: 0.8,
      hidden: 0.9,
      fixed_price: 0.4,
      double: 0.95,
    }

    const base = baseComplexities[auctionType] || 0.5

    // Adjust based on market volatility
    return Math.min(1.0, base * (1 + marketAnalysis.volatility))
  }

  /**
   * Calculate artist control potential
   */
  private calculateArtistControlPotential(
    artist: Artist,
    gameState: GameState,
    playerIndex: number
  ): number {
    const player = gameState.players[playerIndex]
    const ownedCards = player.purchases?.filter(p => p.artist === artist).length || 0
    const handCards = player.hand.filter(c => c.artist === artist).length

    const totalControl = ownedCards + handCards
    const maxControl = 5 // Maximum meaningful control

    return Math.min(1.0, totalControl / maxControl)
  }

  /**
   * Calculate risk level for a card
   */
  private calculateCardRisk(
    card: Card,
    marketAnalysis: MarketAnalysis
  ): number {
    const artistCompetitiveness = marketAnalysis.artistCompetitiveness[card.artist]

    let risk = 0.5 // Base risk

    // Higher risk if artist not competitive
    if (artistCompetitiveness.rank > 3) {
      risk += 0.3
    }

    // Higher risk if low cards remaining
    if (marketAnalysis.remainingCards[card.artist] < 3) {
      risk += 0.2
    }

    // Higher risk in volatile markets
    risk += marketAnalysis.volatility * 0.2

    return Math.min(1.0, risk)
  }

  /**
   * Calculate overall strategic value
   */
  private calculateStrategicValue(
    baseValue: number,
    marketPotential: number,
    artistControl: number,
    riskLevel: number
  ): number {
    // Combine factors with weights
    const valueWeight = 0.4
    const potentialWeight = 0.3
    const controlWeight = 0.2
    const riskWeight = -0.1 // Risk reduces value

    const normalizedValue = baseValue / 120 // Normalize to 0-1
    const riskAdjusted = 1 - riskLevel

    return Math.max(0, Math.min(1,
      normalizedValue * valueWeight +
      marketPotential * potentialWeight +
      artistControl * controlWeight +
      riskAdjusted * riskWeight
    ))
  }

  /**
   * Calculate confidence in evaluation
   */
  private calculateEvaluationConfidence(
    marketAnalysis: MarketAnalysis,
    auctionType: string,
    roundNumber: number
  ): number {
    let confidence = 0.8 // Base confidence

    // More confidence in later rounds
    confidence += (roundNumber - 1) * 0.05

    // Less confidence in volatile markets
    confidence -= marketAnalysis.volatility * 0.2

    // More confidence in simpler auctions
    const complexityAdjustments: Record<string, number> = {
      fixed_price: 0.1,
      open: 0.0,
      one_offer: -0.1,
      hidden: -0.2,
      double: -0.2,
    }

    confidence += complexityAdjustments[auctionType] || 0

    return Math.max(0.2, Math.min(1.0, confidence))
  }
}