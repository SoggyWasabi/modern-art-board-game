// ===================
// AI INTEGRATION TESTS
// ===================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIManager } from '../ai-manager'
import { AIStrategyFactory } from '../strategies'
import { ErrorHandler } from '../errors/error-handler'
import { PerformanceMonitor } from '../monitoring/performance-monitor'

import type {
  GameState,
  Player,
  Card,
  Artist,
  AuctionType
} from '../../types/game'

// Integration test utilities
const createFullGameState = (roundNumber: number = 1): GameState => ({
  phase: 'auction',
  round: {
    roundNumber,
    season: roundNumber <= 2 ? 'spring' : roundNumber <= 4 ? 'summer' : 'fall',
  },
  currentPlayer: 0,
  players: [
    {
      id: 'ai-easy',
      name: 'Easy AI',
      hand: [
        { id: 'card-1', artist: 'Manuel Carvalho', auctionType: 'open' },
        { id: 'card-2', artist: 'Sigrid Thaler', auctionType: 'hidden' },
        { id: 'card-3', artist: 'Daniel Melim', auctionType: 'one_offer' },
      ],
      money: 120,
      purchases: [
        { artist: 'Ramon Martins', price: 45 },
      ],
      isAI: true,
    },
    {
      id: 'human-player',
      name: 'Human Player',
      hand: [
        { id: 'card-4', artist: 'Rafael Silveira', auctionType: 'double' },
      ],
      money: 90,
      purchases: [
        { artist: 'Manuel Carvalho', price: 55 },
      ],
      isAI: false,
    },
    {
      id: 'ai-medium',
      name: 'Medium AI',
      hand: [
        { id: 'card-5', artist: 'Manuel Carvalho', auctionType: 'fixed_price' },
        { id: 'card-6', artist: 'Sigrid Thaler', auctionType: 'open' },
      ],
      money: 85,
      purchases: [],
      isAI: true,
    },
    {
      id: 'ai-hard',
      name: 'Hard AI',
      hand: [
        { id: 'card-7', artist: 'Daniel Melim', auctionType: 'hidden' },
        { id: 'card-8', artist: 'Ramon Martins', auctionType: 'open' },
      ],
      money: 110,
      purchases: [
        { artist: 'Sigrid Thaler', price: 35 },
        { artist: 'Daniel Melim', price: 40 },
      ],
      isAI: true,
    },
  ],
  currentAuction: null,
  market: {
    'Manuel Carvalho': {
      artist: 'Manuel Carvalho',
      cardsSold: 3,
      currentSeasonSales: 2,
      totalSales: 165,
      highestPrice: 65,
      averagePrice: 55,
    },
    'Sigrid Thaler': {
      artist: 'Sigrid Thaler',
      cardsSold: 2,
      currentSeasonSales: 1,
      totalSales: 80,
      highestPrice: 45,
      averagePrice: 40,
    },
    'Daniel Melim': {
      artist: 'Daniel Melim',
      cardsSold: 1,
      currentSeasonSales: 1,
      totalSales: 40,
      highestPrice: 40,
      averagePrice: 40,
    },
    'Ramon Martins': {
      artist: 'Ramon Martins',
      cardsSold: 2,
      currentSeasonSales: 0,
      totalSales: 90,
      highestPrice: 50,
      averagePrice: 45,
    },
    'Rafael Silveira': {
      artist: 'Rafael Silveira',
      cardsSold: 0,
      currentSeasonSales: 0,
      totalSales: 0,
      highestPrice: 0,
      averagePrice: 0,
    },
  },
  season: roundNumber <= 2 ? 'spring' : roundNumber <= 4 ? 'summer' : 'fall',
})

