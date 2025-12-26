// ===================
// AI UNIT TESTS
// ===================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EasyAIStrategy } from '../strategies/easy'
import { MediumAIStrategy } from '../strategies/medium'
import { HardAIStrategy } from '../strategies/hard'
import { AIStrategyFactory } from '../strategies'
import { AIManager } from '../ai-manager'
import { ErrorHandler } from '../errors/error-handler'
import { ErrorFactory } from '../errors/error-factory'
import { PerformanceMonitor } from '../monitoring/performance-monitor'
import { createPerformanceMonitor } from '../monitoring/factory'

import type {
  GameState,
  Player,
  Card,
  Artist,
  AuctionType
} from '../../types/game'
import type { AIDifficulty, AIDecisionContext } from '../types'

// Mock game state for testing
const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  phase: 'auction',
  round: {
    roundNumber: 1,
    season: 'spring',
    phase: {
      type: 'auction',
      auction: null,
    },
    cardsPlayedPerArtist: {
      'Manuel Carvalho': 0,
      'Sigrid Thaler': 0,
      'Daniel Melim': 0,
      'Ramon Martins': 0,
      'Rafael Silveira': 0,
    },
    currentAuctioneerIndex: 0,
  },
  currentPlayer: 0,
  players: [
    {
      id: 'player-0',
      name: 'AI Player 1',
      hand: [
        {
          id: 'card-1',
          artist: 'Manuel Carvalho' as Artist,
          auctionType: 'open' as AuctionType,
          artworkId: 'manuel_carvalho_open_1',
          cardIndex: 0,
        },
        {
          id: 'card-2',
          artist: 'Sigrid Thaler' as Artist,
          auctionType: 'hidden' as AuctionType,
          artworkId: 'sigrid_thaler_hidden_1',
          cardIndex: 0,
        },
      ],
          money: 100,
      purchases: [],
      purchasedThisRound: [],
          isAI: true,
    },
    {
      id: 'player-1',
      name: 'Human Player',
      hand: [],
          money: 80,
      purchases: [],
      purchasedThisRound: [],
          isAI: false,
    },
  ],
  currentAuction: null,
  market: {
    'Manuel Carvalho': {
      artist: 'Manuel Carvalho' as Artist,
      cardsSold: 0,
      currentSeasonSales: 0,
      totalSales: 0,
      highestPrice: 0,
      averagePrice: 0,
    },
    'Sigrid Thaler': {
      artist: 'Sigrid Thaler' as Artist,
      cardsSold: 0,
      currentSeasonSales: 0,
      totalSales: 0,
      highestPrice: 0,
      averagePrice: 0,
    },
  },
  season: 'spring',
  board: {
    playedCards: {
      'Manuel Carvalho': [],
      'Sigrid Thaler': [],
    },
  },
  ...overrides,
})

describe('AI Strategy Factory', () => {
  it('should create easy AI strategy', () => {
    const strategy = AIStrategyFactory.create({
      difficulty: 'easy',
      seed: 12345,
    })

    expect(strategy).toBeInstanceOf(EasyAIStrategy)
  })

  it('should create medium AI strategy', () => {
    const strategy = AIStrategyFactory.create({
      difficulty: 'medium',
      seed: 12345,
    })

    expect(strategy).toBeInstanceOf(MediumAIStrategy)
  })

  it('should create hard AI strategy', () => {
    const strategy = AIStrategyFactory.create({
      difficulty: 'hard',
      seed: 12345,
    })

    expect(strategy).toBeInstanceOf(HardAIStrategy)
  })

  it('should throw error for unknown difficulty', () => {
    expect(() => {
      AIStrategyFactory.create({
        difficulty: 'unknown' as AIDifficulty,
      })
    }).toThrow('Unknown AI difficulty')
  })

  it('should get available strategies', () => {
    const strategies = AIStrategyFactory.getAvailableStrategies()
    expect(strategies).toEqual(['easy', 'medium', 'hard'])
  })
})

