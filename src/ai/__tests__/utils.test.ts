// ===================
// AI UTILITIES TESTS
// ===================

import { describe, it, expect, beforeEach } from 'vitest'
import { TimeSlicer } from '../utils/time-slicer'
import { createProbabilityUtils } from '../utils/probability'
import { createCardUtils } from '../utils/card-utils'
import { createMarketUtils } from '../utils/market-utils'

describe('Time Slicer', () => {
  let timeSlicer: TimeSlicer

  beforeEach(() => {
    timeSlicer = new TimeSlicer()
  })

  it('should execute simple computation without time slicing', async () => {
    const result = await timeSlicer.execute(() => {
      return 42
    })

    expect(result.success).toBe(true)
    expect(result.value).toBe(42)
    expect(result.timedOut).toBe(false)
  })

  it('should handle time limits', async () => {
    const result = await timeSlicer.execute(
      (controller) => {
        // Simulate long computation
        const start = performance.now()
        while (performance.now() - start < 100) {
          // Busy wait
          if (!controller.shouldContinue()) {
            break
          }
        }
        return 'completed'
      },
      { timeoutMs: 50 }
    )

    expect(result.timedOut).toBe(true)
    expect(result.interrupted).toBe(true)
  })

  it('should support progressive computation', async () => {
    let iterations = 0
    const result = await timeSlicer.execute(
      (controller) => {
        const maxIterations = 100
        const results: number[] = []

        for (let i = 0; i < maxIterations; i++) {
          if (!controller.shouldContinue()) {
            break
          }

          results.push(i * i)
          iterations++

          // Yield control every 10 iterations
          if (i % 10 === 0) {
            controller.yield()
          }
        }

        return results
      },
      { timeoutMs: 50, chunkSize: 10 }
    )

    expect(result.success).toBe(true)
    expect(iterations).toBeLessThan(100) // Should be interrupted
    expect(Array.isArray(result.value)).toBe(true)
  })

  it('should handle errors in computation', async () => {
    const result = await timeSlicer.execute(() => {
      throw new Error('Test error')
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Test error')
  })
})

describe('Probability Utils', () => {
  let probability: ReturnType<typeof createProbabilityUtils>

  beforeEach(() => {
    probability = createProbabilityUtils(12345) // Fixed seed for reproducible tests
  })

  it('should generate consistent random numbers with seed', () => {
    const value1 = probability.random()
    const value2 = probability.random()

    expect(value1).toBeGreaterThanOrEqual(0)
    expect(value1).toBeLessThan(1)
    expect(value2).toBeGreaterThanOrEqual(0)
    expect(value2).toBeLessThan(1)
    expect(value1).not.toBe(value2) // Should be different
  })

  it('should generate random numbers in range', () => {
    const value = probability.randomInRange(10, 20)

    expect(value).toBeGreaterThanOrEqual(10)
    expect(value).toBeLessThan(20)
  })

  it('should select random element from array', () => {
    const array = ['a', 'b', 'c', 'd', 'e']
    const selected = probability.randomElement(array)

    expect(array).toContain(selected)
  })

  it('should weight random selection correctly', () => {
    const options = [
      { item: 'a', weight: 10 },
      { item: 'b', weight: 1 },
    ]

    // Run multiple times to see distribution
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 1000; i++) {
      const selected = probability.weightedRandom(options)
      counts[selected.item as keyof typeof counts]++
    }

    // 'a' should be selected more often
    expect(counts.a).toBeGreaterThan(counts.b * 5)
  })

  it('should calculate probabilities correctly', () => {
    const outcomes = [0.1, 0.3, 0.6]
    const result = probability.calculateProbability(outcomes)

    expect(result).toBeCloseTo(0.3, 2) // Average of outcomes
  })

  it('should normalize probabilities', () => {
    const probs = [1, 2, 3, 4] // Sum = 10
    const normalized = probability.normalize(probs)

    expect(normalized).toEqual([0.1, 0.2, 0.3, 0.4])
  })

  it('should handle zero probabilities', () => {
    const probs = [0, 0, 0]
    const normalized = probability.normalize(probs)

    expect(normalized).toEqual([0, 0, 0])
  })
})

describe('Card Utils', () => {
  let cardUtils: ReturnType<typeof createCardUtils>

  beforeEach(() => {
    cardUtils = createCardUtils()
  })

  it('should validate card correctly', () => {
    const validCard = {
      id: 'card-1',
      artist: 'Manuel Carvalho',
      auctionType: 'open' as const,
    }

    const invalidCard = {
      id: '',
      artist: '',
      auctionType: 'invalid' as const,
    }

    expect(cardUtils.isValid(validCard)).toBe(true)
    expect(cardUtils.isValid(invalidCard)).toBe(false)
  })

  it('should compare cards by artist', () => {
    const card1 = {
      id: 'card-1',
      artist: 'Manuel Carvalho',
      auctionType: 'open' as const,
    }

    const card2 = {
      id: 'card-2',
      artist: 'Manuel Carvalho',
      auctionType: 'hidden' as const,
    }

    const card3 = {
      id: 'card-3',
      artist: 'Sigrid Thaler',
      auctionType: 'open' as const,
    }

    expect(cardUtils.sameArtist(card1, card2)).toBe(true)
    expect(cardUtils.sameArtist(card1, card3)).toBe(false)
  })

  it('should sort cards by artist', () => {
    const cards = [
      { id: 'card-1', artist: 'Sigrid Thaler', auctionType: 'open' as const },
      { id: 'card-2', artist: 'Manuel Carvalho', auctionType: 'open' as const },
      { id: 'card-3', artist: 'Daniel Melim', auctionType: 'open' as const },
    ]

    const sorted = cardUtils.sortByArtist(cards)

    expect(sorted[0].artist).toBe('Daniel Melim')
    expect(sorted[1].artist).toBe('Manuel Carvalho')
    expect(sorted[2].artist).toBe('Sigrid Thaler')
  })

  it('should get auction type value', () => {
    const openCard = { id: 'card-1', artist: 'Artist', auctionType: 'open' as const }
    const hiddenCard = { id: 'card-2', artist: 'Artist', auctionType: 'hidden' as const }
    const doubleCard = { id: 'card-3', artist: 'Artist', auctionType: 'double' as const }

    expect(cardUtils.getAuctionTypeValue(openCard)).toBeLessThan(cardUtils.getAuctionTypeValue(hiddenCard))
    expect(cardUtils.getAuctionTypeValue(hiddenCard)).toBeLessThan(cardUtils.getAuctionTypeValue(doubleCard))
  })

  it('should filter cards by auction type', () => {
    const cards = [
      { id: 'card-1', artist: 'Artist', auctionType: 'open' as const },
      { id: 'card-2', artist: 'Artist', auctionType: 'hidden' as const },
      { id: 'card-3', artist: 'Artist', auctionType: 'open' as const },
      { id: 'card-4', artist: 'Artist', auctionType: 'double' as const },
    ]

    const openCards = cardUtils.filterByAuctionType(cards, 'open')
    const hiddenCards = cardUtils.filterByAuctionType(cards, 'hidden')

    expect(openCards).toHaveLength(2)
    expect(hiddenCards).toHaveLength(1)
  })
})

describe('Market Utils', () => {
  let marketUtils: ReturnType<typeof createMarketUtils>

  beforeEach(() => {
    marketUtils = createMarketUtils()
  })

  it('should calculate artist competitiveness', () => {
    const market = {
      'Manuel Carvalho': {
        artist: 'Manuel Carvalho',
        cardsSold: 3,
        currentSeasonSales: 2,
        totalSales: 150,
        highestPrice: 70,
        averagePrice: 50,
      },
      'Sigrid Thaler': {
        artist: 'Sigrid Thaler',
        cardsSold: 1,
        currentSeasonSales: 1,
        totalSales: 30,
        highestPrice: 30,
        averagePrice: 30,
      },
    }

    const competitiveness = marketUtils.calculateCompetitiveness(market)

    expect(competitiveness['Manuel Carvalho'].rank).toBeLessThan(competitiveness['Sigrid Thaler'].rank)
    expect(competitiveness['Manuel Carvalho'].competitionLevel).toBe('high')
  })

  it('should determine market state', () => {
    const emergingMarket = {
      'Artist1': { cardsSold: 0, totalSales: 0, averagePrice: 0, highestPrice: 0, currentSeasonSales: 0, artist: 'Artist1' },
      'Artist2': { cardsSold: 1, totalSales: 20, averagePrice: 20, highestPrice: 20, currentSeasonSales: 1, artist: 'Artist2' },
    }

    const consolidatedMarket = {
      'Artist1': { cardsSold: 5, totalSales: 300, averagePrice: 60, highestPrice: 80, currentSeasonSales: 3, artist: 'Artist1' },
      'Artist2': { cardsSold: 4, totalSales: 200, averagePrice: 50, highestPrice: 70, currentSeasonSales: 2, artist: 'Artist2' },
    }

    expect(marketUtils.determineMarketState(emergingMarket)).toBe('emerging')
    expect(marketUtils.determineMarketState(consolidatedMarket)).toBe('consolidated')
  })

  it('should predict artist values', () => {
    const artistStats = {
      artist: 'Manuel Carvalho',
      cardsSold: 2,
      currentSeasonSales: 1,
      totalSales: 100,
      highestPrice: 60,
      averagePrice: 50,
    }

    const remainingCards = 3
    const roundsLeft = 3

    const prediction = marketUtils.predictArtistValue(artistStats, remainingCards, roundsLeft)

    expect(prediction.expectedFinalValue).toBeGreaterThan(0)
    expect(prediction.confidence).toBeGreaterThan(0)
    expect(prediction.confidence).toBeLessThanOrEqual(1)
  })

  it('should find market opportunities', () => {
    const market = {
      'Undervalued Artist': {
        artist: 'Undervalued Artist',
        cardsSold: 1,
        totalSales: 20,
        averagePrice: 20,
        highestPrice: 20,
        currentSeasonSales: 1,
      },
      'Overvalued Artist': {
        artist: 'Overvalued Artist',
        cardsSold: 4,
        totalSales: 300,
        averagePrice: 75,
        highestPrice: 90,
        currentSeasonSales: 2,
      },
    }

    const opportunities = marketUtils.findOpportunities(market, ['Undervalued Artist', 'Overvalued Artist'])

    expect(opportunities.undervalued).toContain('Undervalued Artist')
    expect(opportunities.overvalued).toContain('Overvalued Artist')
  })
})