import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOneOfferAuction,
  makeOffer,
  pass,
  acceptHighestBid,
  auctioneerOutbid,
  auctioneerTakesFree,
  concludeAuction,
  getCurrentPlayer,
  isPlayerTurn,
  isAuctioneerDecisionPhase,
  isValidBid,
  getValidActions,
  getAuctionStatus
} from '../../../auction/oneOffer'
import type { OneOfferAuctionState } from '../../../../types/auction'
import { ARTISTS } from '../../../constants'
import type { Player, Card } from '../../../../types/game'

describe('One Offer Auction', () => {
  let auction: OneOfferAuctionState
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
      artist: ARTISTS[3],
      auctionType: 'one_offer' as const,
      artworkId: 'ramon_martins_one_offer_1'
    }

    auction = createOneOfferAuction(testCard, players[0], players)
  })

  describe('createOneOfferAuction', () => {
    it('creates initial one offer auction state', () => {
      expect(auction.type).toBe('one_offer')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.currentBid).toBe(0)
      expect(auction.currentBidderId).toBeNull()
      expect(auction.phase).toBe('bidding')
      // Turn order: left of auctioneer, clockwise, auctioneer LAST
      expect(auction.turnOrder).toEqual(['2', '3', '4', '1'])
      expect(auction.currentTurnIndex).toBe(0)
      expect(auction.completedTurns.size).toBe(0)
    })

    it('sets correct turn order with auctioneer LAST', () => {
      // Player 3 is auctioneer
      const player3Auction = createOneOfferAuction(testCard, players[2], players)
      // Turn order: 4, 1, 2 (clockwise from player 3), then 3 (auctioneer) LAST
      expect(player3Auction.turnOrder).toEqual(['4', '1', '2', '3'])
    })

    it('handles auctioneer at end of player list', () => {
      // Player 4 is auctioneer
      const player4Auction = createOneOfferAuction(testCard, players[3], players)
      // Turn order: 1, 2, 3 (wraps around), then 4 (auctioneer) LAST
      expect(player4Auction.turnOrder).toEqual(['1', '2', '3', '4'])
    })

    it('handles 3-player game', () => {
      const threePlayers = players.slice(0, 3)
      const threePlayerAuction = createOneOfferAuction(testCard, threePlayers[0], threePlayers)
      // Turn order: 2, 3 (clockwise), then 1 (auctioneer) LAST
      expect(threePlayerAuction.turnOrder).toEqual(['2', '3', '1'])
    })
  })

  describe('makeOffer', () => {
    it('allows current player to make a bid', () => {
      const result = makeOffer(auction, '2', 20, players)

      expect(result.currentBid).toBe(20)
      expect(result.currentBidderId).toBe('2')
      expect(result.completedTurns.has('2')).toBe(true)
      expect(result.currentTurnIndex).toBe(1) // Moved to next player
      expect(result.phase).toBe('bidding') // Still in bidding phase
    })

    it('requires bid to be higher than current bid', () => {
      const withBid = makeOffer(auction, '2', 20, players)

      expect(() => makeOffer(withBid, '3', 15, players))
        .toThrow('Bid must be higher than current bid of 20')

      expect(() => makeOffer(withBid, '3', 20, players))
        .toThrow('Bid must be higher than current bid of 20')
    })

    it('allows higher bids', () => {
      let result = makeOffer(auction, '2', 20, players)
      result = makeOffer(result, '3', 25, players)

      expect(result.currentBid).toBe(25)
      expect(result.currentBidderId).toBe('3')
    })

    it('requires player to have enough money', () => {
      expect(() => makeOffer(auction, '2', 100, players))
        .toThrow('Player only has 80, cannot bid 100')
    })

    it('requires it to be the player turn', () => {
      expect(() => makeOffer(auction, '3', 20, players))
        .toThrow("Not this player's turn")
    })

    it('prevents bidding after auction concluded', () => {
      const concluded = { ...auction, isActive: false }

      expect(() => makeOffer(concluded, '2', 20, players))
        .toThrow('Auction is not active')
    })

    it('prevents bidding in auctioneer decision phase', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 25, players)
      state = pass(state, '4')
      // Now in auctioneer decision phase

      expect(state.phase).toBe('auctioneer_decision')
      expect(() => makeOffer(state, '1', 30, players))
        .toThrow('Bidding phase has ended')
    })

    it('transitions to auctioneer decision phase after all others bid', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 25, players)
      state = makeOffer(state, '4', 30, players)

      expect(state.phase).toBe('auctioneer_decision')
      expect(state.isActive).toBe(true)
      expect(getCurrentPlayer(state)).toBe('1') // Auctioneer's turn
    })
  })

  describe('pass', () => {
    it('allows current player to pass', () => {
      const result = pass(auction, '2')

      expect(result.completedTurns.has('2')).toBe(true)
      expect(result.currentTurnIndex).toBe(1) // Moved to next player
      expect(result.currentBid).toBe(0) // No change to current bid
      expect(result.phase).toBe('bidding')
    })

    it('requires it to be the player turn', () => {
      expect(() => pass(auction, '3'))
        .toThrow("Not this player's turn")
    })

    it('prevents passing after auction concluded', () => {
      const concluded = { ...auction, isActive: false }

      expect(() => pass(concluded, '2'))
        .toThrow('Auction is not active')
    })

    it('transitions to auctioneer decision phase when all others pass', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')
      expect(state.isActive).toBe(true)
      expect(getCurrentPlayer(state)).toBe('1') // Auctioneer's turn
    })

    it('prevents passing in auctioneer decision phase', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')
      expect(() => pass(state, '1'))
        .toThrow('Cannot pass during auctioneer decision phase')
    })
  })

  describe('acceptHighestBid', () => {
    it('allows auctioneer to accept highest bid', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')

      const result = acceptHighestBid(state)

      expect(result.isActive).toBe(false)
      expect(result.currentBid).toBe(30)
      expect(result.currentBidderId).toBe('3')
      expect(result.completedTurns.has('1')).toBe(true)
    })

    it('throws error when no bid to accept', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')
      expect(() => acceptHighestBid(state))
        .toThrow('No bid to accept')
    })

    it('throws error when not in decision phase', () => {
      expect(() => acceptHighestBid(auction))
        .toThrow('Can only accept bid during auctioneer decision phase')
    })

    it('throws error when auction not active', () => {
      const concluded = { ...auction, isActive: false, phase: 'auctioneer_decision' as const }

      expect(() => acceptHighestBid(concluded))
        .toThrow('Auction is not active')
    })
  })

  describe('auctioneerOutbid', () => {
    it('allows auctioneer to outbid and keep painting', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')

      const result = auctioneerOutbid(state, 35, players)

      expect(result.isActive).toBe(false)
      expect(result.currentBid).toBe(35)
      expect(result.currentBidderId).toBe('1') // Auctioneer
      expect(result.completedTurns.has('1')).toBe(true)
    })

    it('requires outbid to be higher than current bid', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')

      expect(() => auctioneerOutbid(state, 25, players))
        .toThrow('Bid must be higher than current bid of 30')

      expect(() => auctioneerOutbid(state, 30, players))
        .toThrow('Bid must be higher than current bid of 30')
    })

    it('requires auctioneer to have enough money', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')

      expect(() => auctioneerOutbid(state, 150, players))
        .toThrow('Auctioneer only has 100, cannot bid 150')
    })

    it('throws error when not in decision phase', () => {
      expect(() => auctioneerOutbid(auction, 50, players))
        .toThrow('Can only outbid during auctioneer decision phase')
    })
  })

  describe('auctioneerTakesFree', () => {
    it('allows auctioneer to take painting free when no bids', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')

      const result = auctioneerTakesFree(state)

      expect(result.isActive).toBe(false)
      expect(result.currentBid).toBe(0)
      expect(result.currentBidderId).toBe('1') // Auctioneer
      expect(result.completedTurns.has('1')).toBe(true)
    })

    it('throws error when there are bids', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')
      expect(() => auctioneerTakesFree(state))
        .toThrow('Cannot take free when there are bids')
    })

    it('throws error when not in decision phase', () => {
      expect(() => auctioneerTakesFree(auction))
        .toThrow('Can only take free during auctioneer decision phase')
    })
  })

  describe('concludeAuction', () => {
    it('determines winner when auctioneer accepts bid', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')
      state = acceptHighestBid(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(30) // Auctioneer gets the money
      expect(result.auctioneerId).toBe('1')
    })

    it('auctioneer gets card free when no one bids', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')
      state = auctioneerTakesFree(state)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('auctioneer pays bank when they outbid', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 30, players)
      state = pass(state, '4')
      state = auctioneerOutbid(state, 35, players)

      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(35)
      expect(result.profit).toBe(0) // No profit - pays bank
    })

    it('throws error when auction still active', () => {
      expect(() => concludeAuction(auction, players))
        .toThrow('Cannot conclude active auction')
    })
  })

  describe('Utility Functions', () => {
    it('getCurrentPlayer returns whose turn it is', () => {
      expect(getCurrentPlayer(auction)).toBe('2') // First in turn order

      const afterPass = pass(auction, '2')
      expect(getCurrentPlayer(afterPass)).toBe('3') // Next player
    })

    it('getCurrentPlayer returns auctioneer in decision phase', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(getCurrentPlayer(state)).toBe('1') // Auctioneer
    })

    it('getCurrentPlayer returns null when auction ended', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')
      state = auctioneerTakesFree(state)

      expect(getCurrentPlayer(state)).toBeNull()
    })

    it('isPlayerTurn checks if it is player turn', () => {
      expect(isPlayerTurn(auction, '2')).toBe(true)
      expect(isPlayerTurn(auction, '3')).toBe(false)
      expect(isPlayerTurn(auction, '1')).toBe(false) // Auctioneer goes last
    })

    it('isAuctioneerDecisionPhase returns correct phase', () => {
      expect(isAuctioneerDecisionPhase(auction)).toBe(false)

      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(isAuctioneerDecisionPhase(state)).toBe(true)
    })

    it('isValidBid checks if bid is valid', () => {
      expect(isValidBid(auction, '2', 20, players)).toBe(true)
      expect(isValidBid(auction, '3', 20, players)).toBe(false) // Not their turn
      expect(isValidBid(auction, '2', 100, players)).toBe(false) // Can't afford
    })

    it('getValidActions returns available actions for current player', () => {
      const actions = getValidActions(auction, '2', players)

      // Should have pass option
      expect(actions.some(a => a.type === 'pass')).toBe(true)

      // Should have bid options
      const bidActions = actions.filter(a => a.type === 'bid')
      expect(bidActions.length).toBeGreaterThan(0)
      expect(bidActions[0].amount).toBe(1) // Minimum bid
    })

    it('getValidActions returns auctioneer options in decision phase', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = pass(state, '3')
      state = pass(state, '4')

      const actions = getValidActions(state, '1', players)

      // Should have accept option
      expect(actions.some(a => a.type === 'accept')).toBe(true)

      // Should have bid options (to outbid)
      const bidActions = actions.filter(a => a.type === 'bid')
      expect(bidActions.length).toBeGreaterThan(0)
      expect(bidActions[0].amount).toBe(21) // Must be higher than 20
    })

    it('getValidActions returns take_free when no bids', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      const actions = getValidActions(state, '1', players)

      // Should only have take_free option
      expect(actions).toEqual([{ type: 'take_free' }])
    })

    it('getValidActions returns empty for non-current player', () => {
      const actions = getValidActions(auction, '3', players)
      expect(actions).toEqual([])
    })

    it('getAuctionStatus returns correct status', () => {
      const status = getAuctionStatus(auction)

      expect(status.currentPlayer).toBe('2')
      expect(status.remainingPlayers).toBe(4) // All 4 including auctioneer
      expect(status.completedPlayers).toBe(0)
      expect(status.phase).toBe('bidding')
      expect(status.highestBid).toBe(0)
      expect(status.highestBidder).toBeNull()
    })
  })

  describe('Complete Auction Scenarios', () => {
    it('handles competitive bidding then auctioneer accepts', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 25, players)
      state = makeOffer(state, '4', 30, players)

      expect(state.phase).toBe('auctioneer_decision')

      state = acceptHighestBid(state)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('4')
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(30)
    })

    it('handles mixed bids and passes then auctioneer accepts', () => {
      let state = makeOffer(auction, '2', 25, players)
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')

      state = acceptHighestBid(state)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(25)
      expect(result.profit).toBe(25)
    })

    it('handles auctioneer outbidding everyone', () => {
      let state = makeOffer(auction, '2', 20, players)
      state = makeOffer(state, '3', 35, players)
      state = makeOffer(state, '4', 40, players)

      expect(state.phase).toBe('auctioneer_decision')

      // Auctioneer has 100, can outbid
      state = auctioneerOutbid(state, 50, players)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1') // Auctioneer
      expect(result.salePrice).toBe(50)
      expect(result.profit).toBe(0) // Pays bank
    })

    it('handles all players passing', () => {
      let state = pass(auction, '2')
      state = pass(state, '3')
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')

      state = auctioneerTakesFree(state)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('handles 3-player game complete flow', () => {
      const threePlayers = players.slice(0, 3)
      let state = createOneOfferAuction(testCard, threePlayers[0], threePlayers)

      // Turn order: [2, 3, 1]
      expect(state.turnOrder).toEqual(['2', '3', '1'])

      state = makeOffer(state, '2', 15, threePlayers)
      state = makeOffer(state, '3', 20, threePlayers)

      expect(state.phase).toBe('auctioneer_decision')

      state = acceptHighestBid(state)
      const result = concludeAuction(state, threePlayers)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    it('handles player bidding exactly their money', () => {
      // Dave has exactly $40
      let state = makeOffer(auction, '2', 20, players)
      state = pass(state, '3')
      state = makeOffer(state, '4', 40, players) // Dave all-in

      expect(state.phase).toBe('auctioneer_decision')

      state = acceptHighestBid(state)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('4')
      expect(result.salePrice).toBe(40)
    })

    it('handles minimum bid of 1', () => {
      let state = makeOffer(auction, '2', 1, players)
      state = pass(state, '3')
      state = pass(state, '4')

      state = acceptHighestBid(state)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(1)
      expect(result.profit).toBe(1)
    })

    it('handles auctioneer outbidding with exactly enough money', () => {
      let state = makeOffer(auction, '2', 80, players)
      state = pass(state, '3')
      state = pass(state, '4')

      // Auctioneer has exactly 100
      state = auctioneerOutbid(state, 100, players)
      const result = concludeAuction(state, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(100)
    })

    it('handles player with less money than current bid', () => {
      // Bob bids 50
      let state = makeOffer(auction, '2', 50, players)

      // Carol has 60, can still outbid
      state = makeOffer(state, '3', 55, players)

      // Dave only has 40, cannot outbid - must pass
      // (In real game, they would just pass)
      expect(() => makeOffer(state, '4', 60, players))
        .toThrow('Player only has 40, cannot bid 60')

      // Dave passes instead
      state = pass(state, '4')

      expect(state.phase).toBe('auctioneer_decision')
    })
  })
})
