import { describe, it, expect, beforeEach } from 'vitest'
import { createOpenAuction, placeBid, pass, concludeAuction, isValidBid, getValidActions } from '../../../auction/open'
import type { OpenAuctionState } from '../../../types/auction'
import { ARTISTS } from '../../../constants'

describe('Open Auction', () => {
  let auction: OpenAuctionState
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
      artist: ARTISTS[0],
      auctionType: 'open' as const,
      artworkId: 'manuel_carvalho_open_1'
    }

    auction = createOpenAuction(card, players[0], players)
  })

  describe('createOpenAuction', () => {
    it('creates initial open auction state', () => {
      expect(auction.type).toBe('open')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.currentBid).toBe(0)
      expect(auction.currentBidderId).toBeNull()
      expect(auction.isActive).toBe(true)
      expect(auction.passCount).toBe(0)
    })
  })

  describe('placeBid', () => {
    it('allows players to place bids', () => {
      const result = placeBid(auction, '1', 5, players)

      expect(result.currentBid).toBe(5)
      expect(result.currentBidderId).toBe('1')
      expect(result.passCount).toBe(0)
    })

    it('requires bid to be higher than current bid', () => {
      const withBid = placeBid(auction, '1', 5, players)

      expect(() => placeBid(withBid, '2', 5, players))
        .toThrow('Bid must be higher than current bid of 5')

      expect(() => placeBid(withBid, '2', 3, players))
        .toThrow('Bid must be higher than current bid of 5')
    })

    it('requires bidder to have enough money', () => {
      expect(() => placeBid(auction, '2', 100, players))
        .toThrow('Player only has 80, cannot bid 100')
    })

    it('resets pass count when someone bids', () => {
      // Pass first
      let result = pass(auction, '2', players)
      expect(result.passCount).toBe(1)

      // Then bid
      result = placeBid(result, '1', 5, players)
      expect(result.passCount).toBe(0)
    })

    it('throws error when auction is not active', () => {
      const inactiveAuction = { ...auction, isActive: false }

      expect(() => placeBid(inactiveAuction, '1', 5, players))
        .toThrow('Auction is not active')
    })
  })

  describe('pass', () => {
    it('increments pass count', () => {
      const result = pass(auction, '2', players)
      expect(result.passCount).toBe(1)
    })

    it('concludes auction when all other players pass', () => {
      let result = auction

      // Everyone else passes
      result = pass(result, '2', players)
      result = pass(result, '3', players)

      expect(result.passCount).toBe(2)
      expect(result.isActive).toBe(true)

      // Last player passes, auction ends
      result = pass(result, '4', players)
      expect(result.passCount).toBe(3)
      expect(result.isActive).toBe(false)
    })

    it('handles passing in 3-player game', () => {
      const threePlayers = players.slice(0, 3)
      const threePlayerAuction = createOpenAuction(auction.card, players[0], threePlayers)

      let result = pass(threePlayerAuction, '2', threePlayers)
      expect(result.passCount).toBe(1)
      expect(result.isActive).toBe(true)

      result = pass(result, '3', threePlayers)
      expect(result.passCount).toBe(2)
      expect(result.isActive).toBe(false)
    })
  })

  describe('concludeAuction', () => {
    it('returns card to auctioneer when no bids placed', () => {
      // All players must pass (except auctioneer) to end auction
      let endedAuction = pass(auction, '2', players)
      endedAuction = pass(endedAuction, '3', players)
      endedAuction = pass(endedAuction, '4', players)
      // Auction ends when all non-bidders pass

      const result = concludeAuction(endedAuction, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('awards card to highest bidder', () => {
      let currentAuction = placeBid(auction, '2', 10, players)
      currentAuction = placeBid(currentAuction, '3', 15, players)
      currentAuction = { ...currentAuction, isActive: false }

      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(15)
      expect(result.profit).toBe(15) // Auctioneer gets the money
    })

    it('auctioneer wins and pays bank when they are highest bidder', () => {
      let currentAuction = placeBid(auction, '1', 20, players)
      currentAuction = { ...currentAuction, isActive: false }

      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(20)
      expect(result.profit).toBe(0) // No profit, pays bank
    })

    it('throws error when auction is still active', () => {
      expect(() => concludeAuction(auction, players))
        .toThrow('Cannot conclude active auction')
    })
  })

  describe('isValidBid', () => {
    it('returns true for valid bid', () => {
      expect(isValidBid(auction, '1', 5, players)).toBe(true)
    })

    it('returns false for invalid bid', () => {
      expect(isValidBid(auction, '2', 200, players)).toBe(false) // Too high
      expect(isValidBid(auction, '2', 0, players)).toBe(false) // Too low

      const inactiveAuction = { ...auction, isActive: false }
      expect(isValidBid(inactiveAuction, '1', 5, players)).toBe(false)
    })
  })

  describe('getValidActions', () => {
    it('includes pass option', () => {
      const actions = getValidActions(auction, '1', players)
      expect(actions.some(a => a.type === 'pass')).toBe(true)
    })

    it('includes bid options when player can afford', () => {
      const actions = getValidActions(auction, '1', players)
      const bidActions = actions.filter(a => a.type === 'bid')

      expect(bidActions.length).toBeGreaterThan(0)
      expect(bidActions[0].amount).toBe(1) // Minimum bid
    })

    it('limits bid options based on player money', () => {
      const actions = getValidActions(auction, '4', players) // Player with 40 money
      const bidActions = actions.filter(a => a.type === 'bid')

      bidActions.forEach(action => {
        expect(action.amount).toBeLessThanOrEqual(40)
      })
    })

    it('includes no bid options when auction is inactive', () => {
      const inactiveAuction = { ...auction, isActive: false }
      const actions = getValidActions(inactiveAuction, '1', players)
      const bidActions = actions.filter(a => a.type === 'bid')

      expect(bidActions.length).toBe(0)
    })
  })

  describe('Bidding Scenarios', () => {
    it('handles competitive bidding war with many back-and-forth rounds', () => {
      let currentAuction = auction

      // Round 1: Initial bidding
      currentAuction = placeBid(currentAuction, '1', 5, players)
      expect(currentAuction.currentBid).toBe(5)
      expect(currentAuction.currentBidderId).toBe('1')

      // Round 2: Player 2 raises
      currentAuction = placeBid(currentAuction, '2', 10, players)
      expect(currentAuction.currentBid).toBe(10)
      expect(currentAuction.currentBidderId).toBe('2')

      // Round 3: Player 3 jumps higher
      currentAuction = placeBid(currentAuction, '3', 18, players)
      expect(currentAuction.currentBid).toBe(18)
      expect(currentAuction.currentBidderId).toBe('3')

      // Round 4: Auctioneer comes back strong
      currentAuction = placeBid(currentAuction, '1', 25, players)
      expect(currentAuction.currentBid).toBe(25)
      expect(currentAuction.currentBidderId).toBe('1')

      // Round 5: Player 4, who hasn't bid yet, jumps in
      currentAuction = placeBid(currentAuction, '4', 30, players)
      expect(currentAuction.currentBid).toBe(30)
      expect(currentAuction.currentBidderId).toBe('4')

      // Round 6: Player 2, who bid earlier, comes back
      currentAuction = placeBid(currentAuction, '2', 35, players)
      expect(currentAuction.currentBid).toBe(35)
      expect(currentAuction.currentBidderId).toBe('2')

      // Round 7: Player 3 raises again
      currentAuction = placeBid(currentAuction, '3', 40, players)
      expect(currentAuction.currentBid).toBe(40)
      expect(currentAuction.currentBidderId).toBe('3')

      // Round 8: Back to auctioneer - serious bidding
      currentAuction = placeBid(currentAuction, '1', 50, players)
      expect(currentAuction.currentBid).toBe(50)
      expect(currentAuction.currentBidderId).toBe('1')

      // Round 9: Player 4 goes all out (can only bid up to 40)
      // But current bid is 50, so Player 4 can't afford to bid higher
      expect(() => placeBid(currentAuction, '4', 55, players))
        .toThrow('Player only has 40, cannot bid 55')

      // Round 9 (alt): Player 3 tries (has $60, can still bid)
      currentAuction = placeBid(currentAuction, '3', 55, players)
      expect(currentAuction.currentBid).toBe(55)
      expect(currentAuction.currentBidderId).toBe('3')

      // Round 10: Final showdown - Player 2 can still afford to bid higher
      currentAuction = placeBid(currentAuction, '2', 60, players)
      expect(currentAuction.currentBid).toBe(60)
      expect(currentAuction.currentBidderId).toBe('2')

      // Now Player 2 can't bid 85 (only has 80)
      expect(() => placeBid(currentAuction, '2', 85, players))
        .toThrow('Player only has 80, cannot bid 85')

      // Final state
      expect(currentAuction.currentBid).toBe(60)
      expect(currentAuction.currentBidderId).toBe('2')
      expect(currentAuction.passCount).toBe(0)

      // Verify auction is still active (need passes to conclude)
      expect(currentAuction.isActive).toBe(true)
    })

    it('handles rapid bidding with small increments', () => {
      let currentAuction = auction

      // Players bidding in small increments, testing patience
      currentAuction = placeBid(currentAuction, '1', 10, players)
      currentAuction = placeBid(currentAuction, '2', 11, players) // Minimum increment
      currentAuction = placeBid(currentAuction, '3', 12, players)
      currentAuction = placeBid(currentAuction, '4', 13, players)
      currentAuction = placeBid(currentAuction, '1', 14, players)
      currentAuction = placeBid(currentAuction, '2', 15, players)
      currentAuction = placeBid(currentAuction, '3', 16, players)

      expect(currentAuction.currentBid).toBe(16)
      expect(currentAuction.currentBidderId).toBe('3')
      expect(currentAuction.passCount).toBe(0)
    })

    it('handles aggressive bidding with large jumps', () => {
      let currentAuction = auction

      // Players making big jumps to intimidate others
      currentAuction = placeBid(currentAuction, '1', 5, players)
      currentAuction = placeBid(currentAuction, '2', 20, players) // Jump by 15
      currentAuction = placeBid(currentAuction, '3', 45, players) // Jump by 25
      currentAuction = placeBid(currentAuction, '1', 60, players) // Auctioneer jumps high

      expect(currentAuction.currentBid).toBe(60)
      expect(currentAuction.currentBidderId).toBe('1')

      // Player 4 tries to jump but can't afford that much
      expect(() => placeBid(currentAuction, '4', 80, players))
        .toThrow('Player only has 40, cannot bid 80')
    })

    it('handles back-and-forth between two determined bidders', () => {
      let currentAuction = auction

      // Only players 1 and 3 are interested, others pass
      currentAuction = pass(currentAuction, '2', players)
      currentAuction = placeBid(currentAuction, '1', 10, players)
      currentAuction = pass(currentAuction, '4', players)

      // Now just players 1 and 3 bidding
      currentAuction = placeBid(currentAuction, '3', 15, players)
      currentAuction = placeBid(currentAuction, '1', 20, players)
      currentAuction = placeBid(currentAuction, '3', 25, players)
      currentAuction = placeBid(currentAuction, '1', 30, players)
      currentAuction = placeBid(currentAuction, '3', 35, players)
      currentAuction = placeBid(currentAuction, '1', 40, players)

      expect(currentAuction.currentBid).toBe(40)
      expect(currentAuction.currentBidderId).toBe('1')
      expect(currentAuction.passCount).toBe(0)
    })

    it('handles bidding where auctioneer keeps coming back', () => {
      let currentAuction = auction

      // Auctioneer is determined to win
      currentAuction = placeBid(currentAuction, '1', 15, players)
      currentAuction = placeBid(currentAuction, '2', 20, players)
      currentAuction = placeBid(currentAuction, '1', 25, players) // Auctioneer outbids
      currentAuction = placeBid(currentAuction, '3', 30, players)
      currentAuction = placeBid(currentAuction, '1', 35, players) // Auctioneer outbids again
      currentAuction = placeBid(currentAuction, '4', 40, players)
      currentAuction = placeBid(currentAuction, '1', 45, players) // Auctioneer still in
      currentAuction = placeBid(currentAuction, '2', 50, players)
      currentAuction = placeBid(currentAuction, '1', 55, players) // Final auctioneer bid

      expect(currentAuction.currentBid).toBe(55)
      expect(currentAuction.currentBidderId).toBe('1')
    })

    it('handles auction where everyone passes except auctioneer', () => {
      let currentAuction = auction

      // Everyone passes
      currentAuction = pass(currentAuction, '2', players)
      currentAuction = pass(currentAuction, '3', players)
      currentAuction = pass(currentAuction, '4', players)

      expect(currentAuction.isActive).toBe(false)

      const result = concludeAuction(currentAuction, players)
      expect(result.winnerId).toBe('1') // Auctioneer wins
      expect(result.salePrice).toBe(0) // For free
    })

    it('handles single bid then others pass', () => {
      let currentAuction = placeBid(auction, '2', 15, players)
      currentAuction = pass(currentAuction, '3', players)
      currentAuction = pass(currentAuction, '4', players)
      currentAuction = pass(currentAuction, '1', players)

      expect(currentAuction.isActive).toBe(false)

      const result = concludeAuction(currentAuction, players)
      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(15)
    })
  })
})