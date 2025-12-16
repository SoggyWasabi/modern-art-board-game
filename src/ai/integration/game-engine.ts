// ===================
// AI GAME ENGINE INTEGRATION
// ===================

import type {
  GameState,
  Player,
  Card,
  Artist,
  AuctionType,
  GamePhase,
  RoundPhase
} from '../../types/game'
import type {
  AIDecision,
  AIDecisionContext,
  AIDifficulty,
  AIDecisionType
} from '../types'
import { AIManager } from '../ai-manager'
import { ErrorHandler } from '../errors/error-handler'
import { PerformanceMonitor } from '../monitoring/performance-monitor'
import { AIStrategyFactory } from '../strategies'

/**
 * Convert game engine state to AI decision context
 */
export function gameStateToAIContext(
  gameState: GameState,
  playerIndex: number
): AIDecisionContext {
  const player = gameState.players[playerIndex]

  // Create AI market analysis from game state
  const marketAnalysis = {
    artistCompetitiveness: Object.entries(gameState.board.artistValues).reduce(
      (acc, [artist, values]) => {
        const totalValue = values.reduce((sum, val) => sum + val, 0)
        const cardsSold = gameState.board.playedCards[artist as Artist]?.length || 0

        acc[artist as Artist] = {
          rank: 1, // TODO: Calculate actual ranking
          expectedFinalValue: totalValue / 4, // Average across 4 rounds
          competitionLevel: cardsSold > 6 ? 'high' : cardsSold > 3 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        }

        return acc
      },
      {} as Record<Artist, { rank: number; expectedFinalValue: number; competitionLevel: 'high' | 'medium' | 'low' }>
    ),
    marketState: gameState.round.roundNumber <= 2 ? 'emerging' :
      gameState.round.roundNumber >= 4 ? 'consolidated' : 'competitive' as 'emerging' | 'competitive' | 'consolidated',
    remainingCards: Object.entries(gameState.board.artistValues).reduce(
      (acc, [artist]) => {
        // Count remaining cards by checking deck and hands
        const totalCardsPerArtist = 6 // Assuming 6 cards per artist in deck
        const playedCards = gameState.board.playedCards[artist as Artist]?.length || 0
        const handCards = gameState.players.reduce(
          (sum, p) => sum + p.hand.filter(c => c.artist === artist).length,
          0
        )

        acc[artist as Artist] = totalCardsPerArtist - playedCards - handCards

        return acc
      },
      {} as Record<Artist, number>
    ),
  }

  // Create opponent models
  const opponentModels = new Map()
  gameState.players.forEach((otherPlayer, index) => {
    if (index !== playerIndex && !otherPlayer.isAI) {
      opponentModels.set(index, {
        aggressiveness: 0.5, // Default assumptions for human players
        riskTolerance: 0.5,
        tendencies: {
          earlyBidding: false,
          bluffing: 0.1,
          overbidding: 0.2,
        },
      })
    }
  })

  return {
    gameState: convertGameStateForAI(gameState),
    playerIndex,
    marketAnalysis,
    opponentModels,
    timeSliceController: {
      shouldContinue: () => true,
      getTimeRemaining: () => 5000, // 5 second default
    },
  }
}

/**
 * Convert game engine state to AI-compatible format
 */
function convertGameStateForAI(gameState: GameState): any {
  // Convert the game state to match AI expected format
  return {
    phase: gameState.gamePhase === 'playing' ? 'auction' : gameState.gamePhase,
    round: {
      roundNumber: gameState.round.roundNumber,
      season: gameState.round.roundNumber <= 2 ? 'spring' :
        gameState.round.roundNumber <= 4 ? 'summer' : 'fall',
    },
    currentPlayer: gameState.round.phase.type === 'awaiting_card_play' ?
      gameState.round.phase.activePlayerIndex : -1,
    players: gameState.players.map(p => ({
      ...p,
      purchases: p.purchases || [],
    })),
    currentAuction: gameState.round.phase.type === 'auction' ?
      convertAuctionForAI(gameState.round.phase.auction, gameState.players) : null,
    market: createMarketFromBoard(gameState.board, gameState.players),
    season: gameState.round.roundNumber <= 2 ? 'spring' :
      gameState.round.roundNumber <= 4 ? 'summer' : 'fall',
  }
}

/**
 * Convert auction state for AI
 */
function convertAuctionForAI(auction: any, players: Player[]): any {
  // This would need to be implemented based on actual auction state structure
  return {
    type: auction.type,
    currentBid: auction.currentBid || 0,
    minIncrement: 5,
    bids: auction.bids || [],
  }
}

/**
 * Create market information from board state
 */
function createMarketFromBoard(board: any, players: Player[]): any {
  const market: any = {}

  Object.keys(board.artistValues).forEach(artist => {
    const paintings = players.reduce((acc, player) => {
      const playerPaintings = player.purchases?.filter(p => p.artist === artist) || []
      return acc + playerPaintings.length
    }, 0)

    market[artist] = {
      artist,
      cardsSold: paintings,
      currentSeasonSales: paintings, // Simplified
      totalSales: paintings * 30, // Average estimate
      highestPrice: 60, // Default
      averagePrice: 40, // Default
    }
  })

  return market
}

/**
 * Determine AI decision type from game phase
 */
export function getDecisionTypeFromPhase(gameState: GameState): AIDecisionType | null {
  const phase = gameState.round.phase

  if (phase.type === 'awaiting_card_play') {
    return 'card_play'
  }

  if (phase.type === 'auction') {
    // Determine auction type
    const auctionType = phase.auction.type
    switch (auctionType) {
      case 'open':
        return 'bid'
      case 'hidden':
        return 'hidden_bid'
      case 'fixed_price':
        return 'fixed_price'
      case 'one_offer':
        return 'bid' // Handle as regular bid
      case 'double':
        return 'bid' // Handle as regular bid
      default:
        return 'bid'
    }
  }

  return null
}

/**
 * Convert AI decision back to game engine action
 */
export function aiDecisionToGameAction(
  decision: AIDecision,
  gameState: GameState,
  playerIndex: number
): any {
  switch (decision.type) {
    case 'card_play':
      return {
        type: 'play_card',
        playerIndex,
        card: decision.card,
      }

    case 'bid':
      return {
        type: decision.action === 'bid' ? 'place_bid' : 'pass_bid',
        playerIndex,
        amount: decision.amount,
      }

    case 'hidden_bid':
      return {
        type: decision.action === 'bid' ? 'place_hidden_bid' : 'pass_hidden_bid',
        playerIndex,
        amount: decision.amount,
      }

    case 'fixed_price':
      return {
        type: decision.action === 'buy' ? 'accept_fixed_price' : 'decline_fixed_price',
        playerIndex,
        amount: decision.amount,
      }

    default:
      return {
        type: 'pass',
        playerIndex,
      }
  }
}