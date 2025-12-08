import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDoubleAuction,
  offerSecondCard,
  declineToOffer,
  acceptOffer,
  concludeAuction,
  getCurrentPlayer,
  isPlayerTurn,
  hasSecondCardOffered,
  getCurrentAuctioneer,
  getValidActions,
  getAuctionStatus,
  getCardsForWinner,
  hasMatchingCard,
  getPossibleSecondCards,
  startBiddingPhase
} from '../../../auction/double'
import type { DoubleAuctionState } from '../../../types/auction'
import { ARTISTS } from '../../../constants'

describe('Double Auction', () => {
  let doubleAuction: DoubleAuctionState
  let players: Array<{ id: string; name: string; money: number }>

  beforeEach(() => {
    players = [
      { id: '1', name: 'Alice', money: 100 },
      { id: '2', name: 'Bob', money: 80 },
      { id: '3', name: 'Carol', money: 60 },
      { id: '4', name: 'Dave', money: 40 }
    ]

    const doubleCard = {
      id: 'double-card-1',
      artist: ARTISTS[0],
      auctionType: 'double' as const,
      artworkId: 'manuel_carvalho_double_1'
    }

    doubleAuction = createDoubleAuction(doubleCard, players[0], players)
  })

  describe('createDoubleAuction', () => {
    it('creates initial double auction state', () => {
      expect(doubleAuction.type).toBe('double')
      expect(doubleAuction.originalAuctioneerId).toBe('1')
      expect(doubleAuction.currentAuctioneerId).toBe('1')
      expect(doubleAuction.doubleCard.artist).toBe(ARTISTS[0])
      expect(doubleAuction.secondCard).toBeNull()
      expect(doubleAuction.isActive).toBe(true)
      expect(doubleAuction.sold).toBe(false)
      expect(doubleAuction.turnOrder).toEqual(['1', '2', '3', '4']) // Original auctioneer first
      expect(doubleAuction.currentTurnIndex).toBe(0)
    })

    it('throws error if first card is not a double auction card', () => {
      const notDoubleCard = {
        id: 'not-double',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }

      expect(() => createDoubleAuction(notDoubleCard, players[0], players))
        .toThrow('First card must be a double auction card')
    })

    it('handles different auctioneer positions', () => {
      const doubleCard = {
        id: 'double-card-2',
        artist: ARTISTS[1],
        auctionType: 'double' as const,
        artworkId: 'sigrid_thaler_double_1'
      }

      // Bob as auctioneer (index 1)
      const auction = createDoubleAuction(doubleCard, players[1], players)
      expect(auction.originalAuctioneerId).toBe('2')
      expect(auction.turnOrder).toEqual(['2', '3', '4', '1']) // Bob first, then clockwise
    })
  })

  describe('offerSecondCard', () => {
    it('allows player to offer a second card', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0], // Same artist as double card
        auctionType: 'open' as const,
        artworkId: 'manuel_carvalho_open_2'
      }

      const result = offerSecondCard(doubleAuction, '2', secondCard, players)

      expect(result.secondCard).toBe(secondCard)
      expect(result.currentAuctioneerId).toBe('2') // Bob becomes auctioneer
      expect(result.auctionType).toBe('open') // Follows second card type
      expect(result.offers.has('2')).toBe(true)
      expect(result.isActive).toBe(true)
    })

    it('validates second card is same artist', () => {
      const wrongArtistCard = {
        id: 'wrong-artist',
        artist: ARTISTS[1], // Different artist
        auctionType: 'open' as const,
        artworkId: 'sigrid_thaler_open_1'
      }

      expect(() => offerSecondCard(doubleAuction, '2', wrongArtistCard, players))
        .toThrow('Second card must be same artist as double card')
    })

    it('prevents offering a double card as second card', () => {
      const anotherDoubleCard = {
        id: 'another-double',
        artist: ARTISTS[0],
        auctionType: 'double' as const,
        artworkId: 'manuel_carvalho_double_2'
      }

      expect(() => offerSecondCard(doubleAuction, '2', anotherDoubleCard, players))
        .toThrow('Second card cannot be a double auction card')
    })

    it('allows original auctioneer to offer first', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }

      // Original auctioneer (Alice) can offer
      const result = offerSecondCard(doubleAuction, '1', secondCard, players)
      expect(result.secondCard).toBe(secondCard)
      expect(result.currentAuctioneerId).toBe('1')
      expect(result.phase).toBe('bidding')
    })

    it('only allows current player to offer', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }

      // After original auctioneer declines, it's Bob's turn
      let currentAuction = declineToOffer(doubleAuction, '1')
      expect(() => offerSecondCard(currentAuction, '3', secondCard, players))
        .toThrow("Not this player's turn to offer")
    })

    it('prevents player from offering twice', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }

      let result = offerSecondCard(doubleAuction, '2', secondCard, players)

      expect(() => offerSecondCard(result, '2', secondCard, players))
        .toThrow('Player has already offered a card')
    })

    it('prevents offering after auction sold', () => {
      const soldAuction = { ...doubleAuction, sold: true }
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }

      expect(() => offerSecondCard(soldAuction, '2', secondCard, players))
        .toThrow('Cannot offer card in inactive or sold auction')
    })
  })

  describe('declineToOffer', () => {
    it('allows player to decline and passes turn', () => {
      const result = declineToOffer(doubleAuction, '2')

      expect(result.currentTurnIndex).toBe(1) // Moves to next player
      expect(result.isActive).toBe(true)
      expect(result.sold).toBe(false)
    })

    it('concludes auction when everyone declines', () => {
      let result = doubleAuction

      // Everyone declines (including original auctioneer)
      result = declineToOffer(result, '1') // Player 1 (original auctioneer)
      result = declineToOffer(result, '2') // Player 2
      result = declineToOffer(result, '3') // Player 3
      result = declineToOffer(result, '4') // Player 4

      expect(result.sold).toBe(true)
      expect(result.isActive).toBe(false)
      expect(result.currentTurnIndex).toBe(4) // Beyond last player
    })

    it('only allows current player to decline', () => {
      expect(() => declineToOffer(doubleAuction, '3'))
        .toThrow("Not this player's turn")
    })

    it('prevents declining when auction not active', () => {
      const inactiveAuction = { ...doubleAuction, isActive: false }

      expect(() => declineToOffer(inactiveAuction, '2'))
        .toThrow('Cannot decline in inactive auction')
    })
  })

  describe('acceptOffer', () => {
    beforeEach(() => {
      // Set up a scenario where someone has offered
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'manuel_carvalho_open_2'
      }
      doubleAuction = offerSecondCard(doubleAuction, '2', secondCard, players)
    })

    it('accepts offer with winner and price', () => {
      const result = acceptOffer(doubleAuction, '3', 30, players)

      expect(result.sold).toBe(true)
      expect(result.winnerId).toBe('3')
      expect(result.finalPrice).toBe(30)
      expect(result.isActive).toBe(false)
    })

    it('throws error if no second card offered', () => {
      const noSecondCardAuction = createDoubleAuction(doubleAuction.doubleCard, players[0], players)

      expect(() => acceptOffer(noSecondCardAuction, '2', 20, players))
        .toThrow('No second card has been offered')
    })

    it('validates winner can afford the price', () => {
      expect(() => acceptOffer(doubleAuction, '4', 50, players)) // Dave only has 40
        .toThrow('Winner only has 40, cannot pay 50')
    })

    it('prevents accepting when auction not active', () => {
      const inactiveAuction = { ...doubleAuction, isActive: false }

      expect(() => acceptOffer(inactiveAuction, '3', 30, players))
        .toThrow('Auction is not active')
    })
  })

  describe('concludeAuction', () => {
    it('concludes with original auctioneer getting double card for free', () => {
      // No one offered
      const result = concludeAuction(doubleAuction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(0)
      expect(result.profit).toBe(0)
      expect(result.type).toBe('double')
    })

    it('concludes with winner paying auctioneer', () => {
      // Set up with Bob offering and Carol winning
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      let currentAuction = offerSecondCard(doubleAuction, '2', secondCard, players)
      currentAuction = acceptOffer(currentAuction, '3', 35, players)

      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('3')
      expect(result.salePrice).toBe(35)
      expect(result.profit).toBe(35) // Bob gets the money
    })

    it('concludes with offerer winning (pays bank)', () => {
      // Bob offers and wins his own offer
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      let currentAuction = offerSecondCard(doubleAuction, '2', secondCard, players)
      currentAuction = acceptOffer(currentAuction, '2', 30, players) // Bob wins

      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('2')
      expect(result.salePrice).toBe(30)
      expect(result.profit).toBe(0) // No profit, pays bank
    })

    it('throws error when auction is incomplete', () => {
      // Still active
      expect(() => concludeAuction(doubleAuction, players))
        .toThrow('Cannot conclude incomplete auction')
    })
  })

  describe('Utility Functions', () => {
    it('getCurrentPlayer returns whose turn it is', () => {
      expect(getCurrentPlayer(doubleAuction)).toBe('2')

      let currentAuction = declineToOffer(doubleAuction, '2')
      expect(getCurrentPlayer(currentAuction)).toBe('3')

      currentAuction = declineToOffer(currentAuction, '3')
      expect(getCurrentPlayer(currentAuction)).toBe('4')
    })

    it('getCurrentPlayer returns null when auction ends', () => {
      let currentAuction = doubleAuction
      currentAuction = declineToOffer(currentAuction, '2')
      currentAuction = declineToOffer(currentAuction, '3')
      currentAuction = declineToOffer(currentAuction, '4')

      expect(getCurrentPlayer(currentAuction)).toBeNull()
    })

    it('isPlayerTurn checks if it\'s player\'s turn', () => {
      expect(isPlayerTurn(doubleAuction, '2')).toBe(true)
      expect(isPlayerTurn(doubleAuction, '3')).toBe(false)
    })

    it('hasSecondCardOffered checks for second card', () => {
      expect(hasSecondCardOffered(doubleAuction)).toBe(false)

      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      const withSecond = offerSecondCard(doubleAuction, '2', secondCard, players)
      expect(hasSecondCardOffered(withSecond)).toBe(true)
    })

    it('getCurrentAuctioneer returns current auctioneer', () => {
      // Before any offer, it's original auctioneer
      expect(getCurrentAuctioneer(doubleAuction)).toBe('1')

      // After offer, it's the offerer
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      const withOffer = offerSecondCard(doubleAuction, '2', secondCard, players)
      expect(getCurrentAuctioneer(withOffer)).toBe('2')
    })

    it('getCardsForWinner returns cards for winner', () => {
      expect(getCardsForWinner(doubleAuction)).toHaveLength(1)
      expect(getCardsForWinner(doubleAuction)[0]).toBe(doubleAuction.doubleCard)

      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      const withOffer = offerSecondCard(doubleAuction, '2', secondCard, players)
      expect(getCardsForWinner(withOffer)).toHaveLength(2)
    })

    it('getAuctionStatus provides complete status', () => {
      const status = getAuctionStatus(doubleAuction)

      expect(status.currentPlayer).toBe('2')
      expect(status.originalAuctioneer).toBe('1')
      expect(status.currentAuctioneer).toBe('1')
      expect(status.hasSecondCard).toBe(false)
      expect(status.auctionType).toBe('double')
      expect(status.sold).toBe(false)
      expect(status.passedCount).toBe(0)
    })

    it('getValidActions returns available actions', () => {
      // Before second card offer
      const actions = getValidActions(doubleAuction, '2', players)
      expect(actions).toContainEqual({ type: 'decline' })
      expect(actions).toContainEqual({ type: 'offer' })

      // Not current player's turn
      const otherActions = getValidActions(doubleAuction, '3', players)
      expect(otherActions).toHaveLength(0)
    })
  })

  describe('Complete Double Auction Scenarios', () => {
    it('handles original auctioneer offering and winning', () => {
      // Alice (original auctioneer) offers second card
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'fixed_price' as const,
        artworkId: 'manuel_carvalho_fixed_1'
      }
      let currentAuction = offerSecondCard(doubleAuction, '1', secondCard, players)

      // No one else bids, Alice wins
      currentAuction = acceptOffer(currentAuction, '1', 25, players)
      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('1')
      expect(result.salePrice).toBe(25)
      expect(result.profit).toBe(0) // Pays bank when winning own offer
    })

    it('handles all players declining', () => {
      let currentAuction = doubleAuction

      // Everyone passes
      currentAuction = declineToOffer(currentAuction, '2')
      currentAuction = declineToOffer(currentAuction, '3')
      currentAuction = declineToOffer(currentAuction, '4')

      const result = concludeAuction(currentAuction, players)

      expect(result.winnerId).toBe('1') // Original auctioneer
      expect(result.salePrice).toBe(0) // Free
      expect(getCardsForWinner(currentAuction)).toHaveLength(1) // Only double card
    })

    it('handles chain of offers before acceptance', () => {
      // Bob declines
      let currentAuction = declineToOffer(doubleAuction, '2')

      // Carol offers
      const carolsCard = {
        id: 'carols-card',
        artist: ARTISTS[0],
        auctionType: 'hidden' as const,
        artworkId: 'manuel_carvalho_hidden_1'
      }
      currentAuction = offerSecondCard(currentAuction, '3', carolsCard, players)

      // Now Carol is auctioneer
      expect(getCurrentAuctioneer(currentAuction)).toBe('3')
      expect(currentAuction.auctionType).toBe('hidden')
    })

    it('handles different auction types from second card', () => {
      const secondCard = {
        id: 'one-offer-card',
        artist: ARTISTS[0],
        auctionType: 'one_offer' as const,
        artworkId: 'manuel_carvalho_one_offer_1'
      }
      const currentAuction = offerSecondCard(doubleAuction, '2', secondCard, players)

      expect(currentAuction.auctionType).toBe('one_offer')
      // Would then proceed with one_offer auction mechanics
    })

    it('handles expensive double auction scenarios', () => {
      // Bob offers with high minimum
      const expensiveCard = {
        id: 'expensive-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'manuel_carvalho_open_expensive'
      }
      let currentAuction = offerSecondCard(doubleAuction, '2', expensiveCard, players)

      // Dave can't afford high bids
      expect(getValidActions(currentAuction, '4', players)).toEqual([{ type: 'bid', amount: 1 }])
      // But validation would check actual affordability
    })
  })

  describe('Edge Cases', () => {
    it('handles 3-player game', () => {
      const threePlayers = players.slice(0, 3)
      const auction = createDoubleAuction(doubleAuction.doubleCard, players[0], threePlayers)

      expect(auction.turnOrder).toEqual(['2', '3']) // Only 2 other players
      expect(auction.turnOrder).toHaveLength(2)
    })

    it('handles 5-player game', () => {
      const fivePlayers = [
        ...players,
        { id: '5', name: 'Eve', money: 50 }
      ]
      const auction = createDoubleAuction(doubleAuction.doubleCard, players[0], fivePlayers)

      expect(auction.turnOrder).toEqual(['2', '3', '4', '5'])
      expect(auction.turnOrder).toHaveLength(4)
    })

    it('handles minimum and maximum prices', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'test'
      }
      let currentAuction = offerSecondCard(doubleAuction, '2', secondCard, players)

      // Minimum price (can't be negative)
      expect(() => acceptOffer(currentAuction, '3', -5, players))
        .toThrow('Winner only has 60, cannot pay -5') // Validation catches negative

      // Maximum price (player's entire money)
      currentAuction = acceptOffer(currentAuction, '2', 80, players) // Bob's entire money
      expect(currentAuction.finalPrice).toBe(80)
    })
  })

  describe('Card Matching and Hand Integration', () => {
    let playerHands: Record<string, any[]>

    beforeEach(() => {
      // Simulate player hands with various cards
      playerHands = {
        '1': [
          { id: 'card1', artist: ARTISTS[0], auctionType: 'open', artworkId: 'test1' },
          { id: 'card2', artist: ARTISTS[1], auctionType: 'hidden', artworkId: 'test2' }
        ],
        '2': [
          { id: 'card3', artist: ARTISTS[0], auctionType: 'fixed_price', artworkId: 'test3' },
          { id: 'card4', artist: ARTISTS[0], auctionType: 'one_offer', artworkId: 'test4' }
        ],
        '3': [
          { id: 'card5', artist: ARTISTS[2], auctionType: 'open', artworkId: 'test5' }
        ],
        '4': [] // Empty hand
      }
    })

    it('detects when player has matching card', () => {
      // Alice has Manuel Carvalho card
      expect(hasMatchingCard('1', doubleAuction.doubleCard, playerHands['1'])).toBe(true)

      // Carol has different artist
      expect(hasMatchingCard('3', doubleAuction.doubleCard, playerHands['3'])).toBe(false)

      // Dave has empty hand
      expect(hasMatchingCard('4', doubleAuction.doubleCard, playerHands['4'])).toBe(false)
    })

    it('gets all possible second cards for player', () => {
      // Bob has two Manuel Carvalho cards
      const bobCards = getPossibleSecondCards('2', doubleAuction.doubleCard, playerHands['2'])
      expect(bobCards).toHaveLength(2)
      expect(bobCards[0].auctionType).toBe('fixed_price')
      expect(bobCards[1].auctionType).toBe('one_offer')
    })

    it('filters out double cards from possible offers', () => {
      // Add a double card to Bob's hand
      playerHands['2'].push({
        id: 'double2',
        artist: ARTISTS[0],
        auctionType: 'double',
        artworkId: 'double2'
      })

      const bobCards = getPossibleSecondCards('2', doubleAuction.doubleCard, playerHands['2'])
      // Should still only return the non-double cards
      expect(bobCards).toHaveLength(2)
      expect(bobCards.some(c => c.auctionType === 'double')).toBe(false)
    })

    it('supports auction type inheritance', () => {
      // Create auction with open card as second
      const openCard = {
        id: 'open-second',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'open2'
      }

      let currentAuction = offerSecondCard(doubleAuction, '1', openCard, players)

      // Now should be in bidding phase with open auction type
      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('open')
      expect(hasSecondCardOffered(currentAuction)).toBe(true)
    })
  })

  describe('Auction Type Integration', () => {
    it('transitions to open auction when open card offered', () => {
      const openCard = {
        id: 'open-second',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'open2'
      }

      let currentAuction = offerSecondCard(doubleAuction, '1', openCard, players)

      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('open')
      expect(currentAuction.currentAuctioneerId).toBe('1') // Alice remains auctioneer
    })

    it('transitions to hidden auction when hidden card offered', () => {
      const hiddenCard = {
        id: 'hidden-second',
        artist: ARTISTS[0],
        auctionType: 'hidden' as const,
        artworkId: 'hidden2'
      }

      const currentAuction = offerSecondCard(doubleAuction, '2', hiddenCard, players)

      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('hidden')
      expect(currentAuction.currentAuctioneerId).toBe('2') // Bob becomes auctioneer
    })

    it('transitions to fixed price auction when fixed price card offered', () => {
      const fixedCard = {
        id: 'fixed-second',
        artist: ARTISTS[0],
        auctionType: 'fixed_price' as const,
        artworkId: 'fixed2'
      }

      const currentAuction = offerSecondCard(doubleAuction, '3', fixedCard, players)

      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('fixed_price')
      expect(currentAuction.currentAuctioneerId).toBe('3') // Carol becomes auctioneer
    })

    it('transitions to one offer auction when one offer card offered', () => {
      const oneOfferCard = {
        id: 'one-offer-second',
        artist: ARTISTS[0],
        auctionType: 'one_offer' as const,
        artworkId: 'one2'
      }

      const currentAuction = offerSecondCard(doubleAuction, '4', oneOfferCard, players)

      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('one_offer')
      expect(currentAuction.currentAuctioneerId).toBe('4') // Dave becomes auctioneer
    })
  })

  describe('Card Award Verification', () => {
    it('verifies winner receives both cards when second card offered', () => {
      const secondCard = {
        id: 'second-card',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'second'
      }

      let currentAuction = offerSecondCard(doubleAuction, '2', secondCard, players)
      currentAuction = acceptOffer(currentAuction, '3', 40, players)

      const result = concludeAuction(currentAuction, players)
      const cardsForWinner = getCardsForWinner(currentAuction)

      expect(cardsForWinner).toHaveLength(2)
      expect(cardsForWinner[0]).toBe(doubleAuction.doubleCard)
      expect(cardsForWinner[1]).toBe(secondCard)

      // Conclusion result should reference the double card
      expect(result.card).toBe(doubleAuction.doubleCard)
    })

    it('verifies winner gets only double card when no second card offered', () => {
      const result = concludeAuction(doubleAuction, players)
      const cardsForWinner = getCardsForWinner(doubleAuction)

      expect(cardsForWinner).toHaveLength(1)
      expect(cardsForWinner[0]).toBe(doubleAuction.doubleCard)

      expect(result.salePrice).toBe(0)
      expect(result.winnerId).toBe('1') // Original auctioneer
    })
  })

  describe('Complete Double Auction Flow', () => {
    it('demonstrates original auctioneer priority', () => {
      let currentAuction = doubleAuction

      // Original auctioneer (Alice) gets first chance
      expect(getCurrentPlayer(currentAuction)).toBe('1')

      // Alice has matching card and offers it
      const matchingCard = {
        id: 'alice-matching',
        artist: ARTISTS[0],
        auctionType: 'open' as const,
        artworkId: 'alice1'
      }
      playerHands['1'].push(matchingCard)

      currentAuction = offerSecondCard(currentAuction, '1', matchingCard, players)

      // Now in bidding phase with open auction
      expect(currentAuction.phase).toBe('bidding')
      expect(currentAuction.auctionType).toBe('open')
      expect(currentAuction.currentAuctioneerId).toBe('1')
    })

    it('handles original auctioneer declining then others offering', () => {
      let currentAuction = doubleAuction

      // Alice declines
      currentAuction = declineToOffer(currentAuction, '1')
      expect(getCurrentPlayer(currentAuction)).toBe('2')

      // Bob offers
      const bobCard = {
        id: 'bob-card',
        artist: ARTISTS[0],
        auctionType: 'hidden' as const,
        artworkId: 'bob1'
      }
      currentAuction = offerSecondCard(currentAuction, '2', bobCard, players)

      expect(currentAuction.currentAuctioneerId).toBe('2')
      expect(currentAuction.auctionType).toBe('hidden')
      expect(currentAuction.phase).toBe('bidding')
    })

    it('handles complete flow with multiple declines before offer', () => {
      let currentAuction = doubleAuction

      // Alice declines
      currentAuction = declineToOffer(currentAuction, '1')
      // Bob declines
      currentAuction = declineToOffer(currentAuction, '2')
      // Carol offers
      const carolCard = {
        id: 'carol-card',
        artist: ARTISTS[0],
        auctionType: 'fixed_price' as const,
        artworkId: 'carol1'
      }
      currentAuction = offerSecondCard(currentAuction, '3', carolCard, players)

      // Carol is now auctioneer with fixed price auction
      expect(currentAuction.currentAuctioneerId).toBe('3')
      expect(currentAuction.auctionType).toBe('fixed_price')
      expect(currentAuction.phase).toBe('bidding')

      // Accept at fixed price
      currentAuction = acceptOffer(currentAuction, '4', 35, players)

      const result = concludeAuction(currentAuction, players)
      expect(result.winnerId).toBe('4')
      expect(result.profit).toBe(35) // Carol gets the money
      expect(getCardsForWinner(currentAuction)).toHaveLength(2)
    })
  })
})