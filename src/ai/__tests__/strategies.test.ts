// ===================
// AI STRATEGIES TESTS
// ===================

import { describe, it, expect, beforeEach } from 'vitest'
import { MediumAICardValuation } from '../strategies/medium'
import { MediumAIBidding } from '../strategies/medium'
import { HardAIPersonalitySystem } from '../strategies/hard'
import { HardAICardPlay } from '../strategies/hard'
import { HardAIBidding } from '../strategies/hard'

import type {
  GameState,
  Card,
  Artist,
  AuctionType
} from '../../types/game'
import type { AIDecisionContext, AIPersonality } from '../types'

// Test helpers
const createTestCard = (artist: Artist, auctionType: AuctionType = 'open'): Card => ({
  id: `card-${Math.random()}`,
  artist,
  auctionType,
})

const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  phase: 'auction',
  round: {
    roundNumber: 1,
    season: 'spring',
    phase: {
      type: 'awaiting_card_play',
      activePlayerIndex: 0,
    },
    cardsPlayed: {},
    currentAuctioneerIndex: 0,
  },
  currentPlayer: 0,
  players: [
    {
      id: 'ai-player',
      name: 'AI Player',
      hand: [
        createTestCard('Manuel Carvalho', 'open'),
        createTestCard('Sigrid Thaler', 'hidden'),
        createTestCard('Daniel Melim', 'fixed_price'),
      ],
      money: 100,
      purchases: [],
      isAI: true,
    },
    {
      id: 'opponent-1',
      name: 'Opponent 1',
      hand: [],
      money: 80,
      purchases: [],
      isAI: false,
    },
    {
      id: 'opponent-2',
      name: 'Opponent 2',
      hand: [],
      money: 90,
      purchases: [],
      isAI: false,
    },
  ],
  currentAuction: null,
  board: {
    playedCards: {
      'Manuel Carvalho': [],
      'Sigrid Thaler': [],
      'Daniel Melim': [],
      'Ramon Martins': [],
      'Rafael Silveira': [],
    },
  },
  market: {
    'Manuel Carvalho': {
      artist: 'Manuel Carvalho',
      cardsSold: 2,
      currentSeasonSales: 1,
      totalSales: 120,
      highestPrice: 70,
      averagePrice: 60,
    },
    'Sigrid Thaler': {
      artist: 'Sigrid Thaler',
      cardsSold: 0,
      currentSeasonSales: 0,
      totalSales: 0,
      highestPrice: 0,
      averagePrice: 0,
    },
  },
  season: 'spring',
  ...overrides,
})

const createTestContext = (gameState: GameState, playerIndex: number = 0): AIDecisionContext => ({
  gameState,
  playerIndex,
  marketAnalysis: {
    artistCompetitiveness: {
      'Manuel Carvalho': {
        rank: 1,
        expectedFinalValue: 80,
        competitionLevel: 'high',
      },
      'Sigrid Thaler': {
        rank: 4,
        expectedFinalValue: 30,
        competitionLevel: 'low',
      },
    },
    marketState: 'emerging',
    remainingCards: {
      'Manuel Carvalho': 4,
      'Sigrid Thaler': 6,
    },
  },
  opponentModels: new Map(),
  timeSliceController: {
    shouldContinue: () => true,
    getTimeRemaining: () => 5000,
  },
})

describe('Medium AI Card Valuation', () => {
  let valuation: MediumAICardValuation
  let testContext: AIDecisionContext

  beforeEach(() => {
    valuation = new MediumAICardValuation()
    testContext = createTestContext(createTestGameState())
  })

  it('should evaluate card with basic value', () => {
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    expect(evaluation).toBeDefined()
    expect(evaluation.baseValue).toBeGreaterThan(0)
    expect(evaluation.confidence).toBeGreaterThan(0)
    expect(evaluation.confidence).toBeLessThanOrEqual(1)
  })

  it('should consider market position in evaluation', () => {
    const popularArtist = createTestCard('Manuel Carvalho')
    const unpopularArtist = createTestCard('Sigrid Thaler')

    const popularEval = valuation.evaluateCard(popularArtist, testContext.gameState, 0)
    const unpopularEval = valuation.evaluateCard(unpopularArtist, testContext.gameState, 0)

    // Popular artist should have higher value
    expect(popularEval.baseValue).toBeGreaterThan(unpopularEval.baseValue)
  })

  it('should adjust value based on player holdings', () => {
    const gameStateWithHoldings = createTestGameState({
      players: [
        {
          ...createTestGameState().players[0],
          purchases: [
            { artist: 'Manuel Carvalho', price: 50 },
            { artist: 'Manuel Carvalho', price: 60 },
          ],
        },
        createTestGameState().players[1],
        createTestGameState().players[2],
      ],
    })

    const contextWithHoldings = createTestContext(gameStateWithHoldings)
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, gameStateWithHoldings, 0)

    // Player already owns 2 cards of this artist, should get bonus
    expect(evaluation.artistControl).toBeGreaterThan(0)
  })

  it('should account for auction type differences', () => {
    const openCard = createTestCard('Manuel Carvalho', 'open')
    const hiddenCard = createTestCard('Manuel Carvalho', 'hidden')
    const doubleCard = createTestCard('Manuel Carvalho', 'double')

    const openEval = valuation.evaluateCard(openCard, testContext.gameState, 0)
    const hiddenEval = valuation.evaluateCard(hiddenCard, testContext.gameState, 0)
    const doubleEval = valuation.evaluateCard(doubleCard, testContext.gameState, 0)

    // Different auction types should have different strategic values
    expect(openEval.strategicValue).toBeGreaterThanOrEqual(0)
    expect(hiddenEval.strategicValue).toBeGreaterThanOrEqual(0)
    expect(doubleEval.strategicValue).toBeGreaterThanOrEqual(0)
  })
})