describe('AI End-to-End Integration', () => {
  let aiManager: AIManager
  let errorHandler: ErrorHandler
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    aiManager = new AIManager()
    errorHandler = new ErrorHandler()
    performanceMonitor = new PerformanceMonitor()

    // Register AI players with different difficulties
    aiManager.registerAI(0, 'easy', 12345)
    aiManager.registerAI(2, 'medium', 67890)
    aiManager.registerAI(3, 'hard', 13579)
  })

  it('should play complete game round', async () => {
    const gameState = createFullGameState(1)

    // Track decisions
    const decisions: Array<{ player: number; type: string; decision: any }> = []

    // Simulate card play phase
    for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
      const player = gameState.players[playerIndex]

      if (!player.isAI) continue

      // Monitor performance
      const measurementId = `play-${playerIndex}`
      performanceMonitor.startMeasurement(measurementId, 'card_play',
        playerIndex === 0 ? 'easy' : playerIndex === 2 ? 'medium' : 'hard',
        playerIndex)

      try {
        const decision = await aiManager.makeDecision(playerIndex, 'card_play', gameState)
        decisions.push({ player: playerIndex, type: 'card_play', decision })

        performanceMonitor.endMeasurement(measurementId, true, {
          decisionQuality: decision.card ? 0.8 : 0.2,
          confidence: 0.7,
        })
      } catch (error) {
        const errorObj = errorHandler.handleError(
          errorHandler.constructor === Error ? error : error as any,
          { gameState, playerIndex, marketAnalysis: {}, opponentModels: new Map(), timeSliceController: { shouldContinue: () => true, getTimeRemaining: () => 5000 } }
        )

        performanceMonitor.endMeasurement(measurementId, false, {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: errorObj.fallbackUsed,
        })
      }
    }

    // Verify all AI players made decisions
    expect(decisions.length).toBe(3) // 3 AI players
    decisions.forEach(({ type, decision }) => {
      expect(type).toBe('card_play')
      expect(decision).toBeDefined()
      expect(decision.type).toBe('card_play')
    })

    // Check performance metrics
    const metrics = performanceMonitor.getMetrics()
    const summary = metrics.getSummary()
    expect(summary.totalMeasurements).toBe(3)
  })

  it('should handle auction scenarios', async () => {
    // Set up auction state
    const auctionState = createFullGameState(2)
    auctionState.currentAuction = {
      card: { id: 'auction-card', artist: 'Manuel Carvalho', auctionType: 'open' },
      seller: 0,
      currentBid: 20,
      bids: [
        { playerId: 2, amount: 20 },
      ],
    }

    // Simulate bidding round
    const bids: Array<{ player: number; decision: any }> = []

    for (let playerIndex = 1; playerIndex < auctionState.players.length; playerIndex++) {
      const player = auctionState.players[playerIndex]

      if (!player.isAI) continue

      try {
        const decision = await aiManager.makeDecision(playerIndex, 'bid', auctionState)
        bids.push({ player: playerIndex, decision })

        // Verify decision validity
        expect(decision.type).toBe('bid')
        expect(['bid', 'pass']).toContain(decision.action)

        if (decision.action === 'bid') {
          expect(decision.amount).toBeGreaterThan(auctionState.currentAuction!.currentBid)
          expect(decision.amount).toBeLessThanOrEqual(player.money)
        }
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined()
      }
    }

    expect(bids.length).toBeGreaterThan(0)
  })

  it('should adapt strategies based on game progression', async () => {
    // Test early game vs late game behavior
    const earlyGame = createFullGameState(1)
    const lateGame = createFullGameState(4)

    // Get decisions from hard AI in both scenarios
    const earlyDecision = await aiManager.makeDecision(3, 'card_play', earlyGame)
    const lateDecision = await aiManager.makeDecision(3, 'card_play', lateGame)

    expect(earlyDecision).toBeDefined()
    expect(lateDecision).toBeDefined()

    // Late game decisions should potentially be different
    // (This is a basic test - actual difference depends on strategy implementation)
    expect(earlyDecision.type).toBe('card_play')
    expect(lateDecision.type).toBe('card_play')
  })

  it('should maintain consistent behavior with seeded randomness', async () => {
    const gameState = createFullGameState(1)

    // Create two AI managers with same seed
    const aiManager1 = new AIManager()
    const aiManager2 = new AIManager()

    aiManager1.registerAI(0, 'easy', 99999)
    aiManager2.registerAI(0, 'easy', 99999)

    // Make same decision multiple times
    const decisions1 = []
    const decisions2 = []

    for (let i = 0; i < 5; i++) {
      const decision1 = await aiManager1.makeDecision(0, 'card_play', gameState)
      const decision2 = await aiManager2.makeDecision(0, 'card_play', gameState)

      decisions1.push(decision1)
      decisions2.push(decision2)
    }

    // With seeded randomness, decisions should be consistent
    // (Note: This assumes the AI implementation respects seeds)
    decisions1.forEach((decision, index) => {
      expect(decision.card?.id).toBe(decisions2[index].card?.id)
    })
  })

  it('should handle concurrent AI decisions', async () => {
    const gameState = createFullGameState(1)

    // Make decisions for all AI players concurrently
    const decisionPromises = []

    for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
      if (gameState.players[playerIndex].isAI) {
        decisionPromises.push(
          aiManager.makeDecision(playerIndex, 'card_play', gameState)
        )
      }
    }

    const decisions = await Promise.all(decisionPromises)

    expect(decisions.length).toBe(3)
    decisions.forEach(decision => {
      expect(decision).toBeDefined()
      expect(decision.type).toBe('card_play')
    })
  })

  it('should recover from errors gracefully', async () => {
    const gameState = createFullGameState(1)

    // Force an error by corrupting game state
    const corruptedState = {
      ...gameState,
      players: undefined, // This will cause an error
    }

    // Should not crash
    const decision = await aiManager.makeDecision(0, 'card_play', corruptedState as any)

    // Should return a fallback decision
    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
    expect(decision.action).toBe('pass') // Emergency fallback
  })

  it('should track and report performance metrics', async () => {
    const gameState = createFullGameState(1)

    // Make several decisions to generate metrics
    for (let i = 0; i < 5; i++) {
      await aiManager.makeDecision(0, 'card_play', gameState)
      await aiManager.makeDecision(2, 'bid', gameState)
      await aiManager.makeDecision(3, 'card_play', gameState)
    }

    // Check that performance was tracked
    const easyMetrics = performanceMonitor.getMetrics({ difficulty: 'easy' })
    const mediumMetrics = performanceMonitor.getMetrics({ difficulty: 'medium' })
    const hardMetrics = performanceMonitor.getMetrics({ difficulty: 'hard' })

    const easySummary = easyMetrics.getSummary()
    const mediumSummary = mediumMetrics.getSummary()
    const hardSummary = hardMetrics.getSummary()

    expect(easySummary.totalMeasurements).toBe(5)
    expect(mediumSummary.totalMeasurements).toBe(5)
    expect(hardSummary.totalMeasurements).toBe(5)

    // All should have reasonable performance
    [easySummary, mediumSummary, hardSummary].forEach(summary => {
      expect(summary.successRate).toBeGreaterThan(0)
      expect(summary.averageDuration).toBeLessThan(5000) // 5 seconds max
    })
  })
})

