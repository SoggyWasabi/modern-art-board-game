import { describe, it, expect, beforeEach } from 'vitest'
import {
  transferMoney,
  payToBank,
  receiveFromBank,
  processAuctionPayment,
  processBankSale,
  canAfford,
  getMaxBid,
  getPlayerMoney,
  getPlayersByMoney,
  hasBankruptPlayer,
  getPlayersWhoCannotAfford,
  getTotalMoney,
  getMoneyStats
} from '../../money'
import type { Player, GameState, AuctionResult } from '../../../types/game'

describe('Money Module', () => {
  let players: Player[]
  let gameState: GameState

  beforeEach(() => {
    players = [
      { id: 'p1', name: 'Alice', money: 100, color: '#ff0000' },
      { id: 'p2', name: 'Bob', money: 60, color: '#00ff00' },
      { id: 'p3', name: 'Charlie', money: 30, color: '#0000ff' },
      { id: 'p4', name: 'Diana', money: 0, color: '#ffff00' }
    ]

    gameState = {
      players,
      round: {
        roundNumber: 1,
        phase: { type: 'awaiting_card_play', results: [] },
        auctioneerIndex: 0,
        cardsPlayedPerArtist: {}
      },
      board: {},
      discardPile: [],
      eventLog: []
    }
  })

  describe('transferMoney', () => {
    it('transfers money between players correctly', () => {
      const newPlayers = transferMoney('p1', 'p2', 30, players)

      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(70)
      expect(newPlayers.find(p => p.id === 'p2')?.money).toBe(90)
      expect(newPlayers.find(p => p.id === 'p3')?.money).toBe(30)
      expect(newPlayers.find(p => p.id === 'p4')?.money).toBe(0)
    })

    it('preserves total money in system', () => {
      const initialTotal = players.reduce((sum, p) => sum + p.money, 0)
      const newPlayers = transferMoney('p1', 'p2', 30, players)
      const finalTotal = newPlayers.reduce((sum, p) => sum + p.money, 0)

      expect(initialTotal).toBe(finalTotal)
    })

    it('throws error for negative amount', () => {
      expect(() => transferMoney('p1', 'p2', -10, players))
        .toThrow('Transfer amount must be positive')
    })

    it('handles zero amount (no transfer)', () => {
      const newPlayers = transferMoney('p1', 'p2', 0, players)

      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(100)
      expect(newPlayers.find(p => p.id === 'p2')?.money).toBe(60)
    })

    it('throws error when sender has insufficient funds', () => {
      expect(() => transferMoney('p3', 'p1', 40, players))
        .toThrow("Player Charlie doesn't have enough money (30 < 40)")
    })

    it('throws error when sender is bankrupt', () => {
      expect(() => transferMoney('p4', 'p1', 1, players))
        .toThrow("Player Diana doesn't have enough money (0 < 1)")
    })

    it('handles transfer to same player (no change)', () => {
      const newPlayers = transferMoney('p1', 'p1', 30, players)

      // When transferring to same player, there should be no change
      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(100) // unchanged
    })

    it('handles non-existent player IDs gracefully', () => {
      const newPlayers = transferMoney('p1', 'nonexistent', 30, players)

      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(70)
      expect(newPlayers.find(p => p.id === 'nonexistent')).toBeUndefined()
    })

    it('transfers exact remaining amount', () => {
      const newPlayers = transferMoney('p3', 'p1', 30, players)

      expect(newPlayers.find(p => p.id === 'p3')?.money).toBe(0)
      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(130)
    })
  })

  describe('payToBank', () => {
    it('deducts money from player', () => {
      const newPlayers = payToBank('p1', 40, players)

      expect(newPlayers.find(p => p.id === 'p1')?.money).toBe(60)
      expect(newPlayers.find(p => p.id === 'p2')?.money).toBe(60) // unchanged
    })

    it('throws error for negative amount', () => {
      expect(() => payToBank('p1', -10, players))
        .toThrow('Payment amount must be positive')
    })

    it('throws error when player lacks funds', () => {
      expect(() => payToBank('p3', 40, players))
        .toThrow("Player Charlie doesn't have enough money to pay bank (30 < 40)")
    })

    it('handles exact amount payment', () => {
      const newPlayers = payToBank('p3', 30, players)

      expect(newPlayers.find(p => p.id === 'p3')?.money).toBe(0)
    })
  })

  describe('receiveFromBank', () => {
    it('adds money to player', () => {
      const newPlayers = receiveFromBank('p2', 25, players)

      expect(newPlayers.find(p => p.id === 'p2')?.money).toBe(85)
    })

    it('throws error for negative amount', () => {
      expect(() => receiveFromBank('p1', -10, players))
        .toThrow('Received amount must be positive')
    })

    it('gives money to bankrupt player', () => {
      const newPlayers = receiveFromBank('p4', 50, players)

      expect(newPlayers.find(p => p.id === 'p4')?.money).toBe(50)
    })
  })

  describe('processAuctionPayment', () => {
    it('winner pays auctioneer directly (player-to-player transfer)', () => {
      const auctionResult: AuctionResult = {
        winnerId: 'p2',
        salePrice: 30,
        profit: 30,
        auctioneerId: 'p1'
      }

      const newState = processAuctionPayment(gameState, auctionResult)

      // Winner (Bob) pays auctioneer (Alice) directly
      expect(newState.players.find(p => p.id === 'p2')?.money).toBe(30) // 60 - 30
      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(130) // 100 + 30
      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(30) // unchanged

      // Total money should be conserved
      const totalBefore = players.reduce((sum, p) => sum + p.money, 0)
      const totalAfter = newState.players.reduce((sum, p) => sum + p.money, 0)
      expect(totalAfter).toBe(totalBefore)
    })

    it('auctioneer wins own auction (pays bank)', () => {
      const auctionResult: AuctionResult = {
        winnerId: 'p1',
        salePrice: 30,
        profit: 0,
        auctioneerId: 'p1'
      }

      const newState = processAuctionPayment(gameState, auctionResult)

      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(70) // 100 - 30
    })

    it('handles free auction (0 sale price)', () => {
      const auctionResult: AuctionResult = {
        winnerId: 'p3',
        salePrice: 0,
        profit: 0,
        auctioneerId: 'p1'
      }

      const newState = processAuctionPayment(gameState, auctionResult)

      // No money changes hands
      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(100)
      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(30)
    })

    it('preserves total money in system', () => {
      const initialTotal = getTotalMoney(gameState)
      const auctionResult: AuctionResult = {
        winnerId: 'p2',
        salePrice: 30,
        profit: 30,
        auctioneerId: 'p1'
      }

      const newState = processAuctionPayment(gameState, auctionResult)
      const finalTotal = getTotalMoney(newState)

      expect(initialTotal).toBe(finalTotal)
    })
  })

  describe('processBankSale', () => {
    it('pays player for paintings', () => {
      const newState = processBankSale(gameState, 'p3', 45)

      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(75) // 30 + 45
      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(100) // unchanged
    })

    it('handles zero value sale', () => {
      const newState = processBankSale(gameState, 'p2', 0)

      expect(newState.players.find(p => p.id === 'p2')?.money).toBe(60) // unchanged
    })
  })

  describe('canAfford', () => {
    it('returns true when player has enough money', () => {
      expect(canAfford(players[0], 50)).toBe(true) // 100 >= 50
      expect(canAfford(players[1], 60)).toBe(true) // 60 >= 60
    })

    it('returns false when player lacks funds', () => {
      expect(canAfford(players[2], 40)).toBe(false) // 30 < 40
      expect(canAfford(players[3], 1)).toBe(false) // 0 < 1
    })

    it('handles edge case exact amount', () => {
      expect(canAfford(players[1], 60)).toBe(true) // Exactly equal
    })
  })

  describe('getMaxBid', () => {
    it('returns players current money', () => {
      expect(getMaxBid(players[0])).toBe(100)
      expect(getMaxBid(players[1])).toBe(60)
      expect(getMaxBid(players[2])).toBe(30)
      expect(getMaxBid(players[3])).toBe(0)
    })
  })

  describe('getPlayerMoney', () => {
    it('returns correct money for existing player', () => {
      expect(getPlayerMoney(gameState, 'p1')).toBe(100)
      expect(getPlayerMoney(gameState, 'p2')).toBe(60)
      expect(getPlayerMoney(gameState, 'p3')).toBe(30)
      expect(getPlayerMoney(gameState, 'p4')).toBe(0)
    })

    it('returns 0 for non-existent player', () => {
      expect(getPlayerMoney(gameState, 'nonexistent')).toBe(0)
    })
  })

  describe('getPlayersByMoney', () => {
    it('sorts players by money descending', () => {
      const sorted = getPlayersByMoney(gameState)

      expect(sorted[0].name).toBe('Alice') // 100
      expect(sorted[1].name).toBe('Bob')   // 60
      expect(sorted[2].name).toBe('Charlie') // 30
      expect(sorted[3].name).toBe('Diana')  // 0
    })

    it('handles ties correctly', () => {
      gameState.players[1].money = 100 // Bob now has 100

      const sorted = getPlayersByMoney(gameState)

      // Alice and Bob should both be at top (order may vary)
      expect(sorted[0].money).toBe(100)
      expect(sorted[1].money).toBe(100)
      expect(sorted[2].money).toBe(30)
    })

    it('does not modify original array', () => {
      const sorted = getPlayersByMoney(gameState)

      expect(gameState.players[0].name).toBe('Alice')
      expect(sorted[0].name).toBe('Alice')
    })
  })

  describe('hasBankruptPlayer', () => {
    it('detects bankrupt players (money <= 0)', () => {
      expect(hasBankruptPlayer(gameState)).toBe(true) // Diana has 0
    })

    it('returns false when no bankrupt players', () => {
      gameState.players[3].money = 10 // Diana now has 10

      expect(hasBankruptPlayer(gameState)).toBe(false)
    })

    it('detects negative money', () => {
      gameState.players[3].money = -5

      expect(hasBankruptPlayer(gameState)).toBe(true)
    })
  })

  describe('getPlayersWhoCannotAfford', () => {
    it('returns players with insufficient money', () => {
      const cannotAfford = getPlayersWhoCannotAfford(gameState, 40)

      expect(cannotAfford).toHaveLength(2)
      expect(cannotAfford.map(p => p.name)).toContain('Charlie')
      expect(cannotAfford.map(p => p.name)).toContain('Diana')
    })

    it('returns empty when all can afford', () => {
      const cannotAfford = getPlayersWhoCannotAfford(gameState, 20)

      expect(cannotAfford).toHaveLength(1) // Only Diana can't afford
    })

    it('handles edge case exact amount', () => {
      const cannotAfford = getPlayersWhoCannotAfford(gameState, 60)

      expect(cannotAfford).toHaveLength(2)
      expect(cannotAfford.map(p => p.name)).toContain('Charlie')
      expect(cannotAfford.map(p => p.name)).toContain('Diana')
      // Bob can afford exactly 60
    })
  })

  describe('getTotalMoney', () => {
    it('calculates sum of all player money', () => {
      expect(getTotalMoney(gameState)).toBe(190) // 100 + 60 + 30 + 0
    })

    it('handles empty player list', () => {
      expect(getTotalMoney({ ...gameState, players: [] })).toBe(0)
    })
  })

  describe('getMoneyStats', () => {
    it('calculates correct statistics', () => {
      const stats = getMoneyStats(gameState)

      expect(stats.total).toBe(190)
      expect(stats.average).toBe(47.5) // 190 / 4
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(100)
    })

    it('calculates percentage distribution', () => {
      const stats = getMoneyStats(gameState)

      expect(stats.distribution).toHaveLength(4)
      expect(stats.distribution.find(d => d.id === 'p1')?.percentage).toBeCloseTo(52.63, 1)
      expect(stats.distribution.find(d => d.id === 'p2')?.percentage).toBeCloseTo(31.58, 1)
      expect(stats.distribution.find(d => d.id === 'p3')?.percentage).toBeCloseTo(15.79, 1)
      expect(stats.distribution.find(d => d.id === 'p4')?.percentage).toBeCloseTo(0, 1)
    })

    it('handles single player', () => {
      const singlePlayerState = { ...gameState, players: [players[0]] }
      const stats = getMoneyStats(singlePlayerState)

      expect(stats.total).toBe(100)
      expect(stats.average).toBe(100)
      expect(stats.min).toBe(100)
      expect(stats.max).toBe(100)
      expect(stats.distribution[0].percentage).toBe(100)
    })
  })

  describe('Complex Game Scenarios', () => {
    it('handles multiple sequential transfers', () => {
      let currentPlayers = players

      // Alice pays Charlie 30
      currentPlayers = transferMoney('p1', 'p3', 30, currentPlayers)
      expect(currentPlayers.find(p => p.id === 'p1')?.money).toBe(70)
      expect(currentPlayers.find(p => p.id === 'p3')?.money).toBe(60)

      // Charlie pays Bob 20
      currentPlayers = transferMoney('p3', 'p2', 20, currentPlayers)
      expect(currentPlayers.find(p => p.id === 'p3')?.money).toBe(40)
      expect(currentPlayers.find(p => p.id === 'p2')?.money).toBe(80)

      // Total should still be 190
      const total = currentPlayers.reduce((sum, p) => sum + p.money, 0)
      expect(total).toBe(190)
    })

    it('simulates auction with bankruptcy', () => {
      // Charlie tries to bid 40 but only has 30
      expect(() => transferMoney('p3', 'p1', 40, players))
        .toThrow("Player Charlie doesn't have enough money")
    })

    it('handles money flow in complete auction cycle', () => {
      // Auction: Alice is auctioneer, Bob wins for 30
      const auctionResult: AuctionResult = {
        winnerId: 'p2',
        salePrice: 30,
        profit: 30,
        auctioneerId: 'p1'
      }

      let newState = processAuctionPayment(gameState, auctionResult)

      // Bob sells a painting to bank for 20
      newState = processBankSale(newState, 'p2', 20)

      expect(newState.players.find(p => p.id === 'p1')?.money).toBe(130) // +30 from auction
      expect(newState.players.find(p => p.id === 'p2')?.money).toBe(50)  // -30 +20
      expect(newState.players.find(p => p.id === 'p3')?.money).toBe(30)  // unchanged
      expect(newState.players.find(p => p.id === 'p4')?.money).toBe(0)   // unchanged

      // Total money conserved
      expect(getTotalMoney(newState)).toBe(210) // 190 + 20 from bank
    })
  })
})