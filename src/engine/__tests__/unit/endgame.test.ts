import { describe, it, expect, beforeEach } from 'vitest'
import {
  determineWinner,
  getGameSummary,
  getPlayerFinalStats,
  checkEarlyEndConditions,
  getPlayerRankings,
  getGameStatistics
} from '../../endgame'
import type { GameState, Card } from '../../../types/game'
import { ARTISTS } from '../../constants'

describe('Endgame Module', () => {
  let gameState: GameState
  let mockCard: Card

  beforeEach(() => {
    mockCard = {
      id: 'test_card_1',
      artist: ARTISTS[0],
      auctionType: 'open',
      artworkId: 'test_art_1'
    }

    gameState = {
      players: [
        {
          id: 'p1',
          name: 'Alice',
          money: 100,
          isAI: false,
          hand: [],
          purchasedThisRound: [],
          purchases: [
            {
              card: mockCard,
              artist: ARTISTS[0],
              purchasePrice: 30,
              purchasedRound: 1
            },
            {
              card: { ...mockCard, id: 'test_card_2', artist: ARTISTS[1] },
              artist: ARTISTS[1],
              purchasePrice: 20,
              purchasedRound: 1
            }
          ]
        },
        {
          id: 'p2',
          name: 'Bob',
          money: 80,
          isAI: false,
          hand: [],
          purchasedThisRound: [],
          purchases: [
            {
              card: { ...mockCard, id: 'test_card_3', artist: ARTISTS[0] },
              artist: ARTISTS[0],
              purchasePrice: 40,
              purchasedRound: 1
            }
          ]
        },
        {
          id: 'p3',
          name: 'Charlie',
          money: 60,
          isAI: false,
          hand: [],
          purchasedThisRound: [],
          purchases: []
        },
        {
          id: 'p4',
          name: 'Diana',
          money: 40,
          isAI: false,
          hand: [],
          purchasedThisRound: [],
          purchases: undefined
        },
        {
          id: 'p5',
          name: 'Eve',
          money: 120,
          isAI: true,
          hand: [],
          purchasedThisRound: [],
          purchases: [
            {
              card: { ...mockCard, id: 'test_card_4', artist: ARTISTS[2] },
              artist: ARTISTS[2],
              purchasePrice: 50,
              purchasedRound: 2
            }
          ]
        }
      ],
      round: {
        roundNumber: 3,
        phase: {
          type: 'selling_to_bank',
          results: [
            { artist: ARTISTS[0], cardCount: 3, rank: 1, value: 30 },
            { artist: ARTISTS[1], cardCount: 2, rank: 2, value: 20 },
            { artist: ARTISTS[2], cardCount: 1, rank: 3, value: 10 },
            { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },
            { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }
          ]
        },
        auctioneerIndex: 0,
        cardsPlayedPerArtist: {
          [ARTISTS[0]]: 3,
          [ARTISTS[1]]: 2,
          [ARTISTS[2]]: 1,
          [ARTISTS[3]]: 0,
          [ARTISTS[4]]: 0
        }
      },
      board: {
        artistValues: {
          [ARTISTS[0]]: [10, 20, 30, 40],
          [ARTISTS[1]]: [0, 10, 20, 30],
          [ARTISTS[2]]: [0, 0, 10, 20],
          [ARTISTS[3]]: [0, 0, 0, 0],
          [ARTISTS[4]]: [0, 0, 0, 0]
        }
      },
      deck: [],
      discardPile: [],
      eventLog: [
        { type: 'auction_complete', timestamp: Date.now() },
        { type: 'bank_sale', timestamp: Date.now() }
      ]
    }
  })

  describe('determineWinner', () => {
    it('identifies clear winner by money', () => {
      const result = determineWinner(gameState)

      expect(result.winner.name).toBe('Eve')
      expect(result.winner.money).toBe(120)
      expect(result.isTie).toBe(false)
      expect(result.tieBreakReason).toBe('')
      expect(result.totalRounds).toBe(3)
    })

    it('handles tie on money with different painting counts', () => {
      // Create a tie scenario between Alice and Bob
      gameState.players[0].money = 100
      gameState.players[1].money = 100
      gameState.players[4].money = 90 // Update Eve to not interfere

      const result = determineWinner(gameState)

      expect(result.isTie).toBe(true)
      expect(result.tieBreakReason).toBe('Most paintings (2)')
      expect(result.winner.name).toBe('Alice') // Alice has 2 paintings, Bob has 1
    })

    it('handles tie on money and paintings', () => {
      // Create complete tie scenario
      gameState.players[0].money = 100
      gameState.players[1].money = 100
      gameState.players[4].money = 90 // Update Eve to not interfere
      gameState.players[1].purchases = [
        {
          card: { ...mockCard, id: 'test_card_5', artist: ARTISTS[3] },
          artist: ARTISTS[3],
          purchasePrice: 30,
          purchasedRound: 1
        },
        {
          card: { ...mockCard, id: 'test_card_6', artist: ARTISTS[4] },
          artist: ARTISTS[4],
          purchasePrice: 20,
          purchasedRound: 2
        }
      ]

      const result = determineWinner(gameState)

      expect(result.isTie).toBe(true)
      expect(result.tieBreakReason).toBe('Tied on money and paintings')
      // Should pick the first one as the representative winner
      expect(['Alice', 'Bob']).toContain(result.winner.name)
    })

    it('calculates correct final scores', () => {
      const result = determineWinner(gameState)

      const aliceScore = result.finalScores.find(s => s.player.name === 'Alice')
      const bobScore = result.finalScores.find(s => s.player.name === 'Bob')
      const charlieScore = result.finalScores.find(s => s.player.name === 'Charlie')
      const dianaScore = result.finalScores.find(s => s.player.name === 'Diana')

      // Final score = money (unsold paintings have no value)
      expect(aliceScore?.totalScore).toBe(100)
      expect(aliceScore?.finalMoney).toBe(100)
      expect(aliceScore?.unsoldPaintingsValue).toBe(0)
      expect(aliceScore?.paintingsOwned).toBe(2)

      expect(bobScore?.totalScore).toBe(80)
      expect(bobScore?.paintingsOwned).toBe(1)

      expect(charlieScore?.totalScore).toBe(60)
      expect(charlieScore?.paintingsOwned).toBe(0)

      expect(dianaScore?.totalScore).toBe(40)
      expect(dianaScore?.paintingsOwned).toBe(0)
    })

    it('handles single player game', () => {
      const singlePlayerState = {
        ...gameState,
        players: [gameState.players[0]]
      }

      const result = determineWinner(singlePlayerState)

      expect(result.winner.name).toBe('Alice')
      expect(result.isTie).toBe(false)
      expect(result.finalScores).toHaveLength(1)
    })

    it('counts total cards played correctly', () => {
      const result = determineWinner(gameState)

      expect(result.totalCardsPlayed).toBe(6) // 3 + 2 + 1 + 0 + 0
    })

    it('handles player with undefined purchases', () => {
      gameState.players = [
        {
          id: 'p1',
          name: 'Alice',
          money: 100,
          isAI: false,
          hand: [],
          purchasedThisRound: [],
          purchases: undefined
        }
      ]

      const result = determineWinner(gameState)

      expect(result.winner.name).toBe('Alice')
      expect(result.finalScores[0].paintingsOwned).toBe(0)
    })

    it('sorts final scores correctly', () => {
      const result = determineWinner(gameState)

      expect(result.finalScores[0].player.name).toBe('Eve') // 120
      expect(result.finalScores[1].player.name).toBe('Alice') // 100
      expect(result.finalScores[2].player.name).toBe('Bob') // 80
      expect(result.finalScores[3].player.name).toBe('Charlie') // 60
      expect(result.finalScores[4].player.name).toBe('Diana') // 40
    })
  })

  describe('getGameSummary', () => {
    it('provides comprehensive game summary', () => {
      const summary = getGameSummary(gameState)

      expect(summary.roundsPlayed).toBe(3)
      expect(summary.moneyDistribution.total).toBe(400) // Sum of all money
      expect(summary.moneyDistribution.average).toBe(80) // 400 / 5
      expect(summary.moneyDistribution.min).toBe(40)
      expect(summary.moneyDistribution.max).toBe(120)
      expect(summary.eventCount).toBe(2)
      expect(summary.cardsPlayedThisRound).toEqual(gameState.round.cardsPlayedPerArtist)
    })

    it('includes sale earnings for all players', () => {
      const summary = getGameSummary(gameState)

      expect(summary.saleEarnings).toHaveLength(5)
      expect(summary.saleEarnings[0].playerId).toBe('p1')
      expect(summary.saleEarnings[0].playerName).toBe('Alice')
      // Should include painting count and earnings
    })

    it('calculates total painting value', () => {
      const summary = getGameSummary(gameState)

      // Value based on current round rankings
      expect(summary.totalPaintingValue).toBeGreaterThan(0)
    })

    it('handles empty event log', () => {
      gameState.eventLog = []

      const summary = getGameSummary(gameState)

      expect(summary.eventCount).toBe(0)
    })
  })

  describe('getPlayerFinalStats', () => {
    it('returns comprehensive player stats', () => {
      const stats = getPlayerFinalStats(gameState, 'p1')

      expect(stats?.player.name).toBe('Alice')
      expect(stats?.player.id).toBe('p1')
      expect(stats?.player.isAI).toBe(false)
      expect(stats?.finalMoney).toBe(100)
      expect(stats?.paintingsOwned).toBe(2)
      expect(stats?.saleEarnings).toBe(90) // 2 paintings: ARTISTS[0] (cumulative 60) + ARTISTS[1] (cumulative 30)
      expect(stats?.finalScore).toBe(100)
    })

    it('handles AI player', () => {
      const stats = getPlayerFinalStats(gameState, 'p5')

      expect(stats?.player.name).toBe('Eve')
      expect(stats?.player.isAI).toBe(true)
    })

    it('returns null for non-existent player', () => {
      const stats = getPlayerFinalStats(gameState, 'nonexistent')

      expect(stats).toBeNull()
    })

    it('calculates artist breakdown correctly', () => {
      const stats = getPlayerFinalStats(gameState, 'p1')

      expect(stats?.artistBreakdown[ARTISTS[0]]).toBe(1)
      expect(stats?.artistBreakdown[ARTISTS[1]]).toBe(1)
      expect(stats?.artistBreakdown[ARTISTS[2]]).toBeUndefined()
    })

    it('handles player with no paintings', () => {
      const stats = getPlayerFinalStats(gameState, 'p3')

      expect(stats?.paintingsOwned).toBe(0)
      expect(stats?.artistBreakdown).toEqual({})
      expect(stats?.saleEarnings).toBe(0)
    })

    it('handles player with undefined purchases', () => {
      const stats = getPlayerFinalStats(gameState, 'p4')

      expect(stats?.paintingsOwned).toBe(0)
      expect(stats?.artistBreakdown).toEqual({})
    })
  })

  describe('checkEarlyEndConditions', () => {
    it('detects all players bankrupt', () => {
      gameState.players.forEach(player => {
        player.money = 0
      })

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(true)
      expect(result.reason).toBe('All players bankrupt')
    })

    it('detects single player with money', () => {
      gameState.players[0].money = 50
      gameState.players[1].money = 0
      gameState.players[2].money = 0
      gameState.players[3].money = 0
      gameState.players[4].money = 0

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(true)
      expect(result.reason).toBe('Alice is the only player with money')
    })

    it('detects empty deck and hands before round 4', () => {
      gameState.round.roundNumber = 2
      gameState.deck = []
      gameState.players.forEach(player => {
        player.hand = []
      })

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(true)
      expect(result.reason).toBe('No cards remaining in deck or player hands')
    })

    it('does not end game if deck empty but round 4', () => {
      gameState.round.roundNumber = 4
      gameState.deck = []
      gameState.players.forEach(player => {
        player.hand = []
      })

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('does not end game in normal conditions', () => {
      gameState.deck = [mockCard]
      gameState.players[0].hand = [mockCard]

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('handles players with negative money', () => {
      gameState.players[0].money = -10
      gameState.players[1].money = -20
      gameState.players[2].money = 50
      gameState.players[3].money = 30
      gameState.players[4].money = 10
      gameState.deck = [mockCard] // Add cards to deck to prevent early end

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(false) // 3 players still have money (> 0)
    })

    it('detects money as greater than 0', () => {
      gameState.players[0].money = 0.01
      gameState.players[1].money = 0
      gameState.players[2].money = 0
      gameState.players[3].money = 0
      gameState.players[4].money = 0

      const result = checkEarlyEndConditions(gameState)

      expect(result.shouldEnd).toBe(true) // Only Alice has money, even if just 0.01
    })
  })

  describe('getPlayerRankings', () => {
    it('ranks players by money descending', () => {
      const rankings = getPlayerRankings(gameState)

      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].player.name).toBe('Eve')
      expect(rankings[0].score).toBe(120)
      expect(rankings[0].isTied).toBe(false)

      expect(rankings[1].rank).toBe(2)
      expect(rankings[1].player.name).toBe('Alice')
      expect(rankings[1].score).toBe(100)

      expect(rankings[2].rank).toBe(3)
      expect(rankings[2].player.name).toBe('Bob')
      expect(rankings[2].score).toBe(80)

      expect(rankings[3].rank).toBe(4)
      expect(rankings[3].player.name).toBe('Charlie')
      expect(rankings[3].score).toBe(60)

      expect(rankings[4].rank).toBe(5)
      expect(rankings[4].player.name).toBe('Diana')
      expect(rankings[4].score).toBe(40)
    })

    it('handles tied rankings correctly', () => {
      gameState.players[0].money = 100
      gameState.players[1].money = 100
      gameState.players[4].money = 90 // Update Eve to not interfere

      const rankings = getPlayerRankings(gameState)

      // Both Alice and Bob should be rank 1
      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].player.name).toBe('Alice')
      expect(rankings[0].score).toBe(100)
      expect(rankings[0].isTied).toBe(true) // Tied with Bob (next score)

      expect(rankings[1].rank).toBe(1)
      expect(rankings[1].player.name).toBe('Bob')
      expect(rankings[1].score).toBe(100)
      expect(rankings[1].isTied).toBe(false) // Not tied with Charlie (next score is 60)

      // Eve should be rank 3 (after the tied players)
      expect(rankings[2].rank).toBe(3)
      expect(rankings[2].player.name).toBe('Eve')
      expect(rankings[2].isTied).toBe(false)
      expect(rankings[2].score).toBe(90)
    })

    it('handles multiple ties', () => {
      gameState.players[0].money = 80
      gameState.players[1].money = 80
      gameState.players[2].money = 80
      gameState.players[4].money = 70 // Update Eve to not interfere

      const rankings = getPlayerRankings(gameState)

      // First three should all be rank 1
      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].isTied).toBe(true) // Tied with next two
      expect(rankings[1].rank).toBe(1)
      expect(rankings[1].isTied).toBe(true) // Tied with next one
      expect(rankings[2].rank).toBe(1)
      expect(rankings[2].isTied).toBe(false) // Not tied with Diana (next score)

      // Next should be rank 4
      expect(rankings[3].rank).toBe(4)
    })

    it('handles single player', () => {
      const singlePlayerState = {
        ...gameState,
        players: [gameState.players[0]]
      }

      const rankings = getPlayerRankings(singlePlayerState)

      expect(rankings).toHaveLength(1)
      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].player.name).toBe('Alice')
      expect(rankings[0].isTied).toBe(false)
    })

    it('handles all players tied', () => {
      gameState.players.forEach((player, index) => {
        player.money = 100
        // Keep consistent ordering - Eve is at index 4
        if (index === 4) {
          player.money = 100 // Ensure Eve also has 100
        }
      })

      const rankings = getPlayerRankings(gameState)

      rankings.forEach((ranking, index) => {
        expect(ranking.rank).toBe(1)
        expect(ranking.score).toBe(100)
        // Only the first 4 players are tied with someone below them
        if (index < 4) {
          expect(ranking.isTied).toBe(true)
        } else {
          expect(ranking.isTied).toBe(false) // Last player has no one to tie with
        }
      })
    })
  })

  describe('getGameStatistics', () => {
    it('provides comprehensive game statistics', () => {
      const stats = getGameStatistics(gameState)

      expect(stats.winner.name).toBe('Eve')
      expect(stats.winningScore).toBe(120)
      expect(stats.isTie).toBe(false)
      expect(stats.playerCount).toBe(5)
      expect(stats.roundsPlayed).toBe(3)
      expect(stats.totalMoneyInGame).toBe(400)
      expect(stats.averageMoney).toBe(80)
      expect(stats.moneyGap).toBe(80) // 120 - 40
      expect(stats.rankings).toHaveLength(5)
      expect(stats.artistStats).toEqual(gameState.round.cardsPlayedPerArtist)
    })

    it('includes rankings in statistics', () => {
      const stats = getGameStatistics(gameState)

      expect(stats.rankings[0].rank).toBe(1)
      expect(stats.rankings[0].player.name).toBe('Eve')
      expect(stats.rankings[0].score).toBe(120)
    })

    it('detects tie in statistics', () => {
      gameState.players[0].money = 100
      gameState.players[1].money = 100
      gameState.players[4].money = 90 // Update Eve to not interfere

      const stats = getGameStatistics(gameState)

      expect(stats.winner.name).toBe('Alice') // First in alphabetical order among tied
      expect(stats.isTie).toBe(true)
    })

    it('handles game with zero money gap', () => {
      gameState.players.forEach(player => {
        player.money = 80
      })

      const stats = getGameStatistics(gameState)

      expect(stats.moneyGap).toBe(0)
      expect(stats.averageMoney).toBe(80)
    })

    it('handles game with bankrupt players', () => {
      gameState.players[2].money = 0
      gameState.players[3].money = 0
      // Keep Eve with 120 to have bankrupt players mixed with wealthy players

      const stats = getGameStatistics(gameState)

      expect(stats.min).toBe(0)
      expect(stats.max).toBe(120) // Eve still has 120
      expect(stats.moneyGap).toBe(120)
    })
  })

  describe('Complex Endgame Scenarios', () => {
    it('simulates complete economic victory', () => {
      // One player with massive money lead
      gameState.players[0].money = 300
      gameState.players[1].money = 50
      gameState.players[2].money = 25
      gameState.players[3].money = 10
      gameState.players[4].money = 5

      const result = determineWinner(gameState)
      const stats = getGameStatistics(gameState)

      expect(result.winner.name).toBe('Alice')
      expect(result.winner.money).toBe(300)
      expect(stats.moneyGap).toBe(295)
      expect(stats.averageMoney).toBe(78)
    })

    it('simulates comeback victory scenario', () => {
      // Player who was behind wins
      gameState.players[0].money = 30
      gameState.players[1].money = 40
      gameState.players[2].money = 200 // Charlie wins
      gameState.players[3].money = 35
      gameState.players[4].money = 25

      const result = determineWinner(gameState)

      expect(result.winner.name).toBe('Charlie')
      expect(result.finalScores[0].player.name).toBe('Charlie') // After sorting, Charlie should be first
      expect(result.finalScores[0].totalScore).toBe(200)
    })

    it('handles bankruptcy cascade', () => {
      gameState.players[0].money = 0
      gameState.players[1].money = 0
      gameState.players[2].money = 0
      gameState.players[3].money = 0
      gameState.players[4].money = 0

      const earlyEnd = checkEarlyEndConditions(gameState)
      const result = determineWinner(gameState)

      expect(earlyEnd.shouldEnd).toBe(true)
      expect(earlyEnd.reason).toBe('All players bankrupt')
      expect(result.finalScores.every(s => s.totalScore === 0)).toBe(true)
    })

    it('simulates multi-round economic progression', () => {
      gameState.round.roundNumber = 4
      gameState.players[0].money = 150
      gameState.players[1].money = 125
      gameState.players[2].money = 100
      gameState.players[3].money = 75
      gameState.players[4].money = 50

      const summary = getGameSummary(gameState)
      const stats = getGameStatistics(gameState)

      expect(summary.roundsPlayed).toBe(4)
      expect(stats.roundsPlayed).toBe(4)
      expect(summary.moneyDistribution.total).toBe(500)
      expect(summary.moneyDistribution.average).toBe(100)
    })
  })
})