describe('AI Strategy Integration', () => {
  it('should create and use all strategy types', () => {
    const easyStrategy = AIStrategyFactory.create({ difficulty: 'easy' })
    const mediumStrategy = AIStrategyFactory.create({ difficulty: 'medium' })
    const hardStrategy = AIStrategyFactory.create({ difficulty: 'hard' })

    expect(easyStrategy.getDifficulty()).toBe('easy')
    expect(mediumStrategy.getDifficulty()).toBe('medium')
    expect(hardStrategy.getDifficulty()).toBe('hard')

    // All strategies should have required methods
    [easyStrategy, mediumStrategy, hardStrategy].forEach(strategy => {
      expect(typeof strategy.makeDecision).toBe('function')
      expect(typeof strategy.initialize).toBe('function')
      expect(typeof strategy.cleanup).toBe('function')
    })
  })

  it('should handle strategy switching', async () => {
    const gameState = createFullGameState(1)

    // Start with easy strategy
    const easyStrategy = AIStrategyFactory.create({ difficulty: 'easy' })
    const easyDecision = await easyStrategy.makeDecision('card_play', {
      gameState,
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {},
        marketState: 'emerging',
        remainingCards: {},
      },
      opponentModels: new Map(),
      timeSliceController: { shouldContinue: () => true, getTimeRemaining: () => 5000 },
    })

    // Switch to medium strategy
    const mediumStrategy = AIStrategyFactory.create({ difficulty: 'medium' })
    const mediumDecision = await mediumStrategy.makeDecision('card_play', {
      gameState,
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {},
        marketState: 'emerging',
        remainingCards: {},
      },
      opponentModels: new Map(),
      timeSliceController: { shouldContinue: () => true, getTimeRemaining: () => 5000 },
    })

    expect(easyDecision).toBeDefined()
    expect(mediumDecision).toBeDefined()
    expect(easyDecision.type).toBe('card_play')
    expect(mediumDecision.type).toBe('card_play')
  })
})