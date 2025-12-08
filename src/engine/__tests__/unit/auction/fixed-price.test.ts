import { describe, it, expect, beforeEach } from 'vitest'
import { createFixedPriceAuction, setPrice, buyAtFixedPrice, pass, concludeAuction } from '../../../auction/fixedPrice'
import type { FixedPriceAuctionState } from '../../../types/auction'
import { ARTISTS } from '../../../constants'

describe('Fixed Price Auction', () => {
  let auction: FixedPriceAuctionState
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
      artist: ARTISTS[2],
      auctionType: 'fixed_price' as const,
      artworkId: 'daniel_melim_fixed_1'
    }

    auction = createFixedPriceAuction(card, players[0], players)
  })

  describe('createFixedPriceAuction', () => {
    it('creates initial fixed price auction state', () => {
      expect(auction.type).toBe('fixed_price')
      expect(auction.auctioneerId).toBe('1')
      expect(auction.isActive).toBe(true)
      expect(auction.price).toBeNull()
      expect(auction.sold).toBe(false)
      expect(auction.currentPlayerIndex).toBe(1) // Start with player to left of auctioneer
      expect(auction.passedPlayers).toEqual(new Set())
    })
  })

  describe('setPrice', () => {
    it('allows auctioneer to set the price', () => {
      const result = setPrice(auction, 30)

      expect(result.price).toBe(30)
      expect(result.isActive).toBe(true)
      expect(result.sold).toBe(false)
    })

    it('requires price to be positive', () => {
      expect(() => setPrice(auction, 0))
        .toThrow('Price must be at least 1')

      expect(() => setPrice(auction, -5))
        .toThrow('Price must be at least 1')
    })

    it('prevents setting price twice', () => {
      const withPrice = setPrice(auction, 25)

      expect(() => setPrice(withPrice, 30))
        .toThrow('Price has already been set')
    })

    it('prevents setting price after auction sold', () => {
      const soldAuction = { ...auction, price: 20, sold: true }

      expect(() => setPrice(soldAuction, 30))
        .toThrow('Auction has already been sold')
    })
  })

  describe('buyAtFixedPrice', () => {
    beforeEach(() => {
      auction = setPrice(auction, 25)
    })

    it('allows current player to buy at fixed price', () => {
      const result = buyAtFixedPrice(auction, '2')

      expect(result.sold).toBe(true)
      expect(result.buyerId).toBe('2')
      expect(result.salePrice).toBe(25)
      expect(result.isActive).toBe(false)
    })

    it('requires buyer to have enough money', () => {
      expect(() => buyAtFixedPrice(auction, '4')) // Player 4 only has 40, price is 25
        .not.toThrow() // Can afford

      const expensiveAuction = setPrice(auction, 85)
      expect(() => buyAtFixedPrice(expensiveAuction, '2')) // Player 2 only has 80
        .toThrow('Player only has 80, cannot pay 85')
    })

    it('only allows current player to buy', () => {
      // Current player is player 2 (index 1)
      expect(() => buyAtFixedPrice(auction, '3')) // Player 3 not current
        .toThrow('It is not player 3\'s turn')
    })

    it('prevents buying when no price set', () => {
      const noPriceAuction = createFixedPriceAuction(auction.card, players[0], players)

      expect(() => buyAtFixedPrice(noPriceAuction, '2'))
        .toThrow('Price has not been set')
    })

    it('prevents buying when already sold', () => {
      const soldAuction = { ...auction, sold: true, buyerId: '2', salePrice: 25 }

      expect(() => buyAtFixedPrice(soldAuction, '3'))
        .toThrow('Auction has already been sold')
    })
  })

  describe('pass', () => {
    beforeEach(() => {
      auction = setPrice(auction, 25)
    })

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

    it('concludes auction when everyone passes and auctioneer must buy', () => {
      let result = auction

      // Everyone else passes
      result = pass(result, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      // Auction should auto-conclude
      expect(result.sold).toBe(true)
      expect(result.buyerId).toBe('1') // Auctioneer buys
      expect(result.salePrice).toBe(25)
      expect(result.isActive).toBe(false)
    })

    it('handles passing in 3-player game', () => {
      const threePlayers = players.slice(0, 3)
      const threePlayerAuction = createFixedPriceAuction(auction.card, players[0], threePlayers)
      const withPrice = setPrice(threePlayerAuction, 20)

      let result = pass(withPrice, '2') // Player 2 passes
      expect(result.currentPlayerIndex).toBe(2) // Player 3's turn

      result = pass(result, '3') // Player 3 passes
      expect(result.sold).toBe(true) // Auctioneer must buy
      expect(result.buyerId).toBe('1')
    })

    it('prevents passing after auction sold', () => {
      const soldAuction = { ...auction, sold: true, buyerId: '2', salePrice: 25 }

      expect(() => pass(soldAuction, '3'))
        .toThrow('Auction has already been sold')
    })

    it('prevents same player from passing twice', () => {
      let result = pass(auction, '2')

      expect(() => pass(result, '2'))
        .toThrow('Player 2 has already passed')
    })
  })

  describe('concludeAuction', () => {
    beforeEach(() => {
      auction = setPrice(auction, 25)
    })

    it('concludes auction with buyer paying price', () => {
      const bought = buyAtFixedPrice(auction, '2')
      const result = concludeAuction(bought, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(25)
      expect(result.profit).toBe(25) // Auctioneer gets the money
    })

    it('auctioneer pays bank when they buy', () => {
      // Everyone passes, auctioneer buys
      let result = pass(auction, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('1')
      expect(concluded.salePrice).toBe(25)
      expect(concluded.profit).toBe(0) // No profit, pays bank
    })

    it('throws error when auction not sold', () => {
      expect(() => concludeAuction(auction, players))
        .toThrow('Auction has not been sold')
    })
  })

  describe('Turn Order and Player Management', () => {
    it('correctly identifies initial current player', () => {
      const withPrice = setPrice(auction, 20)

      expect(withPrice.currentPlayerIndex).toBe(1) // Player to left of auctioneer
    })

    it('handles wrap-around turn order', () => {
      const withPrice = setPrice(auction, 20)

      // Move through all players
      let result = pass(withPrice, '2') // Player 2
      expect(result.currentPlayerIndex).toBe(2)

      result = pass(result, '3') // Player 3
      expect(result.currentPlayerIndex).toBe(3)

      result = pass(result, '4') // Player 4
      expect(result.currentPlayerIndex).toBe(0) // Back to auctioneer
    })

    it('skips passed players in turn order', () => {
      const withPrice = setPrice(auction, 20)

      // Player 2 and 4 pass
      let result = pass(withPrice, '2')
      result = pass(result, '4')

      // Should now be player 3's turn (not back to 2)
      expect(result.currentPlayerIndex).toBe(2)
    })
  })

  describe('Complete Auction Scenarios', () => {
    it('handles early sale - first player buys', () => {
      const withPrice = setPrice(auction, 15)

      // Player 2 immediately buys
      const result = buyAtFixedPrice(withPrice, '2')
      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('2')
      expect(concluded.salePrice).toBe(15)
      expect(concluded.profit).toBe(15)
    })

    it('handles late sale - last player before auctioneer buys', () => {
      const withPrice = setPrice(auction, 30)

      let result = withPrice
      result = pass(result, '2') // Player 2 passes
      result = pass(result, '3') // Player 3 passes

      // Player 4 buys
      result = buyAtFixedPrice(result, '4')
      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('4')
      expect(concluded.salePrice).toBe(30)
      expect(concluded.profit).toBe(30)
    })

    it('handles auctioneer forced to buy after everyone passes', () => {
      const withPrice = setPrice(auction, 35)

      let result = withPrice
      result = pass(result, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      // Auctioneer forced to buy
      expect(result.sold).toBe(true)
      expect(result.buyerId).toBe('1')
      expect(result.salePrice).toBe(35)

      const concluded = concludeAuction(result, players)
      expect(concluded.profit).toBe(0) // Pays bank
    })

    it('handles strategic high pricing', () => {
      // Auctioneer sets very high price
      const withPrice = setPrice(auction, 90)

      let result = withPrice
      result = pass(result, '2') // Can't afford
      result = pass(result, '3') // Can't afford
      result = pass(result, '4') // Can't afford

      // Auctioneer must buy their own expensive painting
      expect(result.buyerId).toBe('1')
      expect(result.salePrice).toBe(90)

      const concluded = concludeAuction(result, players)
      expect(concluded.profit).toBe(0)
    })

    it('handles strategic low pricing', () => {
      // Auctioneer sets very low price
      const withPrice = setPrice(auction, 5)

      // Player 2 immediately buys (bargain!)
      const result = buyAtFixedPrice(withPrice, '2')
      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('2')
      expect(concluded.salePrice).toBe(5)
      expect(concluded.profit).toBe(5)
    })

    it('handles moderate pricing with strategic passing', () => {
      const withPrice = setPrice(auction, 45)

      let result = withPrice
      result = pass(result, '2') // Player 2 thinks it's too high

      // Player 3 buys
      result = buyAtFixedPrice(result, '3')
      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('3')
      expect(concluded.salePrice).toBe(45)
    })

    it('handles auctioneer with insufficient funds', () => {
      // Create auctioneer with little money
      const poorAuctioneer = { ...players[0], money: 20 }
      const poorPlayers = [poorAuctioneer, ...players.slice(1)]

      const poorAuction = createFixedPriceAuction(auction.card, poorPlayers[0], poorPlayers)
      const withPrice = setPrice(poorAuction, 50) // Sets price they can't afford

      // Everyone passes
      let result = pass(withPrice, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      // Auctioneer still has to buy (game rules don't check affordability)
      expect(result.buyerId).toBe('1')
      expect(result.salePrice).toBe(50)
    })
  })

  describe('Edge Cases', () => {
    it('handles minimum price', () => {
      const withPrice = setPrice(auction, 1)

      // Player 4 buys at minimum price
      const result = buyAtFixedPrice(withPrice, '4')
      const concluded = concludeAuction(result, players)

      expect(concluded.winnerId).toBe('4')
      expect(concluded.salePrice).toBe(1)
    })

    it('handles maximum reasonable price', () => {
      const withPrice = setPrice(auction, 100) // All of auctioneer's money

      // Everyone passes, auctioneer buys
      let result = withPrice
      result = pass(result, '2')
      result = pass(result, '3')
      result = pass(result, '4')

      expect(result.buyerId).toBe('1')
      expect(result.salePrice).toBe(100)
    })

    it('handles 3-player game turn order', () => {
      const threePlayers = players.slice(0, 3)
      const threePlayerAuction = createFixedPriceAuction(auction.card, players[0], threePlayers)
      const withPrice = setPrice(threePlayerAuction, 20)

      expect(withPrice.currentPlayerIndex).toBe(1) // Player 2

      let result = pass(withPrice, '2')
      expect(result.currentPlayerIndex).toBe(2) // Player 3

      result = pass(result, '3')
      expect(result.sold).toBe(true) // Back to auctioneer
    })

    it('handles 5-player game turn order', () => {
      const fivePlayers = [
        ...players,
        { id: '5', name: 'Eve', money: 50 }
      ]
      const fivePlayerAuction = createFixedPriceAuction(auction.card, players[0], fivePlayers)
      const withPrice = setPrice(fivePlayerAuction, 25)

      expect(withPrice.currentPlayerIndex).toBe(1) // Player 2

      let result = withPrice
      result = pass(result, '2')
      expect(result.currentPlayerIndex).toBe(2) // Player 3

      result = pass(result, '3')
      expect(result.currentPlayerIndex).toBe(3) // Player 4

      result = pass(result, '4')
      expect(result.currentPlayerIndex).toBe(4) // Player 5

      result = pass(result, '5')
      expect(result.sold).toBe(true) // Back to auctioneer
    })
  })
})