import { describe, it, expect, beforeEach } from 'vitest'
import { createOneOfferAuction, makeOffer, pass, acceptOffer, concludeAuction } from '../../../auction/oneOffer'
import type { OneOfferAuctionState } from '../../../types/auction'
import { ARTISTS } from '../../../constants'

describe('One Offer Auction', () => {
  let auction: OneOfferAuctionState
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
      artist: ARTISTS[3],
      auctionType: 'one_offer' as const,
      artworkId: 'ramon_martins_one_offer_1'
    }

    auction = createOneOfferAuction(card, players[0], players)
  })

  describe('createOneOfferAuction', () => {
    it('creates initial one offer auction state', () => {
      expect(auction.type).toBe('one_offer')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.offers).toEqual([])
      expect(auction.currentPlayerIndex).toBe(1) // Start with player to left of auctioneer
      expect(auction.highestOffer).toBe(0)
      expect(auction.highestOffererId).toBeNull()
      expect(auction.passedPlayers).toEqual(new Set())
    })
  })

  describe('makeOffer', () => {
    it('allows current player to make an offer', () => {
      const result = makeOffer(auction, '2', 20)

      expect(result.offers).toHaveLength(1)
      expect(result.offers[0]).toEqual({
        playerId: '2',
        amount: 20,
        timestamp: expect.any(Number)
      })
      expect(result.highestOffer).toBe(20)
      expect(result.highestOffererId).toBe('2')
      expect(result.currentPlayerIndex).toBe(2) // Moves to next player
    })

    it('requires offer to be positive', () => {
      expect(() => makeOffer(auction, '2', 0))
        .toThrow('Offer must be at least 1')

      expect(() => makeOffer(auction, '2', -5))
        .toThrow('Offer must be at least 1')
    })

    it('requires offer to be higher than current highest', () => {
      // First offer
      auction = makeOffer(auction, '2', 20)

      // Second offer must be higher
      expect(() => makeOffer(auction, '3', 15))
        .toThrow('Offer must be higher than current highest offer of 20')

      expect(() => makeOffer(auction, '3', 20))
        .toThrow('Offer must be higher than current highest offer of 20')
    })

    it('allows higher offers', () => {
      auction = makeOffer(auction, '2', 20)
      const result = makeOffer(auction, '3', 25)

      expect(result.highestOffer).toBe(25)
      expect(result.highestOffererId).toBe('3')
      expect(result.offers).toHaveLength(2)
    })

    it('requires player to have enough money', () => {
      expect(() => makeOffer(auction, '4', 50))
        .toThrow('Player only has 40, cannot offer 50')
    })

    it('only allows current player to make offer', () => {
      expect(() => makeOffer(auction, '3', 20)) // Player 3 not current
        .toThrow('It is not player 3\'s turn')
    })

    it('prevents offering after auction concluded', () => {
      const concludedAuction = { ...auction, isActive: false }

      expect(() => makeOffer(concludedAuction, '2', 20))
        .toThrow('Auction is not active')
    })
  })

  describe('pass', () => {
    it('allows current player to pass', () => {
      const result = pass(auction, '2')

      expect(result.passedPlayers.has('2')).toBe(true)
      expect(result.currentPlayerIndex).toBe(2) // Moves to next player
    })

    it('moves to next player after pass', () => {
      let result = pass(auction, '2') // Player 2 passes
      expect(result.currentPlayerIndex).toBe(2) // Player 3's turn

      result = pass(result, '3') // Player 3 passes
      expect(result.currentPlayerIndex).toBe(3) // Player 4's turn

      result = pass(result, '4') // Player 4 passes
      expect(result.currentPlayerIndex).toBe(0) // Back to auctioneer
    })

    it('concludes offer phase when everyone passes', () => {
      let result = auction

      // Everyone else passes
      result = pass(result, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      // Auction moves to decision phase
      expect(result.isActive).toBe(true)
      expect(result.phase).toBe('auctioneer_decision')
      expect(result.currentPlayerIndex).toBe(0) // Auctioneer's turn to decide
    })

    it('skips passed players in turn order', () => {
      const withOffer = makeOffer(auction, '2', 20)

      // Player 3 passes
      let result = pass(withOffer, '3')
      expect(result.currentPlayerIndex).toBe(3) // Should skip to player 4

      // Player 4 can still offer
      result = makeOffer(result, '4', 25)
      expect(result.highestOffer).toBe(25)
      expect(result.highestOffererId).toBe('4')
    })

    it('prevents same player from passing twice', () => {
      let result = pass(auction, '2')

      expect(() => pass(result, '2'))
        .toThrow('Player 2 has already passed')
    })
  })

  describe('acceptOffer', () => {
    it('allows auctioneer to accept highest offer', () => {
      // Some offers made
      auction = makeOffer(auction, '2', 20)
      auction = makeOffer(auction, '3', 30)
      auction = makeOffer(auction, '4', 25)

      // Everyone passes
      auction = pass(auction, '1') // Back to auctioneer
      auction.phase = 'auctioneer_decision'

      const result = acceptOffer(auction)

      expect(result.isActive).toBe(false)
      expect(result.winnerId).toBe('3') // Highest offerer
      expect(result.salePrice).toBe(30)
    })

    it('throws error when no offers made', () => {
      auction.phase = 'auctioneer_decision'

      expect(() => acceptOffer(auction))
        .toThrow('No offers to accept')
    })

    it('only allows auctioneer to accept', () => {
      auction.phase = 'auctioneer_decision'

      expect(() => acceptOffer(auction, '2'))
        .toThrow('Only auctioneer can accept offer')
    })

    it('throws error when not in decision phase', () => {
      expect(() => acceptOffer(auction))
        .toThrow('Auctioneer must wait for all players to pass or make offers')
    })
  })

  describe('concludeAuction', () => {
    it('concludes with winner paying their offer', () => {
      auction = makeOffer(auction, '2', 20)
      auction = makeOffer(auction, '3', 30)
      auction.phase = 'auctioneer_decision'
      auction.isActive = false
      auction.winnerId = '3'
      auction.salePrice = 30

      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(30) // Auctioneer gets the money
    })

    it('auctioneer pays bank when they take painting', () => {
      // Auctioneer decides to take painting for highest offer + 1
      auction = makeOffer(auction, '2', 20)
      auction = makeOffer(auction, '3', 30)
      auction.phase = 'auctioneer_decision'
      auction.isActive = false
      auction.winnerId = '1' // Auctioneer
      auction.salePrice = 31 // Highest offer + 1

      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(31)
      expect(result.profit).toBe(0) // No profit, pays bank
    })

    it('handles auctioneer taking painting with no offers', () => {
      // Everyone passes, no offers made
      auction = pass(auction, '2')
      auction = pass(auction, '3')
      auction = pass(auction, '4')
      auction.phase = 'auctioneer_decision'
      auction.isActive = false
      auction.winnerId = '1' // Auctioneer takes for free
      auction.salePrice = 0

      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('throws error when auction still active', () => {
      expect(() => concludeAuction(auction, players))
        .toThrow('Auction must be concluded first')
    })
  })

  describe('Complete Auction Scenarios', () => {
    it('handles auction with single offer', () => {
      // Only one player makes offer
      auction = makeOffer(auction, '2', 25)
      auction = pass(auction, '3')
      auction = pass(auction, '4')
      auction.phase = 'auctioneer_decision'

      // Auctioneer accepts
      const accepted = acceptOffer(auction)
      const result = concludeAuction(accepted, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(25)
      expect(result.profit).toBe(25)
    })

    it('handles competitive bidding', () => {
      // Multiple offers
      auction = makeOffer(auction, '2', 20)
      auction = makeOffer(auction, '3', 35)
      auction = makeOffer(auction, '4', 40)
      auction = pass(auction, '1') // Back to auctioneer
      auction.phase = 'auctioneer_decision'

      const accepted = acceptOffer(auction)
      const result = concludeAuction(accepted, players)

      expect(result.winnerId).toBe('4')
      expect(result.salePrice).toBe(40)
      expect(result.profit).toBe(40)
    })

    it('handles auctioneer outbidding everyone', () => {
      auction = makeOffer(auction, '2', 30)
      auction = makeOffer(auction, '3', 35)
      auction.phase = 'auctioneer_decision'

      // Auctioneer decides to take for 36
      auction.isActive = false
      auction.winnerId = '1'
      auction.salePrice = 36

      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(36)
      expect(result.profit).toBe(0)
    })

    it('handles auctioneer taking with insufficient funds', () => {
      // Create auctioneer with limited money
      const poorAuctioneer = { ...players[0], money: 25 }
      const poorPlayers = [poorAuctioneer, ...players.slice(1)]
      const poorAuction = createOneOfferAuction(auction.card, poorPlayers[0], poorPlayers)

      // High offer comes in
      poorAuction = makeOffer(poorAuction, '2', 40)
      poorAuction.phase = 'auctioneer_decision'

      // Auctioneer takes anyway (game rules allow debt)
      poorAuction.isActive = false
      poorAuction.winnerId = '1'
      poorAuction.salePrice = 41

      const result = concludeAuction(poorAuction, poorPlayers)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(41)
    })

    it('handles strategic low offers', () => {
      // Players make low offers hoping auctioneer passes
      auction = makeOffer(auction, '2', 5)
      auction = makeOffer(auction, '3', 8)
      auction = pass(auction, '4')
      auction.phase = 'auctioneer_decision'

      // Auctioneer accepts low offer
      const accepted = acceptOffer(auction)
      const result = concludeAuction(accepted, players)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(8)
      expect(result.profit).toBe(8)
    })

    it('handles all players passing', () => {
      // No one makes an offer
      auction = pass(auction, '2')
      auction = pass(auction, '3')
      auction = pass(auction, '4')
      auction.phase = 'auctioneer_decision'

      // Auctioneer takes for free
      auction.isActive = false
      auction.winnerId = '1'
      auction.salePrice = 0

      const result = concludeAuction(auction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
    })

    it('handles maximum bidding scenario', () => {
      // Players bid all their money
      auction = makeOffer(auction, '2', 80) // All-in
      auction = makeOffer(auction, '3', 60) // All-in
      auction = pass(auction, '4') // Can't beat 80
      auction.phase = 'auctioneer_decision'

      const accepted = acceptOffer(auction)
      const result = concludeAuction(accepted, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(80)
    })
  })

  describe('Turn Order and Edge Cases', () => {
    it('handles 3-player game turn order', () => {
      const threePlayers = players.slice(0, 3)
      const threePlayerAuction = createOneOfferAuction(auction.card, players[0], threePlayers)

      expect(threePlayerAuction.currentPlayerIndex).toBe(1) // Player 2

      let result = pass(threePlayerAuction, '2')
      expect(result.currentPlayerIndex).toBe(2) // Player 3

      result = pass(result, '3')
      expect(result.phase).toBe('auctioneer_decision') // All passed
    })

    it('handles 5-player game turn order', () => {
      const fivePlayers = [
        ...players,
        { id: '5', name: 'Eve', money: 50 }
      ]
      const fivePlayerAuction = createOneOfferAuction(auction.card, players[0], fivePlayers)

      expect(fivePlayerAuction.currentPlayerIndex).toBe(1) // Player 2

      let result = fivePlayerAuction
      result = pass(result, '2')
      expect(result.currentPlayerIndex).toBe(2) // Player 3

      result = pass(result, '3')
      expect(result.currentPlayerIndex).toBe(3) // Player 4

      result = pass(result, '4')
      expect(result.currentPlayerIndex).toBe(4) // Player 5

      result = pass(result, '5')
      expect(result.phase).toBe('auctioneer_decision') // All passed
    })

    it('handles offer timing and tracking', () => {
      const startTime = Date.now()

      auction = makeOffer(auction, '2', 20)

      expect(auction.offers[0].timestamp).toBeGreaterThanOrEqual(startTime)
      expect(auction.offers[0].timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('handles auctioneer with no money taking painting', () => {
      // Create broke auctioneer
      const brokeAuctioneer = { ...players[0], money: 0 }
      const brokePlayers = [brokeAuctioneer, ...players.slice(1)]
      const brokeAuction = createOneOfferAuction(auction.card, brokePlayers[0], brokePlayers)

      // High offer comes in
      brokeAuction = makeOffer(brokeAuction, '2', 30)
      brokeAuction.phase = 'auctioneer_decision'

      // Auctioneer takes anyway, going into debt
      brokeAuction.isActive = false
      brokeAuction.winnerId = '1'
      brokeAuction.salePrice = 31

      const result = concludeAuction(brokeAuction, brokePlayers)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(31)
    })

    it('prevents offers after auctioneer decision phase', () => {
      auction = makeOffer(auction, '2', 20)
      auction = pass(auction, '3')
      auction = pass(auction, '4')
      auction.phase = 'auctioneer_decision'

      expect(() => makeOffer(auction, '1', 25))
        .toThrow('Auctioneer decision phase - no more offers')
    })
  })
})