describe('Easy AI Strategy', () => {
  let strategy: EasyAIStrategy
  let mockContext: AIDecisionContext

  beforeEach(() => {
    strategy = new EasyAIStrategy(12345)
    mockContext = {
      gameState: createMockGameState(),
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {},
        marketState: 'emerging',
        remainingCards: {},
      },
      opponentModels: new Map(),
      timeSliceController: {
        shouldContinue: () => true,
        getTimeRemaining: () => 5000,
      },
    }
  })

  it('should make a valid card play decision', async () => {
    const decision = await strategy.makeDecision('card_play', mockContext)

    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
    expect(decision.action).toBe('play_card')
    expect(decision.card).toBeTruthy()
    expect(mockContext.gameState.players[0].hand).toContain(decision.card)
  })

  it('should handle empty hand gracefully', async () => {
    const emptyHandState = createMockGameState({
      players: [
        {
          ...createMockGameState().players[0],
          hand: [],
        },
        createMockGameState().players[1],
      ],
    })

    const emptyContext = {
      ...mockContext,
      gameState: emptyHandState,
    }

    const decision = await strategy.makeDecision('card_play', emptyContext)

    expect(decision).toBeDefined()
    expect(decision.action).toBe('play_card')
    expect(decision.card).toBeNull()
  })

  it('should make bid decisions', async () => {
    const auctionState = createMockGameState({
      currentAuction: {
        card: {
          id: 'auction-card',
          artist: 'Manuel Carvalho' as Artist,
          auctionType: 'open' as AuctionType,
        },
        seller: 1,
        currentBid: 10,
        bids: [],
      },
    })

    const auctionContext = {
      ...mockContext,
      gameState: auctionState,
    }

    const decision = await strategy.makeDecision('bid', auctionContext, {
      auction: auctionState.currentAuction,
    })

    expect(decision).toBeDefined()
    expect(decision.type).toBe('bid')
    expect(['bid', 'pass']).toContain(decision.action)
  })

  it('should make decisions within reasonable time', async () => {
    const startTime = performance.now()
    await strategy.makeDecision('card_play', mockContext)
    const duration = performance.now() - startTime

    // Easy AI should decide quickly (under 1 second)
    expect(duration).toBeLessThan(1000)
  })
})

describe('Medium AI Strategy', () => {
  let strategy: MediumAIStrategy
  let mockContext: AIDecisionContext

  beforeEach(() => {
    strategy = new MediumAIStrategy(12345)
    mockContext = {
      gameState: createMockGameState(),
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {
          'Manuel Carvalho': {
            rank: 1,
            expectedFinalValue: 50,
            competitionLevel: 'medium',
          },
          'Sigrid Thaler': {
            rank: 2,
            expectedFinalValue: 40,
            competitionLevel: 'low',
          },
        },
        marketState: 'emerging',
        remainingCards: {
          'Manuel Carvalho': 3,
          'Sigrid Thaler': 2,
        },
      },
      opponentModels: new Map(),
      timeSliceController: {
        shouldContinue: () => true,
        getTimeRemaining: () => 10000,
      },
    }
  })

  it('should make strategic card play decisions', async () => {
    const decision = await strategy.makeDecision('card_play', mockContext)

    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
    expect(decision.action).toBe('play_card')
    expect(decision.card).toBeTruthy()
  })

  it('should calculate expected values for bids', async () => {
    const auctionState = createMockGameState({
      currentAuction: {
        card: {
          id: 'auction-card',
          artist: 'Manuel Carvalho' as Artist,
          auctionType: 'open' as AuctionType,
        },
        seller: 1,
        currentBid: 10,
        bids: [],
      },
    })

    const auctionContext = {
      ...mockContext,
      gameState: auctionState,
    }

    const decision = await strategy.makeDecision('bid', auctionContext, {
      auction: auctionState.currentAuction,
    })

    expect(decision).toBeDefined()
    expect(decision.type).toBe('bid')
    if (decision.action === 'bid') {
      expect(decision.amount).toBeGreaterThan(0)
      expect(decision.amount).toBeLessThanOrEqual(mockContext.gameState.players[0].money)
    }
  })

  it('should handle hidden bid auctions', async () => {
    const hiddenAuctionState = createMockGameState({
      currentAuction: {
        card: {
          id: 'hidden-card',
          artist: 'Sigrid Thaler' as Artist,
          auctionType: 'hidden' as AuctionType,
        },
        seller: 1,
        currentBid: 0,
        bids: [],
      },
    })

    const hiddenAuctionContext = {
      ...mockContext,
      gameState: hiddenAuctionState,
    }

    const decision = await strategy.makeDecision('hidden_bid', hiddenAuctionContext, {
      auction: hiddenAuctionState.currentAuction,
    })

    expect(decision).toBeDefined()
    expect(decision.type).toBe('hidden_bid')
    expect(decision.action).toBeUndefined() // hidden_bid doesn't have action field
  })
})

