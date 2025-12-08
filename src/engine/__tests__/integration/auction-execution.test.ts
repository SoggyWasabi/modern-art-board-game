import { describe, it, expect, beforeEach } from 'vitest'
import { createOpenAuction, placeBid, concludeAuction } from '../../auction/open'
import { createFixedPriceAuction, setPrice, buyAtFixedPrice } from '../../auction/fixedPrice'
import { createHiddenBidAuction, placeHiddenBid, revealBids } from '../../auction/hidden'
import { createOneOfferAuction, makeOffer, acceptOffer } from '../../auction/oneOffer'
import { processAuctionPayment } from '../../money'
import type { GameState, Player, Card } from '../../../types/game'
import { ARTISTS } from '../../constants'
import { transferMoney } from '../../money'

describe('Auction Execution Integration', () => {
  let gameState: GameState
  let players: Player[]
  let testCard: Card

  beforeEach(() => {
    players = [
      { id: '1', name: 'Alice', money: 100, hand: [], purchases: [] },
      { id: '2', name: 'Bob', money: 80, hand: [], purchases: [] },
      { id: '3', name: 'Carol', money: 60, hand: [], purchases: [] },
      { id: '4', name: 'Dave', money: 40, hand: [], purchases: [] }
    ]

    testCard = {
      id: 'test-card-1',
      artist: ARTISTS[0],
      auctionType: 'open',
      artworkId: 'test_art_1'
    }

    gameState = {
      players,
      deck: [],
      discardPile: [],
      round: {
        roundNumber: 1,
        phase: { type: 'awaiting_card_play', activePlayerIndex: 0 },
        auctioneerIndex: 0,
        cardsPlayedPerArtist: {}
      },
      board: { artistValues: {} },
      eventLog: []
    }
  })

  describe('Open Auction Execution', () => {
    it('executes complete open auction with money transfer', () => {
      // Create and run open auction
      let auction = createOpenAuction(testCard, players[0], players)

      // Bidding sequence
      auction = placeBid(auction, '2', 20, players)
      auction = placeBid(auction, '3', 30, players)
      auction = pass(auction, '4', players)
      auction = pass(auction, '1', players)

      // Conclude auction
      const result = concludeAuction(auction, players)

      // Process payment - THIS SHOULD BE PLAYER-TO-PLAYER
      const newState = processAuctionPayment(gameState, result)

      // Verify winner pays
      expect(newState.players.find(p => p.id === '3')?.money).toBe(30) // 60 - 30
      // Verify auctioneer receives
      expect(newState.players.find(p => p.id === '1')?.money).toBe(130) // 100 + 30
      // Other players unchanged
      expect(newState.players.find(p => p.id === '2')?.money).toBe(80)
      expect(newState.players.find(p => p.id === '4')?.money).toBe(40)
    })

    it('handles auctioneer winning own auction', () => {
      let auction = createOpenAuction(testCard, players[0], players)

      // Only auctioneer bids
      auction = placeBid(auction, '1', 25, players)
      auction = pass(auction, '2', players)
      auction = pass(auction, '3', players)
      auction = pass(auction, '4', players)

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank (no one else to receive money)
      expect(newState.players.find(p => p.id === '1')?.money).toBe(75) // 100 - 25
      expect(newState.players.find(p => p.id === '2')?.money).toBe(80) // unchanged
    })
  })

  describe('Fixed Price Auction Execution', () => {
    it('executes fixed price auction with money transfer', () => {
      let auction = createFixedPriceAuction(testCard, players[0], players)
      auction = setPrice(auction, 35)

      // Player 3 buys at fixed price
      auction = buyAtFixedPrice(auction, '3')

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Buyer pays
      expect(newState.players.find(p => p.id === '3')?.money).toBe(25) // 60 - 35
      // Auctioneer receives
      expect(newState.players.find(p => p.id === '1')?.money).toBe(135) // 100 + 35
    })
  })

  describe('Hidden Bid Auction Execution', () => {
    it('executes hidden bid auction with money transfer', () => {
      let auction = createHiddenBidAuction(testCard, players[0], players)

      // Secret bids
      auction = placeHiddenBid(auction, '1', 25)
      auction = placeHiddenBid(auction, '2', 40)
      auction = placeHiddenBid(auction, '3', 30)
      auction = placeHiddenBid(auction, '4', 20)

      // Reveal bids
      auction = revealBids(auction)

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Winner (Player 2) pays their bid
      expect(newState.players.find(p => p.id === '2')?.money).toBe(40) // 80 - 40
      // Auctioneer (Player 1) receives - BUT THIS IS WRONG! Player 1 also bid 25
      expect(newState.players.find(p => p.id === '1')?.money).toBe(140) // 100 + 40
    })

    it('handles auctioneer winning hidden auction', () => {
      let auction = createHiddenBidAuction(testCard, players[0], players)

      auction = placeHiddenBid(auction, '1', 50) // Auctioneer's bid
      auction = placeHiddenBid(auction, '2', 30)

      auction = revealBids(auction)

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank when winning own auction
      expect(newState.players.find(p => p.id === '1')?.money).toBe(50) // 100 - 50
    })
  })

  describe('One Offer Auction Execution', () => {
    it('executes one offer auction with money transfer', () => {
      let auction = createOneOfferAuction(testCard, players[0], players)

      // Players make offers
      auction = makeOffer(auction, '2', 20)
      auction = makeOffer(auction, '3', 35)
      auction = makeOffer(auction, '4', 30)
      auction = pass(auction, '1') // Back to auctioneer

      // Auctioneer accepts
      const result = acceptOffer(auction)
      const newState = processAuctionPayment(gameState, result)

      // Winner (Player 3) pays their offer
      expect(newState.players.find(p => p.id === '3')?.money).toBe(25) // 60 - 35
      // Auctioneer receives
      expect(newState.players.find(p => p.id === '1')?.money).toBe(135) // 100 + 35
    })

    it('handles auctioneer taking painting in one offer', () => {
      let auction = createOneOfferAuction(testCard, players[0], players)

      auction = makeOffer(auction, '2', 30)
      auction = pass(auction, '3')
      auction = pass(auction, '4')

      // Simulate auctioneer taking for highest offer + 1
      const result = {
        ...acceptOffer(auction),
        winnerId: '1', // Auctioneer takes it
        salePrice: 31 // Highest offer + 1
      }

      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank
      expect(newState.players.find(p => p.id === '1')?.money).toBe(69) // 100 - 31
    })
  })

  describe('Money Flow Verification', () => {
    it('verifies total money conservation in player-to-player auctions', () => {
      const initialTotal = players.reduce((sum, p) => sum + p.money, 0)

      // Run multiple auctions
      let currentState = gameState

      // Auction 1: Alice sells to Bob
      let auction = createOpenAuction(testCard, players[0], players)
      auction = placeBid(auction, '2', 30, players)
      auction = pass(auction, '3', players)
      auction = pass(auction, '4', players)
      auction = pass(auction, '1', players)

      let result = concludeAuction(auction, players)
      currentState = processAuctionPayment(currentState, result)

      // Auction 2: Bob sells to Carol
      const card2 = { ...testCard, id: 'test-card-2' }
      auction = createOpenAuction(card2, players[1], players)
      auction = placeBid(auction, '3', 20, players)
      auction = pass(auction, '4', players)
      auction = pass(auction, '1', players)
      auction = pass(auction, '2', players)

      result = concludeAuction(auction, players)
      currentState = processAuctionPayment(currentState, result)

      // Total money should be conserved in player-to-player transfers
      const finalTotal = currentState.players.reduce((sum, p) => sum + p.money, 0)
      expect(finalTotal).toBe(initialTotal)
    })

    it('demonstrates correct player-to-player money transfer', () => {
      let auction = createOpenAuction(testCard, players[0], players)
      auction = placeBid(auction, '2', 30, players)
      auction = pass(auction, '3', players)
      auction = pass(auction, '4', players)
      auction = pass(auction, '1', players)

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Total money in system should remain constant
      const totalBefore = gameState.players.reduce((sum, p) => sum + p.money, 0)
      const totalAfter = newState.players.reduce((sum, p) => sum + p.money, 0)
      expect(totalAfter).toBe(totalBefore) // Money is conserved

      // Winner pays auctioneer (not bank!)
      expect(newState.players.find(p => p.id === '2')?.money).toBe(50) // 80 - 30
      expect(newState.players.find(p => p.id === '1')?.money).toBe(130) // 100 + 30

      // Verify using transferMoney directly gives same result
      const directTransfer = transferMoney('2', '1', 30, gameState.players)
      expect(directTransfer.find(p => p.id === '2')?.money).toBe(50)
      expect(directTransfer.find(p => p.id === '1')?.money).toBe(130)
    })
  })

  describe('Integration with Game State', () => {
    it('updates game state correctly after auction', () => {
      let auction = createOpenAuction(testCard, players[0], players)
      auction = placeBid(auction, '2', 25, players)
      auction = pass(auction, '3', players)
      auction = pass(auction, '4', players)
      auction = pass(auction, '1', players)

      const result = concludeAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Verify all aspects of game state updated
      expect(newState.players).toHaveLength(4)
      expect(newState.players[0].money).toBe(125) // Alice +25
      expect(newState.players[1].money).toBe(55)  // Bob -25
      expect(newState.players[2].money).toBe(60)  // Unchanged
      expect(newState.players[3].money).toBe(40)  // Unchanged

      // Other game state should remain unchanged
      expect(newState.round).toEqual(gameState.round)
      expect(newState.board).toEqual(gameState.board)
    })
  })
})