describe('Medium AI Bidding', () => {
  let bidding: MediumAIBidding
  let valuation: MediumAICardValuation
  let testContext: AIDecisionContext

  beforeEach(() => {
    bidding = new MediumAIBidding()
    valuation = new MediumAICardValuation()
    testContext = createTestContext(createTestGameState())
  })

  it('should calculate optimal bid amount', () => {
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    const bidAmount = bidding.calculateOptimalBid(
      card,
      evaluation,
      testContext,
      {
        currentBid: 30,
        minIncrement: 5,
      }
    )

    expect(bidAmount).toBeGreaterThan(0)
    expect(bidAmount).toBeLessThanOrEqual(testContext.gameState.players[0].money)
  })

  it('should not bid over expected value', () => {
    const card = createTestCard('Sigrid Thaler') // Less valuable artist
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    const bidAmount = bidding.calculateOptimalBid(
      card,
      evaluation,
      testContext,
      {
        currentBid: 80, // Very high bid
        minIncrement: 5,
      }
    )

    // Should not overbid
    expect(bidAmount).toBeLessThanOrEqual(evaluation.estimatedValue)
  })

  it('should consider competition level', () => {
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    const normalBid = bidding.calculateOptimalBid(
      card,
      evaluation,
      testContext,
      {
        currentBid: 30,
        minIncrement: 5,
      }
    )

    // Create context with high competition
    const highCompetitionContext = {
      ...testContext,
      marketAnalysis: {
        ...testContext.marketAnalysis,
        artistCompetitiveness: {
          'Manuel Carvalho': {
            rank: 1,
            expectedFinalValue: 80,
            competitionLevel: 'high',
          },
        },
      },
    }

    const highCompetitionBid = bidding.calculateOptimalBid(
      card,
      evaluation,
      highCompetitionContext,
      {
        currentBid: 30,
        minIncrement: 5,
      }
    )

    // Should bid more conservatively in high competition
    expect(highCompetitionBid).toBeLessThanOrEqual(normalBid)
  })
})

describe('Hard AI Personality System', () => {
  let personalitySystem: HardAIPersonalitySystem

  beforeEach(() => {
    personalitySystem = new HardAIPersonalitySystem()
  })

  it('should create personality from template', () => {
    const aggressive = personalitySystem.createPersonality('aggressive')
    const conservative = personalitySystem.createPersonality('conservative')
    const balanced = personalitySystem.createPersonality('balanced')

    expect(aggressive.aggressiveness).toBeGreaterThan(conservative.aggressiveness)
    expect(conservative.patience).toBeGreaterThan(aggressive.patience)
    expect(balanced.riskTolerance).toBeCloseTo(0.5, 1)
  })

  it('should create random personality', () => {
    const personality = personalitySystem.createRandomPersonality()

    expect(personality.aggressiveness).toBeGreaterThanOrEqual(0)
    expect(personality.aggressiveness).toBeLessThanOrEqual(1)
    expect(personality.patience).toBeGreaterThanOrEqual(0)
    expect(personality.patience).toBeLessThanOrEqual(1)
    expect(personality.riskTolerance).toBeGreaterThanOrEqual(0)
    expect(personality.riskTolerance).toBeLessThanOrEqual(1)
  })

  it('should adapt personality based on performance', () => {
    const personality = personalitySystem.createPersonality('balanced')
    const initialAggressiveness = personality.aggressiveness

    // Simulate poor performance with aggressive bidding
    personalitySystem.adaptPersonality(personality, {
      decisions: 10,
      successRate: 0.3, // Low success rate
      averageProfit: -20, // Losing money
    })

    // Should become less aggressive after poor performance
    expect(personality.aggressiveness).toBeLessThan(initialAggressiveness)
  })

  it('should merge personalities', () => {
    const aggressive = personalitySystem.createPersonality('aggressive')
    const conservative = personalitySystem.createPersonality('conservative')

    const merged = personalitySystem.mergePersonalities(aggressive, conservative, 0.5)

    // Should be halfway between both
    expect(merged.aggressiveness).toBeCloseTo(
      (aggressive.aggressiveness + conservative.aggressiveness) / 2,
      1
    )
  })
})

