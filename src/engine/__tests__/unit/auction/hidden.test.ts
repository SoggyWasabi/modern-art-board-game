import { describe, it, expect, beforeEach } from 'vitest'
import { createHiddenBidAuction, placeHiddenBid, revealBids, concludeAuction } from '../../../auction/hidden'
import type { HiddenBidAuctionState } from '../../../types/auction'
import { ARTISTS } from '../../../constants'

describe('Hidden Bid Auction', () => {
  let auction: HiddenBidAuctionState
  let players: Array<{ id: string; name: string; money: number }>

  beforeEach(() => {
    players = [
      { id: '1', name: 'Alice', money: 100 },
      { id: '2', name: 'Bob', money: 80 },
      { id: '3', name: 'Carol', money: 60 },
      { id: '4', name: 'Dave', money: 40 }
    ]

    const card = {
      id: 'card-1',
      artist: ARTISTS[1],
      auctionType: 'hidden' as const,
      artworkId: 'sigrid_thaler_hidden_1'
    }

    auction = createHiddenBidAuction(card, players[0], players)
  })

  describe('createHiddenBidAuction', () => {
    it('creates initial hidden bid auction state', () => {
      expect(auction.type).toBe('hidden')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.revealed).toBe(false)
      expect(auction.bids).toEqual(new Map())
      expect(auction.playerOrder).toEqual(['1', '2', '3', '4'])
    })
  })

  describe('submitBid', () => {
    it('allows players to place secret bids', () => {
      const result = placeHiddenBid(auction, '1', 15)

      expect(result.bids.get('1')).toBe(15)
      expect(result.isActive).toBe(true)
      expect(result.revealed).toBe(false)
    })

    it('requires bid to be positive', () => {
      expect(() => placeHiddenBid(auction, '1', 0))
        .toThrow('Bid must be at least 1')

      expect(() => placeHiddenBid(auction, '1', -5))
        .toThrow('Bid must be at least 1')
    })

    it('requires bidder to have enough money', () => {
      expect(() => placeHiddenBid(auction, '4', 50))
        .toThrow('Player only has 40, cannot bid 50')
    })

    it('prevents player from bidding twice', () => {
      const withBid = placeHiddenBid(auction, '1', 20)

      expect(() => placeHiddenBid(withBid, '1', 25))
        .toThrow('Player has already placed a bid')
    })

    it('prevents bidding after reveal', () => {
      const withBids = placeHiddenBid(auction, '1', 20)
      const revealed = revealBids(withBids)

      expect(() => placeHiddenBid(revealed, '2', 25))
        .toThrow('Bids have been revealed')
    })
  })

  describe('revealBids', () => {
    beforeEach(() => {
      auction = placeHiddenBid(auction, '1', 20)
      auction = placeHiddenBid(auction, '2', 25)
      auction = placeHiddenBid(auction, '3', 15)
      auction = placeHiddenBid(auction, '4', 30)
    })

    it('reveals all placed bids', () => {
      const revealed = revealBids(auction)

      expect(revealed.revealed).toBe(true)
      expect(revealed.isActive).toBe(false)
      expect(revealed.bids.size).toBe(4)
    })

    it('determines highest bid and winner', () => {
      const revealed = revealBids(auction)

      // Player 4 has highest bid (30)
      expect(revealed.highestBid).toBe(30)
      expect(revealed.winnerId).toBe('4')
    })

    it('handles tie-breaking by player order', () => {
      // Create tie between players 1 and 3
      auction = placeHiddenBid(auction, '1', 20)
      auction = placeHiddenBid(auction, '3', 20) // Same bid as player 1

      const revealed = revealBids(auction)

      // Player 1 wins tie due to earlier in order
      expect(revealed.highestBid).toBe(20)
      expect(revealed.winnerId).toBe('1')
    })

    it('handles tie-breaking with auctioneer priority', () => {
      // Create tie including auctioneer
      auction = placeHiddenBid(auction, '1', 25) // Auctioneer
      auction = placeHiddenBid(auction, '3', 25)

      const revealed = revealBids(auction)

      // Auctioneer (player 1) wins tie
      expect(revealed.highestBid).toBe(25)
      expect(revealed.winnerId).toBe('1')
    })

    it('handles 3-way tie', () => {
      auction = placeHiddenBid(auction, '1', 15)
      auction = placeHiddenBid(auction, '2', 15)
      auction = placeHiddenBid(auction, '3', 15)

      const revealed = revealBids(auction)

      // Player 1 wins due to order
      expect(revealed.highestBid).toBe(15)
      expect(revealed.winnerId).toBe('1')
    })

    it('handles 4-way tie', () => {
      auction = placeHiddenBid(auction, '1', 10)
      auction = placeHiddenBid(auction, '2', 10)
      auction = placeHiddenBid(auction, '3', 10)
      auction = placeHiddenBid(auction, '4', 10)

      const revealed = revealBids(auction)

      // Player 1 wins due to being auctioneer
      expect(revealed.highestBid).toBe(10)
      expect(revealed.winnerId).toBe('1')
    })
  })

  describe('determineWinner', () => {
    it('correctly identifies winner with highest bid', () => {
      auction = placeHiddenBid(auction, '1', 20)
      auction = placeHiddenBid(auction, '2', 35)
      auction = placeHiddenBid(auction, '3', 25)

      const revealed = revealBids(auction)

      expect(revealed.winnerId).toBe('2')
      expect(revealed.highestBid).toBe(35)
    })

    it('handles no bids scenario', () => {
      const revealed = revealBids(auction)

      expect(revealed.highestBid).toBe(0)
      expect(revealed.winnerId).toBe('1') // Auctioneer
    })

    it('handles single bid scenario', () => {
      auction = placeHiddenBid(auction, '3', 30)

      const revealed = revealBids(auction)

      expect(revealed.winnerId).toBe('3')
      expect(revealed.highestBid).toBe(30)
    })
  })

  describe('handleTie', () => {
    it('gives priority to auctioneer in ties', () => {
      auction = placeHiddenBid(auction, '1', 20) // Auctioneer
      auction = placeHiddenBid(auction, '3', 20)

      const revealed = revealBids(auction)

      expect(revealed.winnerId).toBe('1')
    })

    it('breaks ties by player order when auctioneer not involved', () => {
      auction = placeHiddenBid(auction, '2', 25)
      auction = placeHiddenBid(auction, '3', 25)
      auction = placeHiddenBid(auction, '4', 25)

      const revealed = revealBids(auction)

      // Player 2 wins (earliest in order after auctioneer)
      expect(revealed.winnerId).toBe('2')
    })
  })

  describe('concludeAuction', () => {
    beforeEach(() => {
      auction = placeHiddenBid(auction, '1', 20)
      auction = placeHiddenBid(auction, '2', 25)
      auction = placeHiddenBid(auction, '3', 15)
      auction = placeHiddenBid(auction, '4', 30)
      auction = revealBids(auction)
    })

    it('concludes auction with winner paying their bid', () => {
      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('4') // Highest bidder
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(30) // Auctioneer gets the money
      expect(result.type).toBe('hidden')
    })

    it('auctioneer pays bank when they win', () => {
      // Create scenario where auctioneer wins
      const auctioneerWins = createHiddenBidAuction(auction.card, players[0], players)
      auctioneerWins = placeHiddenBid(auctioneerWins, '1', 40)
      auctioneerWins = placeHiddenBid(auctioneerWins, '2', 20)
      auctioneerWins = revealBids(auctioneerWins)

      const result = concludeAuction(auctioneerWins, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(40)
      expect(result.profit).toBe(0) // No profit, pays bank
    })

    it('throws error when bids not revealed', () => {
      const notRevealed = createHiddenBidAuction(auction.card, players[0], players)
      notRevealed = placeHiddenBid(notRevealed, '1', 20)

      expect(() => concludeAuction(notRevealed, players))
        .toThrow('Bids must be revealed before concluding auction')
    })

    it('handles auction with no bids', () => {
      const noBidsAuction = createHiddenBidAuction(auction.card, players[0], players)
      const revealed = revealBids(noBidsAuction)

      const result = concludeAuction(revealed, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })
  })
})