import { describe, it, expect, beforeEach } from 'vitest'
import { createOpenAuction, placeBid, pass as openPass, concludeAuction as concludeOpenAuction } from '../../auction/open'
import { createFixedPriceAuction, buyAtPrice, pass as fixedPass, concludeAuction as concludeFixedAuction } from '../../auction/fixedPrice'
import { createHiddenAuction, submitBid, revealBids, concludeAuction as concludeHiddenAuction } from '../../auction/hidden'
import { createOneOfferAuction, makeOffer, pass as oneOfferPass, acceptHighestBid, auctioneerTakesFree, concludeAuction as concludeOneOfferAuction } from '../../auction/oneOffer'
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
      { id: '1', name: 'Alice', money: 100, hand: [], purchases: [], purchasedThisRound: [], isAI: false },
      { id: '2', name: 'Bob', money: 80, hand: [], purchases: [], purchasedThisRound: [], isAI: false },
      { id: '3', name: 'Carol', money: 60, hand: [], purchases: [], purchasedThisRound: [], isAI: false },
      { id: '4', name: 'Dave', money: 40, hand: [], purchases: [], purchasedThisRound: [], isAI: false }
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
        currentAuctioneerIndex: 0,
        cardsPlayedPerArtist: {
          'Manuel Carvalho': 0,
          'Sigrid Thaler': 0,
          'Daniel Melim': 0,
          'Ramon Martins': 0,
          'Rafael Silveira': 0
        }
      },
      board: { artistValues: {
        'Manuel Carvalho': [0, 0, 0, 0],
        'Sigrid Thaler': [0, 0, 0, 0],
        'Daniel Melim': [0, 0, 0, 0],
        'Ramon Martins': [0, 0, 0, 0],
        'Rafael Silveira': [0, 0, 0, 0]
      } },
      gamePhase: 'playing',
      winner: null,
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
      auction = openPass(auction, '4', players)
      auction = openPass(auction, '1', players)
      auction = openPass(auction, '2', players) // Player 2 passes (was outbid)

      // Conclude auction
      const result = concludeOpenAuction(auction, players)

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
      auction = openPass(auction, '2', players)
      auction = openPass(auction, '3', players)
      auction = openPass(auction, '4', players)

      const result = concludeOpenAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank (no one else to receive money)
      expect(newState.players.find(p => p.id === '1')?.money).toBe(75) // 100 - 25
      expect(newState.players.find(p => p.id === '2')?.money).toBe(80) // unchanged
    })
  })

  describe('Fixed Price Auction Execution', () => {
    it('executes fixed price auction with money transfer', () => {
      // Create auction with price set during creation
      let auction = createFixedPriceAuction(testCard, players[0], players, 35)

      // Turn order is: 2, 3, 4 (clockwise from auctioneer, excluding auctioneer)
      // Player 2 (first in turn order) buys at fixed price
      auction = buyAtPrice(auction, '2', players)

      const result = concludeFixedAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Buyer pays
      expect(newState.players.find(p => p.id === '2')?.money).toBe(45) // 80 - 35
      // Auctioneer receives
      expect(newState.players.find(p => p.id === '1')?.money).toBe(135) // 100 + 35
    })

    it('handles all pass - auctioneer must buy', () => {
      // Create auction with price set during creation
      let auction = createFixedPriceAuction(testCard, players[0], players, 35)

      // Turn order is: 2, 3, 4 (clockwise from auctioneer, excluding auctioneer)
      // All players pass
      auction = fixedPass(auction, '2')
      auction = fixedPass(auction, '3')
      auction = fixedPass(auction, '4')

      const result = concludeFixedAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank (forced to buy)
      expect(newState.players.find(p => p.id === '1')?.money).toBe(65) // 100 - 35
    })
  })

  describe('Hidden Bid Auction Execution', () => {
    it('executes hidden bid auction with money transfer', () => {
      let auction = createHiddenAuction(testCard, players[0], players)

      // Secret bids - all players must bid
      auction = submitBid(auction, '1', 25, players)
      auction = submitBid(auction, '2', 40, players)
      auction = submitBid(auction, '3', 30, players)
      auction = submitBid(auction, '4', 20, players)

      // Reveal bids
      auction = revealBids(auction)

      const result = concludeHiddenAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Winner (Player 2) pays their bid
      expect(newState.players.find(p => p.id === '2')?.money).toBe(40) // 80 - 40
      // Auctioneer (Player 1) receives payment
      expect(newState.players.find(p => p.id === '1')?.money).toBe(140) // 100 + 40
    })

    it('handles auctioneer winning hidden auction', () => {
      let auction = createHiddenAuction(testCard, players[0], players)

      // All players must bid
      auction = submitBid(auction, '1', 50, players) // Auctioneer's bid is highest
      auction = submitBid(auction, '2', 30, players)
      auction = submitBid(auction, '3', 20, players)
      auction = submitBid(auction, '4', 10, players)

      auction = revealBids(auction)

      const result = concludeHiddenAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer pays bank when winning own auction
      expect(newState.players.find(p => p.id === '1')?.money).toBe(50) // 100 - 50
    })
  })

  describe('One Offer Auction Execution', () => {
    it('executes one offer auction with money transfer', () => {
      let auction = createOneOfferAuction(testCard, players[0], players)

      // Turn order is: 2, 3, 4, 1 (clockwise from auctioneer, auctioneer LAST)
      // Players make offers in turn order
      auction = makeOffer(auction, '2', 20, players)
      auction = makeOffer(auction, '3', 35, players) // Highest bid
      auction = oneOfferPass(auction, '4') // Passes

      // Now in auctioneer decision phase - auctioneer accepts the highest bid
      expect(auction.phase).toBe('auctioneer_decision')
      auction = acceptHighestBid(auction)

      // Auction is now complete, conclude it
      const result = concludeOneOfferAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Winner (Player 3) pays their offer
      expect(newState.players.find(p => p.id === '3')?.money).toBe(25) // 60 - 35
      // Auctioneer receives
      expect(newState.players.find(p => p.id === '1')?.money).toBe(135) // 100 + 35
    })

    it('handles no bids - auctioneer gets card free', () => {
      let auction = createOneOfferAuction(testCard, players[0], players)

      // All players pass
      auction = oneOfferPass(auction, '2')
      auction = oneOfferPass(auction, '3')
      auction = oneOfferPass(auction, '4')

      // Now in auctioneer decision phase - auctioneer takes card free
      expect(auction.phase).toBe('auctioneer_decision')
      auction = auctioneerTakesFree(auction)

      const result = concludeOneOfferAuction(auction, players)
      const newState = processAuctionPayment(gameState, result)

      // Auctioneer gets card free (no money changes)
      expect(newState.players.find(p => p.id === '1')?.money).toBe(100) // unchanged
      expect(result.salePrice).toBe(0)
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
      auction = openPass(auction, '3', players)
      auction = openPass(auction, '4', players)
      auction = openPass(auction, '1', players)

      let result = concludeOpenAuction(auction, players)
      currentState = processAuctionPayment(currentState, result)

      // Total money should be conserved in player-to-player transfers
      const finalTotal = currentState.players.reduce((sum, p) => sum + p.money, 0)
      expect(finalTotal).toBe(initialTotal)
    })

    it('demonstrates correct player-to-player money transfer', () => {
      let auction = createOpenAuction(testCard, players[0], players)
      auction = placeBid(auction, '2', 30, players)
      auction = openPass(auction, '3', players)
      auction = openPass(auction, '4', players)
      auction = openPass(auction, '1', players)

      const result = concludeOpenAuction(auction, players)
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
      auction = openPass(auction, '3', players)
      auction = openPass(auction, '4', players)
      auction = openPass(auction, '1', players)

      const result = concludeOpenAuction(auction, players)
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