describe('Hard AI Card Play', () => {
  let cardPlay: HardAICardPlay
  let testContext: AIDecisionContext

  beforeEach(() => {
    const aggressivePersonality: AIPersonality = {
      aggressiveness: 0.9,
      patience: 0.2,
      riskTolerance: 0.8,
      bluffingFrequency: 0.3,
      learningRate: 0.5,
      memoryRetention: 0.7,
      adaptability: 0.6,
    }

    cardPlay = new HardAICardPlay(aggressivePersonality)
    testContext = createTestContext(createTestGameState())
  })

  it('should select strategic card', async () => {
    const result = await cardPlay.selectStrategicCard(testContext)

    expect(result).toBeDefined()
    if (result) {
      expect(result.card).toBeDefined()
      expect(result.evaluation).toBeDefined()
      expect(result.estimatedValue).toBeGreaterThan(0)
    }
  })

  it('should consider personality in card selection', async () => {
    const aggressiveResult = await cardPlay.selectStrategicCard(testContext)

    // Create a conservative personality
    const conservativePersonality: AIPersonality = {
      aggressiveness: 0.1,
      patience: 0.9,
      riskTolerance: 0.2,
      bluffingFrequency: 0.1,
      learningRate: 0.5,
      memoryRetention: 0.7,
      adaptability: 0.6,
    }

    const conservativeCardPlay = new HardAICardPlay(conservativePersonality)
    const conservativeResult = await conservativeCardPlay.selectStrategicCard(testContext)

    // Different personalities should potentially select different cards
    // This is a basic test - in reality the card selection might be the same
    // but the reasoning would be different
    if (aggressiveResult && conservativeResult) {
      expect(aggressiveResult.card).toBeDefined()
      expect(conservativeResult.card).toBeDefined()
    }
  })

  it('should handle empty hand gracefully', async () => {
    const emptyHandContext = createTestContext(
      createTestGameState({
        players: [
          {
            ...createTestGameState().players[0],
            hand: [],
          },
          ...createTestGameState().players.slice(1),
        ],
      })
    )

    const result = await cardPlay.selectStrategicCard(emptyHandContext)

    expect(result).toBeNull()
  })
})

describe('Hard AI Bidding', () => {
  let bidding: HardAIBidding
  let valuation: MediumAICardValuation
  let testContext: AIDecisionContext

  beforeEach(() => {
    const personality: AIPersonality = {
      aggressiveness: 0.7,
      patience: 0.5,
      riskTolerance: 0.6,
      bluffingFrequency: 0.4,
      learningRate: 0.5,
      memoryRetention: 0.7,
      adaptability: 0.6,
    }

    bidding = new HardAIBidding(personality)
    valuation = new MediumAICardValuation()
    testContext = createTestContext(createTestGameState())
  })

  it('should calculate sophisticated bid amount', async () => {
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    const bidAmount = await bidding.calculateBidAmount(
      card,
      evaluation,
      testContext,
      {
        currentBid: 30,
        minIncrement: 5,
        timeRemaining: 10000,
      }
    )

    expect(bidAmount).toBeGreaterThan(0)
    expect(bidAmount).toBeLessThanOrEqual(testContext.gameState.players[0].money)
  })

  it('should use game theory in high-value auctions', async () => {
    const highValueCard = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(highValueCard, testContext.gameState, 0)

    // Set up high competition scenario
    const highCompetitionContext = {
      ...testContext,
      marketAnalysis: {
        ...testContext.marketAnalysis,
        artistCompetitiveness: {
          'Manuel Carvalho': {
            rank: 1,
            expectedFinalValue: 100,
            competitionLevel: 'high',
          },
        },
      },
    }

    const bidAmount = await bidding.calculateBidAmount(
      highValueCard,
      evaluation,
      highCompetitionContext,
      {
        currentBid: 50,
        minIncrement: 5,
        timeRemaining: 15000,
      }
    )

    // Should consider game theory in high-value situations
    expect(bidAmount).toBeGreaterThan(0)
  })

  it('should adapt bidding based on opponent behavior', async () => {
    const card = createTestCard('Manuel Carvalho')
    const evaluation = valuation.evaluateCard(card, testContext.gameState, 0)

    // Create context with aggressive opponent model
    const aggressiveOpponentContext = {
      ...testContext,
      opponentModels: new Map([
        [1, {
          aggressiveness: 0.9,
          riskTolerance: 0.8,
          tendencies: {
            earlyBidding: true,
            bluffing: 0.2,
            overbidding: 0.3,
          },
        }],
      ]),
    }

    const bidAmount = await bidding.calculateBidAmount(
      card,
      evaluation,
      aggressiveOpponentContext,
      {
        currentBid: 30,
        minIncrement: 5,
        timeRemaining: 10000,
      }
    )

    expect(bidAmount).toBeGreaterThan(0)
    // Should adjust strategy based on opponent tendencies
  })
})