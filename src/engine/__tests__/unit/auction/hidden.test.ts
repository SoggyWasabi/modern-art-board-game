import { describe, it, expect, beforeEach } from 'vitest'
import { createHiddenAuction, submitBid, revealBids, concludeAuction } from '../../../auction/hidden'
import type { HiddenAuctionState } from '../../../../types/auction'
import { ARTISTS } from '../../../constants'
import type { Player, Card } from '../../../../types/game'

describe('Hidden Bid Auction', () => {
  let auction: HiddenAuctionState
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
      artist: ARTISTS[1],
      auctionType: 'hidden' as const,
      artworkId: 'sigrid_thaler_hidden_1'
    }

    auction = createHiddenAuction(testCard, players[0], players)
  })

  describe('createHiddenAuction', () => {
    it('creates initial hidden auction state', () => {
      expect(auction.type).toBe('hidden')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.revealedBids).toBe(false)
      expect(auction.bids).toEqual({})
      // Tie-break order: auctioneer first, then clockwise
      expect(auction.tieBreakOrder).toEqual(['1', '2', '3', '4'])
    })
  })

  describe('submitBid', () => {
    it('allows players to place secret bids', () => {
      const result = submitBid(auction, '1', 15, players)

      expect(result.bids['1']).toBe(15)
      expect(result.isActive).toBe(true)
      expect(result.revealedBids).toBe(false)
    })

    it('allows zero bids (passing)', () => {
      const result = submitBid(auction, '1', 0, players)
      expect(result.bids['1']).toBe(0)
    })

    it('requires bidder to have enough money', () => {
      expect(() => submitBid(auction, '4', 50, players))
        .toThrow('Player only has 40, cannot bid 50')
    })

    it('prevents player from bidding twice', () => {
      const withBid = submitBid(auction, '1', 20, players)

      expect(() => submitBid(withBid, '1', 25, players))
        .toThrow('Player has already submitted a bid')
    })

    it('prevents bidding after reveal', () => {
      // All players must bid before reveal
      let state = submitBid(auction, '1', 20, players)
      state = submitBid(state, '2', 25, players)
      state = submitBid(state, '3', 15, players)
      state = submitBid(state, '4', 10, players)
      const revealed = revealBids(state)

      expect(() => submitBid(revealed, '2', 25, players))
        .toThrow('Cannot submit bid to inactive or revealed auction')
    })

    it('marks ready to reveal when all players have bid', () => {
      let state = submitBid(auction, '1', 20, players)
      expect(state.readyToReveal).toBeFalsy()

      state = submitBid(state, '2', 25, players)
      expect(state.readyToReveal).toBeFalsy()

      state = submitBid(state, '3', 15, players)
      expect(state.readyToReveal).toBeFalsy()

      state = submitBid(state, '4', 10, players)
      expect(state.readyToReveal).toBe(true)
    })
  })

  describe('revealBids', () => {
    beforeEach(() => {
      // All players must bid before reveal
      auction = submitBid(auction, '1', 20, players)
      auction = submitBid(auction, '2', 25, players)
      auction = submitBid(auction, '3', 30, players)
      auction = submitBid(auction, '4', 15, players)
    })

    it('reveals all bids', () => {
      const result = revealBids(auction)

      expect(result.revealedBids).toBe(true)
      expect(result.bids['1']).toBe(20)
      expect(result.bids['2']).toBe(25)
      expect(result.bids['3']).toBe(30)
      expect(result.bids['4']).toBe(15)
    })

    it('prevents reveal before all players have bid', () => {
      const partialAuction = createHiddenAuction(testCard, players[0], players)
      const withOneBid = submitBid(partialAuction, '1', 20, players)

      expect(() => revealBids(withOneBid))
        .toThrow('Not all players have submitted bids')
    })
  })

  describe('concludeAuction', () => {
    it('determines winner by highest bid', () => {
      let state = submitBid(auction, '1', 20, players)
      state = submitBid(state, '2', 25, players)
      state = submitBid(state, '3', 30, players)
      state = submitBid(state, '4', 15, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('3') // Carol bid highest
      expect(result.salePrice).toBe(30)
    })

    it('breaks ties using tie-break order (auctioneer first)', () => {
      // Auctioneer and player 2 tie with highest bid
      let state = submitBid(auction, '1', 30, players)
      state = submitBid(state, '2', 30, players)
      state = submitBid(state, '3', 20, players)
      state = submitBid(state, '4', 15, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer wins tie
      expect(result.salePrice).toBe(30)
    })

    it('breaks ties using clockwise order when auctioneer not tied', () => {
      // Players 2 and 3 tie
      let state = submitBid(auction, '1', 20, players)
      state = submitBid(state, '2', 30, players)
      state = submitBid(state, '3', 30, players)
      state = submitBid(state, '4', 15, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('2') // Player 2 is closer clockwise from auctioneer
      expect(result.salePrice).toBe(30)
    })

    it('awards card free to auctioneer when all bid zero', () => {
      let state = submitBid(auction, '1', 0, players)
      state = submitBid(state, '2', 0, players)
      state = submitBid(state, '3', 0, players)
      state = submitBid(state, '4', 0, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer gets it free
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('sets profit to 0 when auctioneer wins', () => {
      let state = submitBid(auction, '1', 50, players)
      state = submitBid(state, '2', 30, players)
      state = submitBid(state, '3', 20, players)
      state = submitBid(state, '4', 10, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1')
      expect(result.profit).toBe(0) // Auctioneer pays bank
    })

    it('sets profit to sale price when another player wins', () => {
      let state = submitBid(auction, '1', 20, players)
      state = submitBid(state, '2', 50, players)
      state = submitBid(state, '3', 30, players)
      state = submitBid(state, '4', 10, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('2')
      expect(result.profit).toBe(50) // Auctioneer gets sale price
    })

    it('includes auctioneerId in result', () => {
      let state = submitBid(auction, '1', 20, players)
      state = submitBid(state, '2', 50, players)
      state = submitBid(state, '3', 30, players)
      state = submitBid(state, '4', 10, players)
      state = revealBids(state)

      const result = concludeAuction(state, players)

      expect(result.auctioneerId).toBe('1')
    })

    it('prevents concluding before reveal', () => {
      const state = submitBid(auction, '1', 20, players)

      expect(() => concludeAuction(state, players))
        .toThrow('Cannot conclude auction before revealing bids')
    })
  })
})
