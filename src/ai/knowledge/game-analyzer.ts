// ===================
// GAME STATE ANALYZER
// ===================

import type { Artist, Card, GameState, Player, GameBoard } from '../../types/game'
import type { AuctionState } from '../../types/auction'
import type {
  VisibleGameState,
  PlayerInfo,
  MarketAnalysis,
  CardEvaluation,
  OpponentModel,
  AIMemory,
  AIDecisionContext
} from '../types'

/**
 * Game state analyzer that filters information based on AI difficulty
 * Ensures AI only has access to information a human player would have
 */
export class GameStateAnalyzer {
  private readonly playerIndex: number
  private readonly difficulty: 'easy' | 'medium' | 'hard'
  private memory: AIMemory

  constructor(playerIndex: number, difficulty: 'easy' | 'medium' | 'hard') {
    this.playerIndex = playerIndex
    this.difficulty = difficulty
    this.memory = this.initializeMemory()
  }

  /**
   * Extract visible game state based on AI's perspective
   */
  extractVisibleGameState(gameState: GameState): VisibleGameState {
    return {
      roundNumber: gameState.round.roundNumber,
      players: this.extractPlayerInfo(gameState.players),
      board: gameState.board,
      visibleCards: this.getVisibleCards(gameState),
      deckSize: gameState.deck.length,
      phase: this.getPhaseDescription(gameState.round.phase),
      auctioneerIndex: this.getCurrentAuctioneerIndex(gameState),
      bidHistory: this.extractBidHistory(gameState),
      roundPurchases: this.extractRoundPurchases(gameState),
    }
  }

  /**
   * Extract player information based on what AI should know
   */
  private extractPlayerInfo(players: Player[]): PlayerInfo[] {
    return players.map((player, index) => {
      const isSelf = index === this.playerIndex

      // Base information always visible
      const info: PlayerInfo = {
        id: player.id,
        name: player.name,
        isSelf,
        isAI: player.isAI,
        aiDifficulty: player.aiDifficulty,
        money: isSelf ? player.money : this.getMoneyEstimate(player),
        moneyType: isSelf ? 'exact' : 'estimated',
        purchases: [...(player.purchases || []), ...(player.purchasedThisRound || [])],
      }

      // Easy AI gets less information
      if (this.difficulty === 'easy') {
        // Easy AI only knows own hand size, not exact cards
        if (isSelf) {
          info.handSize = player.hand.length
        }
      }
      // Medium/Hard AI gets more information
      else {
        if (isSelf) {
          info.hand = [...player.hand]
          info.handSize = player.hand.length
        }
      }

      // Hard AI gets better money estimates
      if (this.difficulty === 'hard' && !isSelf) {
        info.money = this.getAdvancedMoneyEstimate(player, index)
      }

      return info
    })
  }

  /**
   * Get cards currently visible on the table
   */
  private getVisibleCards(gameState: GameState): Card[] {
    const visibleCards: Card[] = []

    // Add cards played on the board
    Object.values(gameState.board.playedCards).flat().forEach(card => {
      visibleCards.push(card)
    })

    // Add cards in current auction if applicable
    if (gameState.round.phase.type === 'auction') {
      const auction = gameState.round.phase.auction
      if (auction && 'card' in auction) {
        visibleCards.push(auction.card)
      }
      // Double auction might have two cards
      if (auction && 'primaryCard' in auction) {
        visibleCards.push(auction.primaryCard)
        if ('secondaryCard' in auction) {
          visibleCards.push(auction.secondaryCard)
        }
      }
    }

    return visibleCards
  }

  /**
   * Get current auctioneer index
   */
  private getCurrentAuctioneerIndex(gameState: GameState): number | undefined {
    return gameState.round.currentAuctioneerIndex
  }

  /**
   * Extract bid history from event log
   */
  private extractBidHistory(gameState: GameState) {
    // Extract recent bid events from event log
    return gameState.eventLog
      .filter(event => event.type === 'bid_placed')
      .map(event => ({
        playerIndex: event.playerIndex,
        amount: event.amount,
        timestamp: Date.now(), // In real implementation, use event timestamp
        bidType: 'open', // Would need to be extracted from context
        isWinning: false, // Would need more context
      }))
  }

  /**
   * Extract round purchases
   */
  private extractRoundPurchases(gameState: GameState): Record<number, Card[]> {
    const purchases: Record<number, Card[]> = {}

    gameState.players.forEach((player, index) => {
      purchases[index] = [...player.purchasedThisRound]
    })

    return purchases
  }

  /**
   * Get phase description for AI understanding
   */
  private getPhaseDescription(phase: any): string {
    switch (phase.type) {
      case 'awaiting_card_play':
        return `Player ${phase.activePlayerIndex} choosing card`
      case 'auction':
        return `Active auction: ${phase.auction.type}`
      case 'round_ending':
        return 'Round ending'
      case 'selling_to_bank':
        return 'Selling paintings to bank'
      case 'round_complete':
        return 'Round complete'
      default:
        return 'Unknown phase'
    }
  }

  /**
   * Get basic money estimate for other players (Easy/Medium AI)
   */
  private getMoneyEstimate(player: Player): number {
    // Simple estimate based on visible spending
    const startingMoney = 100
    const visibleSpending = (player.purchases || []).reduce((total, painting) => {
      return total + painting.purchasePrice
    }, 0)

    // Add some randomization for uncertainty
    const uncertainty = this.difficulty === 'easy' ? 30 : 15
    const randomAdjustment = Math.random() * uncertainty - uncertainty / 2

    return Math.max(0, startingMoney - visibleSpending + randomAdjustment)
  }

  /**
   * Get advanced money estimate for Hard AI
   */
  private getAdvancedMoneyEstimate(player: Player, playerIndex: number): number {
    const startingMoney = 100
    const visibleSpending = (player.purchases || []).reduce((total, painting) => {
      return total + painting.purchasePrice
    }, 0)

    // Hard AI considers more factors
    // Track money changes from event log
    const moneyHistory = this.memory.moneyChanges.filter(
      change => change.playerIndex === playerIndex
    )

    // Calculate more precise estimate based on patterns
    let estimate = startingMoney - visibleSpending

    // Adjust based on player behavior patterns
    const avgSpendingRate = moneyHistory.length > 0
      ? moneyHistory.reduce((sum, change) => sum + change.amount, 0) / moneyHistory.length
      : 0

    // Consider current game phase
    const phaseMultiplier = 1.0 // Would adjust based on round

    return Math.max(0, Math.round(estimate * phaseMultiplier))
  }

  /**
   * Initialize AI memory
   */
  private initializeMemory(): AIMemory {
    return {
      seenCards: new Set(),
      cardsPlayedByArtist: {} as Record<Artist, number>,
      moneyChanges: [],
      artistRankingHistory: [],
      notableEvents: [],
    }
  }

  /**
   * Update AI memory with new game state
   */
  updateMemory(gameState: GameState): void {
    // Update seen cards
    this.getVisibleCards(gameState).forEach(card => {
      this.memory.seenCards.add(card.id)
    })

    // Update artist play counts
    const artists: Artist[] = ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira']
    artists.forEach(artist => {
      const playedCards = gameState.board.playedCards[artist] || []
      this.memory.cardsPlayedByArtist[artist] = playedCards.length
    })

    // Update money changes (would extract from event log)
    // Update artist rankings (would extract from board state)
  }

  /**
   * Get current AI memory
   */
  getMemory(): AIMemory {
    return { ...this.memory }
  }

  /**
   * Reset memory for new game
   */
  resetMemory(): void {
    this.memory = this.initializeMemory()
  }
}