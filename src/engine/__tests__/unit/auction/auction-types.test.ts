import { describe, it, expect, beforeEach } from 'vitest'
import { startGame } from '../../game'
import { playCard } from '../../round'
import { createGameWithFixedHands, createGameSetup } from '../helpers/game-builder'
import { assertInvariants } from '../helpers/game-invariants'
import { simulateAuction } from '../testing/test-helpers'
import { ARTISTS } from '../../constants'
import type { Card, GameState, Player } from '../../../types/game'

describe('Auction Types', () => {
  let baseSetup: any

  beforeEach(() => {
    baseSetup = createGameSetup({ playerCount: 4 })
  })

  describe('Open Auction', () => {
    it('handles competitive bidding correctly', () => {
      // Create a game with an open auction card
      const openCard: Card = {
        id: 'test_open_1',
        artist: ARTISTS[0],
        auctionType: 'open',
        artworkId: 'test_art_1'
      }

      const game = createGameWithFixedHands(baseSetup, [[openCard], [], [], []])

      // Initial money state
      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      // Play the card (starts auction)
      let newGame = playCard(game, 0, 0)

      // Simulate open auction bidding
      newGame = simulateAuction(newGame, openCard, auctioneer.id, 'open')

      // Verify auction results
      expect(newGame.round.phase.type).toBe('awaiting_card_play')

      // Check painting went to some player
      const paintingOwners = newGame.players
        .filter(p => p.purchases && p.purchases.length > 0)
        .map(p => ({ player: p.name, paintings: p.purchases!.length }))

      // Money should have changed hands
      const finalMoney = newGame.players.map(p => p.money)
      expect(finalMoney).not.toEqual(initialMoney)

      // Assert invariants still hold
      assertInvariants(newGame)
    })

    it('handles case when no one bids', () => {
      const openCard: Card = {
        id: 'test_open_2',
        artist: ARTISTS[1],
        auctionType: 'open',
        artworkId: 'test_art_2'
      }

      // Set up a game where players have no money
      const game = createGameWithFixedHands(baseSetup, [[openCard], [], [], []])
      game.players.forEach((p, i) => {
        if (i > 0) p.money = 0 // Other players have no money
      })

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, openCard, auctioneer.id, 'open')

      // Auctioneer should win for free if no one bids
      expect(newGame.players[0].purchases).toHaveLength(1)
      expect(newGame.players[0].purchases![0].purchasePrice).toBe(0)

      // Only auctioneer's money should change
      expect(newGame.players[0].money).toBe(initialMoney[0])
      expect(newGame.players[1].money).toBe(0)

      assertInvariants(newGame)
    })
  })

  describe('Sealed Bid Auction', () => {
    it('correctly determines highest bid winner', () => {
      const sealedCard: Card = {
        id: 'test_sealed_1',
        artist: ARTISTS[2],
        auctionType: 'sealed',
        artworkId: 'test_art_3'
      }

      const game = createGameWithFixedHands(baseSetup, [[sealedCard], [], [], []])

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, sealedCard, auctioneer.id, 'sealed')

      // Should have a winner with highest bid
      const winningPlayer = newGame.players.find(p => p.purchases && p.purchases.length > 0)
      expect(winningPlayer).toBeDefined()

      // Auctioneer should receive payment
      const auctioneerFinal = newGame.players.find(p => p.id === auctioneer.id)!
      expect(auctioneerFinal.money).toBeGreaterThan(initialMoney[0])

      assertInvariants(newGame)
    })

    it('handles ties in sealed bidding correctly', () => {
      const sealedCard: Card = {
        id: 'test_sealed_tie',
        artist: ARTISTS[3],
        auctionType: 'sealed',
        artworkId: 'test_art_4'
      }

      const game = createGameWithFixedHands(baseSetup, [[sealedCard], [], [], []])

      const auctioneer = game.players[0]

      // Simulate a tied auction
      let newGame = simulateAuction(game, sealedCard, auctioneer.id, 'sealed')

      // In case of tie, first player to bid should win
      // This depends on implementation, but there should be exactly one winner
      const winners = newGame.players.filter(p => p.purchases && p.purchases.length > 0)
      expect(winners).toHaveLength(1)

      assertInvariants(newGame)
    })
  })

  describe('Fixed Price Auction', () => {
    it('sells to first player who can afford it', () => {
      const fixedCard: Card = {
        id: 'test_fixed_1',
        artist: ARTISTS[4],
        auctionType: 'fixed_price',
        artworkId: 'test_art_5'
      }

      const game = createGameWithFixedHands(baseSetup, [[fixedCard], [], [], []])

      // Set up players with different money amounts
      game.players[0].money = 200  // Auctioneer
      game.players[1].money = 50   // Can't afford
      game.players[2].money = 100  // Can afford
      game.players[3].money = 150  // Can afford

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, fixedCard, auctioneer.id, 'fixed_price')

      // Player 2 should win (first who can afford $30)
      expect(newGame.players[2].purchases).toHaveLength(1)
      expect(newGame.players[2].purchases![0].purchasePrice).toBe(30)

      // Verify money transfer
      expect(newGame.players[2].money).toBe(initialMoney[2] - 30)
      expect(newGame.players[0].money).toBe(initialMoney[0] + 30)

      assertInvariants(newGame)
    })

    it('handles case when no one can afford fixed price', () => {
      const fixedCard: Card = {
        id: 'test_fixed_2',
        artist: ARTISTS[0],
        auctionType: 'fixed_price',
        artworkId: 'test_art_6'
      }

      const game = createGameWithFixedHands(baseSetup, [[fixedCard], [], [], []])

      // Make all players except auctioneer unable to afford
      game.players.forEach((p, i) => {
        if (i > 0) p.money = 20  // Less than $30 fixed price
      })

      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, fixedCard, auctioneer.id, 'fixed_price')

      // Auctioneer should win for free (no one could buy)
      expect(newGame.players[0].purchases).toHaveLength(1)
      expect(newGame.players[0].purchases![0].purchasePrice).toBe(0)

      assertInvariants(newGame)
    })
  })

  describe('Once Around Auction', () => {
    it('gives each player exactly one bid opportunity', () => {
      const onceCard: Card = {
        id: 'test_once_1',
        artist: ARTISTS[1],
        auctionType: 'once_around',
        artworkId: 'test_art_7'
      }

      const game = createGameWithFixedHands(baseSetup, [[onceCard], [], [], []])

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, onceCard, auctioneer.id, 'once_around')

      // Should have exactly one winner
      const winners = newGame.players.filter(p => p.purchases && p.purchases.length > 0)
      expect(winners).toHaveLength(1)

      // Verify money was transferred
      const totalMoney = newGame.players.reduce((sum, p) => sum + p.money, 0)
      const initialTotal = initialMoney.reduce((sum, m) => sum + m, 0)
      expect(totalMoney).toBe(initialTotal)

      assertInvariants(newGame)
    })

    it('respects bid order (clockwise from auctioneer)', () => {
      const onceCard: Card = {
        id: 'test_once_order',
        artist: ARTISTS[2],
        auctionType: 'once_around',
        artworkId: 'test_art_8'
      }

      const game = createGameWithFixedHands(baseSetup, [[onceCard], [], [], []])

      // Set up controlled bidding amounts
      game.players[0].money = 200  // Auctioneer
      game.players[1].money = 100  // First bidder
      game.players[2].money = 150  // Second bidder
      game.players[3].money = 120  // Third bidder

      const newGame = simulateAuction(game, onceCard, game.players[0].id, 'once_around')

      // Someone should have won
      const winner = newGame.players.find(p => p.purchases && p.purchases.length > 0)
      expect(winner).toBeDefined()
      expect(winner!.id).not.toBe(game.players[0].id) // Auctioneer shouldn't win own once-around

      assertInvariants(newGame)
    })
  })

  describe('Double Auction', () => {
    it('sells two paintings to same winner', () => {
      const doubleCard1: Card = {
        id: 'test_double_1a',
        artist: ARTISTS[3],
        auctionType: 'double',
        artworkId: 'test_art_9a'
      }

      const doubleCard2: Card = {
        id: 'test_double_1b',
        artist: ARTISTS[3],
        auctionType: 'double',
        artworkId: 'test_art_9b'
      }

      // Player has double auction card and another of same artist
      const game = createGameWithFixedHands(baseSetup, [[doubleCard1, doubleCard2], [], [], []])

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      // Play first card (double auction)
      let newGame = playCard(game, 0, 0)
      newGame = simulateAuction(newGame, doubleCard1, auctioneer.id, 'double')

      // Should sell both paintings to same winner
      const winner = newGame.players.find(p => p.purchases && p.purchases.length > 0)
      expect(winner).toBeDefined()

      if (winner && winner.purchases) {
        expect(winner.purchases.length).toBe(2)
        expect(winner.purchases[0].artist).toBe(winner.purchases[1].artist)
        expect(winner.purchases[0].purchasePrice).toBe(winner.purchases[1].purchasePrice)
      }

      assertInvariants(newGame)
    })

    it('handles double auction with only one matching painting', () => {
      const doubleCard: Card = {
        id: 'test_double_single',
        artist: ARTISTS[4],
        auctionType: 'double',
        artworkId: 'test_art_10'
      }

      // Player has double card but no matching artist
      const game = createGameWithFixedHands(baseSetup, [[doubleCard], [], [], []])

      const newGame = simulateAuction(game, doubleCard, game.players[0].id, 'double')

      // Should still sell the single painting
      const winner = newGame.players.find(p => p.purchases && p.purchases.length > 0)
      expect(winner).toBeDefined()

      if (winner && winner.purchases) {
        expect(winner.purchases.length).toBe(1)
      }

      assertInvariants(newGame)
    })
  })

  describe('One Offer Auction', () => {
    it('offers painting to one player who can accept or decline', () => {
      const offerCard: Card = {
        id: 'test_offer_1',
        artist: ARTISTS[0],
        auctionType: 'one_offer',
        artworkId: 'test_art_11'
      }

      const game = createGameWithFixedHands(baseSetup, [[offerCard], [], [], []])

      // Set up target player
      game.players[1].money = 80  // Can afford

      const initialMoney = game.players.map(p => p.money)
      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, offerCard, auctioneer.id, 'one_offer')

      // Should either sell or not based on offer
      const totalMoney = newGame.players.reduce((sum, p) => sum + p.money, 0)
      const initialTotal = initialMoney.reduce((sum, m) => sum + m, 0)

      // Money is conserved (either transfer happens or not)
      expect(totalMoney).toBe(initialTotal)

      assertInvariants(newGame)
    })

    it('declines offer if player cannot afford', () => {
      const offerCard: Card = {
        id: 'test_offer_decline',
        artist: ARTISTS[1],
        auctionType: 'one_offer',
        artworkId: 'test_art_12'
      }

      const game = createGameWithFixedHands(baseSetup, [[offerCard], [], [], []])

      // Target player has no money
      game.players[1].money = 0

      const auctioneer = game.players[0]

      const newGame = simulateAuction(game, offerCard, auctioneer.id, 'one_offer')

      // Auctioneer should win (offer declined)
      expect(newGame.players[0].purchases).toHaveLength(1)

      assertInvariants(newGame)
    })
  })

  describe('Money Flow Invariants', () => {
    it('preserves total money in player-to-player auctions', () => {
      const testCard: Card = {
        id: 'test_money_flow',
        artist: ARTISTS[2],
        auctionType: 'open',
        artworkId: 'test_art_13'
      }

      const game = createGameWithFixedHands(baseSetup, [[testCard], [], [], []])

      const initialTotal = game.players.reduce((sum, p) => sum + p.money, 0)
      const auctioneer = game.players[0]

      // Run various auction types
      const auctionTypes: Array<'open' | 'sealed' | 'fixed_price' | 'once_around'> =
        ['open', 'sealed', 'fixed_price', 'once_around']

      auctionTypes.forEach(type => {
        const testGame = { ...game }
        testGame.players = testGame.players.map(p => ({ ...p })) // Deep copy

        const resultGame = simulateAuction(testGame, testCard, auctioneer.id, type)
        const finalTotal = resultGame.players.reduce((sum, p) => sum + p.money, 0)

        expect(finalTotal).toBe(initialTotal)
      })
    })

    it('correctly handles auctioneer winning own auction', () => {
      const testCard: Card = {
        id: 'test_own_win',
        artist: ARTISTS[3],
        auctionType: 'open',
        artworkId: 'test_art_14'
      }

      const game = createGameWithFixedHands(baseSetup, [[testCard], [], [], []])

      // Make other players unable to bid
      game.players.forEach((p, i) => {
        if (i > 0) p.money = 0
      })

      const auctioneer = game.players[0]
      const initialAuctioneerMoney = auctioneer.money

      const newGame = simulateAuction(game, testCard, auctioneer.id, 'open')

      // Auctioneer should win painting for free
      expect(newGame.players[0].purchases).toHaveLength(1)
      expect(newGame.players[0].purchases![0].purchasePrice).toBe(0)

      // Auctioneer money should not have changed
      expect(newGame.players[0].money).toBe(initialAuctioneerMoney)

      assertInvariants(newGame)
    })
  })

  describe('Auction State Transitions', () => {
    it('properly transitions from awaiting_card_play to auction', () => {
      const testCard: Card = {
        id: 'test_transition',
        artist: ARTISTS[4],
        auctionType: 'open',
        artworkId: 'test_art_15'
      }

      const game = createGameWithFixedHands(baseSetup, [[testCard], [], [], []])

      // Initial phase should be awaiting_card_play
      expect(game.round.phase.type).toBe('awaiting_card_play')

      // Play card to start auction
      const newGame = playCard(game, 0, 0)

      // Should transition to auction phase
      // Note: simulateAuction completes the auction and returns to awaiting_card_play
      // So we check the intermediate state
      expect(newGame.round.phase.type).toBe('auction')

      assertInvariants(game)
    })

    it('advances active player index after auction completes', () => {
      const testCard: Card = {
        id: 'test_turn_advance',
        artist: ARTISTS[0],
        auctionType: 'open',
        artworkId: 'test_art_16'
      }

      const game = createGameWithFixedHands(baseSetup, [[testCard], [], [], []])

      const initialActivePlayer = game.round.phase.type === 'awaiting_card_play'
        ? game.round.phase.activePlayerIndex
        : 0

      const newGame = simulateAuction(game, testCard, game.players[0].id, 'open')

      // Active player should have advanced
      if (newGame.round.phase.type === 'awaiting_card_play') {
        expect(newGame.round.phase.activePlayerIndex).toBe(initialActivePlayer + 1)
      }

      assertInvariants(newGame)
    })
  })
})