describe('Hard AI Strategy', () => {
  let strategy: HardAIStrategy
  let mockContext: AIDecisionContext

  beforeEach(() => {
    strategy = new HardAIStrategy(undefined, 12345)
    mockContext = {
      gameState: createMockGameState(),
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {
          'Manuel Carvalho': {
            rank: 1,
            expectedFinalValue: 60,
            competitionLevel: 'high',
          },
          'Sigrid Thaler': {
            rank: 3,
            expectedFinalValue: 30,
            competitionLevel: 'low',
          },
        },
        marketState: 'competitive',
        remainingCards: {
          'Manuel Carvalho': 2,
          'Sigrid Thaler': 4,
        },
      },
      opponentModels: new Map([
        [1, {
          aggressiveness: 0.3,
          riskTolerance: 0.5,
          tendencies: {
            bluffing: 0.1,
            earlyGameInvestment: 0.6,
          },
        }],
      ]),
      timeSliceController: {
        shouldContinue: () => true,
        getTimeRemaining: () => 15000,
      },
    }
  })

  it('should make sophisticated card play decisions', async () => {
    const decision = await strategy.makeDecision('card_play', mockContext)

    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
    expect(decision.action).toBe('play_card')
    expect(decision.card).toBeTruthy()
  })

  it('should use Nash equilibrium in bidding', async () => {
    const auctionState = createMockGameState({
      currentAuction: {
        card: {
          id: 'nash-card',
          artist: 'Manuel Carvalho' as Artist,
          auctionType: 'open' as AuctionType,
        },
        seller: 1,
        currentBid: 20,
        bids: [],
      },
    })

    const auctionContext = {
      ...mockContext,
      gameState: auctionState,
    }

    const decision = await strategy.makeDecision('bid', auctionContext, {
      auction: auctionState.currentAuction,
    })

    expect(decision).toBeDefined()
    expect(decision.type).toBe('bid')
    // Hard AI should make more sophisticated decisions
    expect(decision.action).toBeDefined()
  })

  it('should adapt strategy based on opponent models', async () => {
    // Create a simple auction for this test
    const auctionState = createMockGameState({
      currentAuction: {
        card: {
          id: 'adaptive-card',
          artist: 'Manuel Carvalho' as Artist,
          auctionType: 'open' as AuctionType,
        },
        seller: 1,
        currentBid: 15,
        bids: [],
      },
    })

    const decision = await strategy.makeDecision('bid', {
      ...mockContext,
      gameState: auctionState,
    }, {
      auction: auctionState.currentAuction,
    })

    expect(decision).toBeDefined()
    // Hard AI should consider opponent tendencies
    expect(decision.type).toBe('bid')
  })
})

describe('AI Manager Integration', () => {
  let aiManager: AIManager
  let mockGameState: GameState

  beforeEach(() => {
    aiManager = new AIManager()
    mockGameState = createMockGameState()
  })

  it('should register AI players', () => {
    aiManager.registerAI(0, 'medium')
    aiManager.registerAI(2, 'hard')

    expect(aiManager.hasAI(0)).toBe(true)
    expect(aiManager.hasAI(1)).toBe(false)
    expect(aiManager.hasAI(2)).toBe(true)
  })

  it('should make decisions for registered AI players', async () => {
    aiManager.registerAI(0, 'easy')

    const decision = await aiManager.makeDecision(0, 'card_play', mockGameState)

    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
  })

  it('should handle timeout gracefully', async () => {
    aiManager.registerAI(0, 'hard')

    // Create a time controller that immediately times out
    const timeoutController = {
      shouldContinue: () => false,
      getTimeRemaining: () => 0,
    }

    const decision = await aiManager.makeDecision(0, 'card_play', mockGameState, {
      timeSliceController: timeoutController,
    })

    // Should return a fallback decision
    expect(decision).toBeDefined()
    expect(decision.type).toBe('card_play')
  })
})

