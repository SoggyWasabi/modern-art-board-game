// ===================
// EASY AI CARD PLAY
// ===================

import type { Card, Artist } from '../../../types/game'
import type { AIDecisionContext } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Easy AI card selection utilities
 * All logic is random but valid
 */
export class EasyAICardPlay {
  private probability = createProbabilityUtils()

  /**
   * Select random card from hand
   */
  selectRandomCard(context: AIDecisionContext): Card | null {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    return this.probability.randomChoice(player.hand)
  }

  /**
   * Prefer cards from random artists (Easy AI doesn't have preferences)
   */
  selectCardByRandomArtist(context: AIDecisionContext): Card | null {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Group cards by artist
    const cardsByArtist: Record<Artist, Card[]> = {} as any
    const artists: Artist[] = ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira']

    artists.forEach(artist => {
      cardsByArtist[artist] = player.hand.filter(card => card.artist === artist)
    })

    // Choose random artist that has cards
    const artistsWithCards = artists.filter(artist => cardsByArtist[artist].length > 0)
    if (artistsWithCards.length === 0) {
      return null
    }

    const randomArtist = this.probability.randomChoice(artistsWithCards)
    const cardsFromArtist = cardsByArtist[randomArtist]

    return this.probability.randomChoice(cardsFromArtist)
  }

  /**
   * Select card based on auction type (random preference)
   */
  selectCardByAuctionType(context: AIDecisionContext): Card | null {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Easy AI has random auction type preferences
    const auctionTypePreferences: Record<string, number> = {
      open: 0.2,
      one_offer: 0.2,
      hidden: 0.2,
      fixed_price: 0.2,
      double: 0.2,
    }

    // Choose cards weighted by auction type preference
    const cardChoices = player.hand.map(card => ({
      card,
      weight: auctionTypePreferences[card.auctionType] || 0.1,
    }))

    return this.probability.weightedRandomChoice(cardChoices)
  }

  /**
   * Check if playing this card would be obviously bad (even Easy AI avoids some mistakes)
   */
  isObviouslyBadCard(card: Card, context: AIDecisionContext): boolean {
    const { gameState, round } = context

    // Check if this would be the 5th card of an artist (ends round)
    const currentCount = gameState.round.cardsPlayedPerArtist[card.artist] || 0
    if (currentCount >= 4) {
      // Easy AI has 30% chance to ignore this and play anyway
      return this.probability.random() > 0.3
    }

    // Check if it's very late in the round and we have few cards
    const totalCardsPlayed = Object.values(gameState.round.cardsPlayedPerArtist)
      .reduce((sum, count) => sum + count, 0)

    if (round.roundNumber >= 3 && totalCardsPlayed > 20 && context.cardEvaluations.length <= 2) {
      // Easy AI has 40% chance to ignore this
      return this.probability.random() > 0.4
    }

    return false
  }

  /**
   * Get random card that isn't obviously bad
   */
  selectNonTerribleCard(context: AIDecisionContext): Card | null {
    const { gameState } = context
    const player = gameState.players[context.playerIndex]

    if (player.hand.length === 0) {
      return null
    }

    // Filter out obviously bad cards (with some randomness)
    const decentCards = player.hand.filter(card => !this.isObviouslyBadCard(card, context))

    if (decentCards.length === 0) {
      // All cards are "bad", just pick randomly
      return this.probability.randomChoice(player.hand)
    }

    return this.probability.randomChoice(decentCards)
  }

  /**
   * Select card with basic randomness
   */
  async selectCard(context: AIDecisionContext): Promise<Card | null> {
    // Easy AI uses different methods randomly
    const method = this.probability.randomInt(1, 4)

    switch (method) {
      case 1:
        return this.selectRandomCard(context)
      case 2:
        return this.selectCardByRandomArtist(context)
      case 3:
        return this.selectCardByAuctionType(context)
      case 4:
        return this.selectNonTerribleCard(context)
      default:
        return this.selectRandomCard(context)
    }
  }

  /**
   * Generate reasoning for card selection
   */
  generateReasoning(card: Card, method: string): string {
    const reasonings = {
      random: `Easy AI: Randomly selected ${card.artist} card`,
      artist: `Easy AI: Randomly chose from ${card.artist} artist`,
      auction: `Easy AI: Selected for ${card.auctionType} auction type`,
      safe: `Easy AI: Chose card that seemed safe to play`,
    }

    return reasonings[method] || reasonings.random
  }
}