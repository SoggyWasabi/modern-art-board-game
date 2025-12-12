import { describe, it, expect, beforeEach } from 'vitest'
import { createFixedPriceAuction, buyAtPrice, pass, concludeAuction, getCurrentPlayer, isPlayerTurn, canPlayerBuy } from '../../../auction/fixedPrice'
import type { FixedPriceAuctionState } from '../../../../types/auction'
import { ARTISTS } from '../../../constants'
import type { Player, Card } from '../../../../types/game'

describe('Fixed Price Auction', () => {
  let auction: FixedPriceAuctionState
  let players: Player[]
  let testCard: Card

  beforeEach(() => {
    players = [
      { id: '1', name: 'Alice', money: 100, hand: [], purchases: [], purchasedThisRound: [] },
      { id: '2', name: 'Bob', money: 80, hand: [], purchases: [], purchasedThisRound: [] },
      { id: '3', name: 'Carol', money: 60, hand: [], purchases: [], purchasedThisRound: [] },
      { id: '4', name: 'Dave', money: 40, hand: [], purchases: [], purchasedThisRound: [] }
    ]

    testCard = {
      id: 'card-1',
      artist: ARTISTS[2],
      auctionType: 'fixed_price' as const,
      artworkId: 'daniel_melim_fixed_1'
    }

    // Price is set during creation (30 in this case)
    auction = createFixedPriceAuction(testCard, players[0], players, 30)
  })

  describe('createFixedPriceAuction', () => {
    it('creates initial fixed price auction state', () => {
      expect(auction.type).toBe('fixed_price')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.price).toBe(30)
      expect(auction.sold).toBe(false)
      expect(auction.winnerId).toBeNull()
      // Turn order is clockwise from auctioneer, excluding auctioneer
      expect(auction.turnOrder).toEqual(['2', '3', '4'])
      expect(auction.currentTurnIndex).toBe(0) // Start with player 2
    })

    it('sets price during creation', () => {
      const auctionWithPrice = createFixedPriceAuction(testCard, players[0], players, 50)
      expect(auctionWithPrice.price).toBe(50)
    })

    it('requires price to be non-negative', () => {
      expect(() => createFixedPriceAuction(testCard, players[0], players, -5))
        .toThrow('Price cannot be negative')
    })

    it('requires auctioneer to be able to afford their own price', () => {
      // Auctioneer (player 1) has $100, can't set price above that
      expect(() => createFixedPriceAuction(testCard, players[0], players, 150))
        .toThrow('Auctioneer only has 100, cannot set price 150')
    })

    it('allows zero price (free offer)', () => {
      const freeAuction = createFixedPriceAuction(testCard, players[0], players, 0)
      expect(freeAuction.price).toBe(0)
    })
  })

  describe('buyAtPrice', () => {
    it('allows current player to buy at fixed price', () => {
      // Player 2 is first in turn order
      const result = buyAtPrice(auction, '2', players)

      expect(result.sold).toBe(true)
      expect(result.winnerId).toBe('2')
      expect(result.isActive).toBe(false)
    })

    it('requires it to be the player turn', () => {
      // Player 3 is not first in turn order
      expect(() => buyAtPrice(auction, '3', players))
        .toThrow("Not this player's turn")
    })

    it('requires buyer to have enough money', () => {
      // Create auction with price higher than player 2 can afford
      const expensiveAuction = createFixedPriceAuction(testCard, players[0], players, 90)

      expect(() => buyAtPrice(expensiveAuction, '2', players))
        .toThrow('Player only has 80, cannot pay 90')
    })

    it('prevents buying after auction sold', () => {
      const sold = buyAtPrice(auction, '2', players)

      expect(() => buyAtPrice(sold, '3', players))
        .toThrow('Cannot buy from inactive or sold auction')
    })

    it('prevents buying when auction not active', () => {
      const inactive = { ...auction, isActive: false }

      expect(() => buyAtPrice(inactive, '2', players))
        .toThrow('Cannot buy from inactive or sold auction')
    })
  })

  describe('pass', () => {
    it('allows current player to pass', () => {
      const result = pass(auction, '2')

      expect(result.currentTurnIndex).toBe(1) // Moved to next player
      expect(result.passedPlayers.has('2')).toBe(true)
      expect(result.sold).toBe(false)
    })

    it('requires it to be the player turn', () => {
      expect(() => pass(auction, '3'))
        .toThrow("Not this player's turn")
    })

    it('prevents passing twice', () => {
      const afterPass = pass(auction, '2')

      // After passing, it's no longer player 2's turn
      expect(() => pass(afterPass, '2'))
        .toThrow("Not this player's turn")
    })

    it('auctioneer forced to buy when all pass', () => {
      // All players pass
      let result = pass(auction, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      // Auction automatically concludes with auctioneer buying
      expect(result.sold).toBe(true)
      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.isActive).toBe(false)
    })

    it('prevents passing after auction sold', () => {
      const sold = buyAtPrice(auction, '2', players)

      expect(() => pass(sold, '3'))
        .toThrow('Cannot pass on inactive or sold auction')
    })
  })

  describe('concludeAuction', () => {
    it('concludes with buyer winning', () => {
      const sold = buyAtPrice(auction, '2', players)
      const result = concludeAuction(sold, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(30) // Auctioneer gets the money
      expect(result.auctioneerId).toBe('1')
    })

    it('concludes with auctioneer buying when all pass', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(0) // Pays bank
      expect(result.auctioneerId).toBe('1')
    })

    it('prevents concluding incomplete auction', () => {
      expect(() => concludeAuction(auction, players))
        .toThrow('Cannot conclude incomplete auction')
    })
  })

  describe('Utility Functions', () => {
    it('getCurrentPlayer returns whose turn it is', () => {
      expect(getCurrentPlayer(auction)).toBe('2') // First in turn order

      const afterPass = pass(auction, '2')
      expect(getCurrentPlayer(afterPass)).toBe('3') // Next player
    })

    it('getCurrentPlayer returns null when auction ended', () => {
      const sold = buyAtPrice(auction, '2', players)
      expect(getCurrentPlayer(sold)).toBeNull()
    })

    it('isPlayerTurn checks if it is player turn', () => {
      expect(isPlayerTurn(auction, '2')).toBe(true)
      expect(isPlayerTurn(auction, '3')).toBe(false)
      expect(isPlayerTurn(auction, '1')).toBe(false) // Auctioneer not in turn order
    })

    it('canPlayerBuy checks if player can afford and its their turn', () => {
      expect(canPlayerBuy(auction, '2', players)).toBe(true) // Their turn, can afford
      expect(canPlayerBuy(auction, '3', players)).toBe(false) // Not their turn

      // Create expensive auction player 2 can't afford
      const expensive = createFixedPriceAuction(testCard, players[0], players, 90)
      expect(canPlayerBuy(expensive, '2', players)).toBe(false) // Can't afford
    })
  })

  describe('Turn Order Scenarios', () => {
    it('handles full round of passes then buy', () => {
      // Player 2 passes
      let state = pass(auction, '2')
      expect(getCurrentPlayer(state)).toBe('3')

      // Player 3 passes
      state = pass(state, '3')
      expect(getCurrentPlayer(state)).toBe('4')

      // Player 4 buys
      state = buyAtPrice(state, '4', players)
      expect(state.sold).toBe(true)
      expect(state.winnerId).toBe('4')
    })

    it('handles first player buying immediately', () => {
      const state = buyAtPrice(auction, '2', players)

      expect(state.sold).toBe(true)
      expect(state.winnerId).toBe('2')
      expect(state.passedPlayers.size).toBe(0)
    })

    it('handles 3-player game turn order', () => {
      const threePlayers: Player[] = [
        { id: '1', name: 'Alice', money: 100, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '2', name: 'Bob', money: 80, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '3', name: 'Carol', money: 60, hand: [], purchases: [], purchasedThisRound: [] }
      ]

      const threePlayerAuction = createFixedPriceAuction(testCard, threePlayers[0], threePlayers, 25)

      // Turn order should be [2, 3] (excluding auctioneer)
      expect(threePlayerAuction.turnOrder).toEqual(['2', '3'])
      expect(getCurrentPlayer(threePlayerAuction)).toBe('2')

      let state = pass(threePlayerAuction, '2')
      expect(getCurrentPlayer(state)).toBe('3')

      // If player 3 passes, auctioneer must buy
      state = pass(state, '3')
      expect(state.sold).toBe(true)
      expect(state.winnerId).toBe('1')
    })

    it('handles 5-player game turn order', () => {
      const fivePlayers: Player[] = [
        { id: '1', name: 'Alice', money: 100, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '2', name: 'Bob', money: 80, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '3', name: 'Carol', money: 60, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '4', name: 'Dave', money: 40, hand: [], purchases: [], purchasedThisRound: [] },
        { id: '5', name: 'Eve', money: 50, hand: [], purchases: [], purchasedThisRound: [] }
      ]

      const fivePlayerAuction = createFixedPriceAuction(testCard, fivePlayers[0], fivePlayers, 25)

      // Turn order should be [2, 3, 4, 5] (clockwise from auctioneer)
      expect(fivePlayerAuction.turnOrder).toEqual(['2', '3', '4', '5'])
    })
  })

  describe('Edge Cases', () => {
    it('handles auction at exactly player money', () => {
      // Player 4 has exactly $40
      const exactAuction = createFixedPriceAuction(testCard, players[0], players, 40)

      // Player 2 passes, player 3 passes
      let state = pass(exactAuction, '2')
      state = pass(state, '3')

      // Player 4 can afford exactly 40
      expect(canPlayerBuy(state, '4', players)).toBe(true)
      state = buyAtPrice(state, '4', players)

      expect(state.sold).toBe(true)
      expect(state.winnerId).toBe('4')
    })

    it('handles free auction (price 0)', () => {
      const freeAuction = createFixedPriceAuction(testCard, players[0], players, 0)

      const state = buyAtPrice(freeAuction, '2', players)
      const result = concludeAuction(state, players)

      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('handles auctioneer with low money setting price they can afford', () => {
      const poorAuctioneer = { ...players[0], money: 20 }
      const modifiedPlayers = [poorAuctioneer, ...players.slice(1)]

      // Can only set price up to 20
      expect(() => createFixedPriceAuction(testCard, poorAuctioneer, modifiedPlayers, 25))
        .toThrow('Auctioneer only has 20, cannot set price 25')

      const validAuction = createFixedPriceAuction(testCard, poorAuctioneer, modifiedPlayers, 20)
      expect(validAuction.price).toBe(20)
    })
  })
})
