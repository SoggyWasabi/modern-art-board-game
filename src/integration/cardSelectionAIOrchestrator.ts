import type { GameState, Player, Card } from '../types/game'
import { MediumAICardValuation } from '../ai/strategies/medium/valuation'
import { MediumAIMarketAnalysis } from '../ai/strategies/medium/market-analysis'

/**
 * Orchestrates AI card selection when it's an AI player's turn to play a card
 * This handles the "awaiting_card_play" phase where players choose which card to auction
 */
export class CardSelectionAIOrchestrator {
  private valuation: MediumAICardValuation
  private marketAnalysis: MediumAIMarketAnalysis

  constructor() {
    this.valuation = new MediumAICardValuation()
    this.marketAnalysis = new MediumAIMarketAnalysis()
  }

  /**
   * Process AI card selection for an AI player
   * Returns the selected card, or null if the player has no cards
   */
  async processAICardSelection(player: Player, gameState: GameState): Promise<Card | null> {
    if (!player.isAI) {
      console.log(`Player ${player.name} is not an AI player`)
      return null
    }

    if (!player.hand || player.hand.length === 0) {
      console.log(`Player ${player.name} has no cards to play`)
      return null
    }

    console.log(`Processing card selection for AI player: ${player.name}`)

    // Simulate thinking time (1-2 seconds)
    const thinkingTime = 1000 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, thinkingTime))

    try {
      // Get player index
      const playerIndex = gameState.players.findIndex(p => p.id === player.id)

      // Evaluate all cards in hand
      const evaluatedCards = player.hand.map(card => {
        const evaluation = this.valuation.evaluateCard(card, gameState, playerIndex)
        return { card, evaluation }
      })

      // Filter out cards that would end the round badly
      const safeCards = evaluatedCards.filter(({ card, evaluation }) => {
        const currentCount = gameState.round.cardsPlayedPerArtist[card.artist] || 0
        // Don't play 5th card unless it's very valuable
        if (currentCount >= 4) {
          return evaluation.strategicValue > 0.8
        }
        // Avoid cards with very high risk in late game
        if (gameState.round.roundNumber >= 3 && evaluation.riskLevel > 0.8) {
          return false
        }
        return evaluation.strategicValue > 0.3
      })

      // Select card with highest strategic value
      const bestCard = safeCards.length > 0
        ? safeCards.sort((a, b) => b.evaluation.strategicValue - a.evaluation.strategicValue)[0]
        : evaluatedCards[0]

      if (bestCard) {
        console.log(`AI ${player.name} selected card:`, {
          artist: bestCard.card.artist,
          auctionType: bestCard.card.auctionType,
          strategicValue: bestCard.evaluation.strategicValue
        })
        return bestCard.card
      }

      // Fallback: return first card in hand
      console.log(`AI ${player.name} using fallback card selection`)
      return player.hand[0]

    } catch (error) {
      console.error(`Error selecting card for AI ${player.name}:`, error)
      // Fallback: return first card in hand
      return player.hand[0]
    }
  }

  /**
   * Check if a player is an AI player
   */
  isAIPlayer(player: Player): boolean {
    return player.isAI === true
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No resources to clean up for this simpler implementation
  }
}

// Singleton instance
let orchestratorInstance: CardSelectionAIOrchestrator | null = null

export function getCardSelectionAIOrchestrator(): CardSelectionAIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new CardSelectionAIOrchestrator()
  }
  return orchestratorInstance
}
