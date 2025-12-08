import { describe, it, expect, beforeEach } from 'vitest'
import {
  sellPlayerPaintingsToBank,
  sellAllPaintingsToBank,
  getPlayerSellablePaintings,
  calculatePlayerSaleEarnings,
  hasSellablePaintings,
  getAllPlayersSaleEarnings,
  getTotalPaintingValue,
  getPaintingDistribution,
  getPlayersMostValuableArtist
} from '../../selling'
import type { GameState, Painting, Card } from '../../../types/game'
import { ARTISTS } from '../../constants'

describe('Selling Module', () => {
  let gameState: GameState
  let mockCard: Card

  beforeEach(() => {
    mockCard = {
      id: 'test_card_1',
      artist: ARTISTS[0], // 'Manuel Carvalho'
      auctionType: 'open',
      artworkId: 'test_art_1'
    }

    gameState = {
      players: [
        {
          id: 'p1',
          name: 'Alice',
          money: 100,
          color: '#ff0000',
          purchases: [
            {
              card: mockCard,
              artist: ARTISTS[0],
              purchasePrice: 30,
              purchasedRound: 1
            },
            {
              card: { ...mockCard, id: 'test_card_2', artist: ARTISTS[1] },
              artist: ARTISTS[1], // 'Sigrid Thaler'
              purchasePrice: 20,
              purchasedRound: 1
            }
          ]
        },
        {
          id: 'p2',
          name: 'Bob',
          money: 60,
          color: '#00ff00',
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
          money: 30,
          color: '#0000ff',
          purchases: [] // No paintings
        },
        {
          id: 'p4',
          name: 'Diana',
          money: 0,
          color: '#ffff00',
          purchases: undefined // undefined purchases
        }
      ],
      round: {
        roundNumber: 2, // End of round 2, values are being calculated
        phase: {
          type: 'selling_to_bank',
          results: [
            { artist: ARTISTS[0], cardCount: 3, rank: 1, value: 30 }, // #1 artist
            { artist: ARTISTS[1], cardCount: 2, rank: 2, value: 20 }, // #2 artist
            { artist: ARTISTS[2], cardCount: 1, rank: 3, value: 10 }, // #3 artist
            { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },  // #4 artist
            { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }   // #5 artist
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
          [ARTISTS[0]]: [10, 20, 30, 40], // Round 1-4 values
          [ARTISTS[1]]: [0, 10, 20, 30],
          [ARTISTS[2]]: [0, 0, 10, 20],
          [ARTISTS[3]]: [0, 0, 0, 0],
          [ARTISTS[4]]: [0, 0, 0, 0]
        }
      },
      discardPile: [],
      eventLog: []
    }
  })

  describe('sellPlayerPaintingsToBank', () => {
    it('sells all player paintings for correct value', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'p1')

      // Alice had 2 paintings: ARTISTS[0] (sum rounds 0-1 = 30) + ARTISTS[1] (sum rounds 0-1 = 10) = 40
      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(140) // 100 + 40
      expect(newState.players.find(p => p.id === 'p1')?.purchases).toHaveLength(0)
      expect(newState.discardPile).toHaveLength(2)
    })

    it('adds bank sale event to event log', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'p1')

      const lastEvent = newState.eventLog[newState.eventLog.length - 1]
      expect(lastEvent.type).toBe('bank_sale')
      expect(lastEvent.playerId).toBe('p1')
      expect(lastEvent.totalSaleValue).toBe(40)
      expect(lastEvent.paintingCount).toBe(2)
    })

    it('handles player with no paintings', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'p3')

      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(30) // unchanged
      expect(newState.eventLog).toHaveLength(0) // No event added
    })

    it('handles player with undefined purchases', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'p4')

      expect(newState.players.find(p => p.id === 'p4')?.money).toBe(0) // unchanged
      expect(newState.eventLog).toHaveLength(0) // No event added
    })

    it('handles non-existent player', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'nonexistent')

      // No changes to any player
      expect(newState.players[0].money).toBe(100)
      expect(newState.players[1].money).toBe(60)
      expect(newState.players[2].money).toBe(30)
      expect(newState.players[3].money).toBe(0)
    })

    it('marks paintings with sale info', () => {
      const newState = sellPlayerPaintingsToBank(gameState, 'p1')

      const lastEvent = newState.eventLog[newState.eventLog.length - 1]
      if (lastEvent.type === 'bank_sale') {
        lastEvent.paintings.forEach(painting => {
          expect(painting.salePrice).toBeGreaterThan(0)
          expect(painting.soldRound).toBe(2)
        })
      }
    })

    it('does not sell zero value paintings', () => {
      // Modify gameState to have unranked artist paintings
      gameState.players[0].purchases!.push({
        card: { ...mockCard, id: 'test_card_4', artist: ARTISTS[3] }, // #4 artist (0 value)
        artist: ARTISTS[3],
        purchasePrice: 10,
        purchasedRound: 1
      })

      const newState = sellPlayerPaintingsToBank(gameState, 'p1')

      // Should only sell the 2 valuable paintings
      const lastEvent = newState.eventLog[newState.eventLog.length - 1]
      if (lastEvent.type === 'bank_sale') {
        expect(lastEvent.totalSaleValue).toBe(40) // 30 + 10
        expect(lastEvent.paintingCount).toBe(2)
      }
    })
  })

  describe('sellAllPaintingsToBank', () => {
    it('sells paintings for all players', () => {
      const newState = sellAllPaintingsToBank(gameState)

      // Alice: 2 paintings = 40 (30 + 10)
      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(140)
      // Bob: 1 painting = 30 (ARTISTS[0])
      expect(newState.players.find(p => p.id === 'p2')?.money).toBe(90)
      // Charlie: no paintings = 0
      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(30)
      // Diana: no paintings = 0
      expect(newState.players.find(p => p.id === 'p4')?.money).toBe(0)

      expect(newState.discardPile).toHaveLength(3) // Total paintings sold
      expect(newState.eventLog).toHaveLength(2) // One event per player with paintings
    })

    it('handles game with no paintings', () => {
      const emptyGameState = {
        ...gameState,
        players: gameState.players.map(p => ({ ...p, purchases: [] }))
      }

      const newState = sellAllPaintingsToBank(emptyGameState)

      // No money changes
      expect(newState.players[0].money).toBe(100)
      expect(newState.players[1].money).toBe(60)
      expect(newState.eventLog).toHaveLength(0)
      expect(newState.discardPile).toHaveLength(0)
    })
  })

  describe('getPlayerSellablePaintings', () => {
    it('returns only paintings with value > 0', () => {
      // Add a zero value painting to Alice
      gameState.players[0].purchases!.push({
        card: { ...mockCard, id: 'test_card_4', artist: ARTISTS[4] }, // #5 artist (0 value)
        artist: ARTISTS[4],
        purchasePrice: 5,
        purchasedRound: 1
      })

      const sellable = getPlayerSellablePaintings(gameState, 'p1')

      expect(sellable).toHaveLength(2) // Only the 2 valuable paintings
      expect(sellable[0].value).toBe(30)
      expect(sellable[1].value).toBe(10)
      expect(sellable.every(s => s.value > 0)).toBe(true)
    })

    it('returns empty for player with no paintings', () => {
      const sellable = getPlayerSellablePaintings(gameState, 'p3')

      expect(sellable).toHaveLength(0)
    })

    it('returns empty for non-existent player', () => {
      const sellable = getPlayerSellablePaintings(gameState, 'nonexistent')

      expect(sellable).toHaveLength(0)
    })

    it('calculates values based on artist rankings', () => {
      const sellable = getPlayerSellablePaintings(gameState, 'p1')

      // Alice has ARTISTS[0] (#1, cumulative value 30) and ARTISTS[1] (#2, cumulative value 10)
      expect(sellable.find(s => s.painting.artist === ARTISTS[0])?.value).toBe(30)
      expect(sellable.find(s => s.painting.artist === ARTISTS[1])?.value).toBe(10)
    })
  })

  describe('calculatePlayerSaleEarnings', () => {
    it('sums all sellable painting values', () => {
      const earnings = calculatePlayerSaleEarnings(gameState, 'p1')

      expect(earnings).toBe(40) // 30 + 10
    })

    it('returns 0 for player with no paintings', () => {
      const earnings = calculatePlayerSaleEarnings(gameState, 'p3')

      expect(earnings).toBe(0)
    })

    it('returns 0 when all paintings have no value', () => {
      const lowValueState = {
        ...gameState,
        round: {
          ...gameState.round,
          phase: {
            type: 'selling_to_bank' as const,
            results: [
              { artist: ARTISTS[0], cardCount: 3, rank: null, value: 0 },
              { artist: ARTISTS[1], cardCount: 2, rank: null, value: 0 },
              { artist: ARTISTS[2], cardCount: 1, rank: null, value: 0 },
              { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },
              { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }
            ]
          }
        }
      }

      const earnings = calculatePlayerSaleEarnings(lowValueState, 'p1')

      expect(earnings).toBe(0)
    })
  })

  describe('hasSellablePaintings', () => {
    it('returns true when player has valuable paintings', () => {
      expect(hasSellablePaintings(gameState, 'p1')).toBe(true)
      expect(hasSellablePaintings(gameState, 'p2')).toBe(true)
    })

    it('returns false when player has no paintings', () => {
      expect(hasSellablePaintings(gameState, 'p3')).toBe(false)
    })

    it('returns false when all paintings have zero value', () => {
      const lowValueState = {
        ...gameState,
        round: {
          ...gameState.round,
          phase: {
            type: 'selling_to_bank' as const,
            results: [
              { artist: ARTISTS[0], cardCount: 3, rank: null, value: 0 },
              { artist: ARTISTS[1], cardCount: 2, rank: null, value: 0 },
              { artist: ARTISTS[2], cardCount: 1, rank: null, value: 0 },
              { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },
              { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }
            ]
          }
        }
      }

      expect(hasSellablePaintings(lowValueState, 'p1')).toBe(false)
    })
  })

  describe('getAllPlayersSaleEarnings', () => {
    it('returns earnings for all players', () => {
      const earnings = getAllPlayersSaleEarnings(gameState)

      expect(earnings).toHaveLength(4)
      expect(earnings.find(e => e.playerId === 'p1')).toEqual({
        playerId: 'p1',
        playerName: 'Alice',
        earnings: 40,
        paintingCount: 2
      })
      expect(earnings.find(e => e.playerId === 'p2')).toEqual({
        playerId: 'p2',
        playerName: 'Bob',
        earnings: 30,
        paintingCount: 1
      })
      expect(earnings.find(e => e.playerId === 'p3')).toEqual({
        playerId: 'p3',
        playerName: 'Charlie',
        earnings: 0,
        paintingCount: 0
      })
      expect(earnings.find(e => e.playerId === 'p4')).toEqual({
        playerId: 'p4',
        playerName: 'Diana',
        earnings: 0,
        paintingCount: 0
      })
    })
  })

  describe('getTotalPaintingValue', () => {
    it('calculates total value of all paintings', () => {
      const total = getTotalPaintingValue(gameState)

      // Alice: 30 + 10 = 40
      // Bob: 30
      expect(total).toBe(70)
    })

    it('returns 0 for game with no paintings', () => {
      const emptyState = {
        ...gameState,
        players: gameState.players.map(p => ({ ...p, purchases: [] }))
      }

      const total = getTotalPaintingValue(emptyState)

      expect(total).toBe(0)
    })
  })

  describe('getPaintingDistribution', () => {
    it('counts paintings by artist', () => {
      const distribution = getPaintingDistribution(gameState)

      expect(distribution[ARTISTS[0]]).toBe(2) // Alice has 1, Bob has 1
      expect(distribution[ARTISTS[1]]).toBe(1) // Alice has 1
      expect(distribution[ARTISTS[2]]).toBeUndefined()
      expect(distribution[ARTISTS[3]]).toBeUndefined()
      expect(distribution[ARTISTS[4]]).toBeUndefined()
    })

    it('handles empty distribution', () => {
      const emptyState = {
        ...gameState,
        players: gameState.players.map(p => ({ ...p, purchases: [] }))
      }

      const distribution = getPaintingDistribution(emptyState)

      expect(Object.keys(distribution)).toHaveLength(0)
    })
  })

  describe('getPlayersMostValuableArtist', () => {
    it('returns artist with highest total value', () => {
      const mostValuable = getPlayersMostValuableArtist(gameState, 'p1')

      // Alice has ARTISTS[0] (value 30) and ARTISTS[1] (value 10)
      expect(mostValuable).toEqual({
        artist: ARTISTS[0],
        totalValue: 30,
        paintingCount: 1
      })
    })

    it('handles tie by painting count', () => {
      // Add another ARTISTS[1] painting to Alice
      gameState.players[0].purchases!.push({
        card: { ...mockCard, id: 'test_card_4', artist: ARTISTS[1] },
        artist: ARTISTS[1],
        purchasePrice: 10,
        purchasedRound: 1
      })

      const mostValuable = getPlayersMostValuableArtist(gameState, 'p1')

      // Now Alice has:
      // ARTISTS[0]: 30 (1 painting)
      // ARTISTS[1]: 20 (2 paintings, 10 each)
      expect(mostValuable?.artist).toBe(ARTISTS[0]) // Still ARTISTS[0] with higher value
      expect(mostValuable?.totalValue).toBe(30)
      expect(mostValuable?.paintingCount).toBe(1)
    })

    it('returns null for player with no paintings', () => {
      const mostValuable = getPlayersMostValuableArtist(gameState, 'p3')

      expect(mostValuable).toBeNull()
    })

    it('returns null for non-existent player', () => {
      const mostValuable = getPlayersMostValuableArtist(gameState, 'nonexistent')

      expect(mostValuable).toBeNull()
    })
  })

  describe('Complex Game Scenarios', () => {
    it('handles selling after multiple rounds with changing values', () => {
      // Simulate later round with different rankings
      const lateGameState = {
        ...gameState,
        round: {
          ...gameState.round,
          roundNumber: 4,
          phase: {
            type: 'selling_to_bank' as const,
            results: [
              { artist: ARTISTS[1], cardCount: 4, rank: 1, value: 30 }, // ARTISTS[1] now #1
              { artist: ARTISTS[0], cardCount: 3, rank: 2, value: 20 }, // ARTISTS[0] now #2
              { artist: ARTISTS[2], cardCount: 2, rank: 3, value: 10 },
              { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },
              { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }
            ]
          }
        },
        board: {
          artistValues: {
            [ARTISTS[0]]: [10, 20, 30, 20], // ARTISTS[0] value decreased
            [ARTISTS[1]]: [0, 10, 20, 30], // ARTISTS[1] value increased
            [ARTISTS[2]]: [0, 0, 10, 20],
            [ARTISTS[3]]: [0, 0, 0, 0],
            [ARTISTS[4]]: [0, 0, 0, 0]
          }
        }
      }

      const earnings = calculatePlayerSaleEarnings(lateGameState, 'p1')

      // Alice's values changed: ARTISTS[0] now 80 (10+20+30+20), ARTISTS[1] now 60 (0+10+20+30)
      expect(earnings).toBe(140) // Total increased
    })

    it('simulates complete selling phase', () => {
      const newState = sellAllPaintingsToBank(gameState)

      // Verify all paintings are sold
      expect(newState.players.every(p => !p.purchases || p.purchases.length === 0)).toBe(true)

      // Verify total money increased by painting values
      const totalMoney = newState.players.reduce((sum, p) => sum + p.money, 0)
      expect(totalMoney).toBe(260) // Original 190 + painting values 70
    })
  })
})