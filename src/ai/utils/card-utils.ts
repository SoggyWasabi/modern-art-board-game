// ===================
// AI CARD UTILITIES
// ===================

import type { Card, Artist } from '../../../types/game'

export function createCardUtils() {
  /**
   * Validate card structure
   */
  function isValid(card: any): card is Card {
    return (
      card &&
      typeof card.id === 'string' &&
      typeof card.artist === 'string' &&
      typeof card.auctionType === 'string' &&
      ['open', 'hidden', 'one_offer', 'fixed_price', 'double'].includes(card.auctionType)
    )
  }

  /**
   * Check if two cards have same artist
   */
  function sameArtist(card1: Card, card2: Card): boolean {
    return card1.artist === card2.artist
  }

  /**
   * Sort cards by artist name
   */
  function sortByArtist(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => a.artist.localeCompare(b.artist))
  }

  /**
   * Get auction type strategic value
   */
  function getAuctionTypeValue(card: Card): number {
    const values = {
      open: 1,
      one_offer: 2,
      hidden: 3,
      fixed_price: 0,
      double: 4,
    }
    return values[card.auctionType] || 0
  }

  /**
   * Filter cards by auction type
   */
  function filterByAuctionType(cards: Card[], auctionType: Card['auctionType']): Card[] {
    return cards.filter(card => card.auctionType === auctionType)
  }

  return {
    isValid,
    sameArtist,
    sortByArtist,
    getAuctionTypeValue,
    filterByAuctionType,
  }
}