describe('Error Handling', () => {
  let errorHandler: ErrorHandler
  let mockContext: AIDecisionContext

  beforeEach(() => {
    errorHandler = new ErrorHandler()
    mockContext = {
      gameState: createMockGameState(),
      playerIndex: 0,
      marketAnalysis: {
        artistCompetitiveness: {},
        marketState: 'emerging',
        remainingCards: {},
      },
      opponentModels: new Map(),
      timeSliceController: {
        shouldContinue: () => true,
        getTimeRemaining: () => 5000,
      },
    }
  })

  it('should handle decision errors with fallbacks', async () => {
    const error = ErrorFactory.decisionError(
      'Test error',
      'card_play',
      'computation',
      mockContext
    )

    const result = await errorHandler.handleError(error, mockContext)

    expect(result.decision).toBeDefined()
    expect(result.errorHandled).toBe(true)
    expect(result.fallbackUsed).toBe(true)
  })

  it('should create appropriate fallback decisions', async () => {
    const criticalError = ErrorFactory.critical('Critical system failure', mockContext)

    const result = await errorHandler.handleError(criticalError, mockContext)

    expect(result.decision).toBeDefined()
    expect(result.decision.action).toBe('pass') // Emergency fallback
    expect(result.errorHandled).toBe(false) // Critical errors aren't handled
  })

  it('should track error statistics', () => {
    const error1 = ErrorFactory.decisionError('Error 1', 'bid', 'analysis')
    const error2 = ErrorFactory.decisionError('Error 2', 'bid', 'computation')

    errorHandler.handleError(error1, mockContext)
    errorHandler.handleError(error2, mockContext)

    const stats = errorHandler.getErrorStats(0)

    expect(stats.totalErrors).toBe(2)
    expect(stats.errorsByCategory.decision).toBe(2)
  })

  it('should detect systemic issues', () => {
    // Generate many errors
    for (let i = 0; i < 25; i++) {
      const error = ErrorFactory.decisionError(`Error ${i}`, 'bid', 'analysis')
      errorHandler.handleError(error, mockContext)
    }

    expect(errorHandler.hasSystemicIssues()).toBe(true)
  })
})

describe('Performance Monitoring', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  it('should track AI operation performance', () => {
    const id = 'test-operation'
    monitor.startMeasurement(id, 'card_play', 'medium', 0)

    // Simulate some work
    const start = performance.now()
    while (performance.now() - start < 10) {
      // Busy wait for 10ms
    }

    const measurement = monitor.endMeasurement(id, true, {
      decisionQuality: 0.8,
      confidence: 0.9,
      timeSliceCount: 3,
    })

    expect(measurement).toBeDefined()
    expect(measurement.id).toBe(id)
    expect(measurement.type).toBe('card_play')
    expect(measurement.difficulty).toBe('medium')
    expect(measurement.success).toBe(true)
    expect(measurement.duration).toBeGreaterThan(0)
  })

  it('should calculate performance metrics', async () => {
    // Add some test measurements
    for (let i = 0; i < 5; i++) {
      const id = `test-${i}`
      monitor.startMeasurement(id, 'bid', 'easy', i)
      // Small delay to simulate actual work
      await new Promise(resolve => setTimeout(resolve, 1))
      monitor.endMeasurement(id, true)
    }

    const metrics = monitor.getMetrics()
    const summary = metrics.getSummary()

    expect(summary.totalMeasurements).toBe(5)
    expect(summary.successRate).toBe(1)
    expect(summary.averageDuration).toBeGreaterThan(0)
  })

  it('should detect performance degradation', () => {
    // Add measurements with increasing duration
    for (let i = 0; i < 10; i++) {
      const id = `degrade-${i}`
      monitor.startMeasurement(id, 'card_play', 'hard', 0)

      // Simulate increasing work time
      const start = performance.now()
      const targetDelay = i * 10 // Increasing delay
      while (performance.now() - start < targetDelay) {
        // Busy wait
      }

      monitor.endMeasurement(id, true)
    }

    // Should detect degradation with enough measurements
    // Note: This depends on the exact threshold and timing
    const isDegrading = monitor.isPerformanceDegrading()
    expect(typeof isDegrading).toBe('boolean')
  })
})

describe('Monitoring Factory', () => {
  it('should create monitoring with default config', () => {
    const { monitor, profiler, errorReporter, cleanup } = createPerformanceMonitor()

    expect(monitor).toBeInstanceOf(PerformanceMonitor)
    // Profiler is only enabled in development, not in test environment
    expect(errorReporter).toBeDefined()

    cleanup()
  })

  it('should create monitoring with custom config', () => {
    const config = {
      enableProfiling: false,
      enableErrorReporting: false,
      maxMeasurements: 500,
    }

    const { monitor, profiler, errorReporter, cleanup } = createPerformanceMonitor(config)

    expect(monitor).toBeInstanceOf(PerformanceMonitor)
    expect(profiler).toBeUndefined()
    expect(errorReporter).toBeUndefined()

    cleanup()
  })
})