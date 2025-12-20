import type { GameState, Player } from '../types/game'
import type { AuctionState } from '../types/auction'
import type { AIDecision } from '../ai/types'
import { MediumAIWrapper } from './mediumAIWrapper'

// Import auction engine functions
import { createDoubleAuction, offerSecondCard, declineToOffer } from '../engine/auction/double'
import { placeBid as placeOpenBid, pass as passOpenBid } from '../engine/auction/open'
import { makeOffer, pass as passOneOffer, acceptHighestBid, auctioneerOutbid, auctioneerTakesFree, concludeAuction } from '../engine/auction/oneOffer'
import { submitBid, revealBids } from '../engine/auction/hidden'
import { buyAtPrice, pass as passFixedPrice, setPrice as setFixedPrice, concludeAuction as concludeFixedPriceAuction } from '../engine/auction/fixedPrice'
import { executeAuction } from '../engine/auction/executor'

/**
 * Orchestrates AI participation in auctions using Medium AI
 * This provides better decision making for testing gameplay
 */
export class AuctionAIOrchestrator {
  private decisionMaker: MediumAIWrapper
  private thinkingStates = new Map<number, { startTime: number; expectedDuration: number }>()

  constructor() {
    this.decisionMaker = new MediumAIWrapper()
  }

  /**
   * Process AI turns for the current auction
   * Returns updated game state if changes were made
   */
  async processAuctionAI(gameState: GameState): Promise<GameState | null> {
    if (gameState.round.phase.type !== 'auction') {
      return null
    }

    const auction = gameState.round.phase.auction
    console.log('Processing AI for auction type:', auction.type)

    // Skip open auctions - they are handled by OpenAuctionAIManager
    if (auction.type === 'open') {
      console.log('Skipping open auction - handled by OpenAuctionAIManager')
      return null
    }

    // Special handling for hidden auctions - process ALL AI players simultaneously
    if (auction.type === 'hidden') {
      return await this.processHiddenAuctionAI(gameState)
    }

    // Find which AI player's turn it is (if any)
    const currentPlayerId = this.getCurrentPlayerId(auction)
    if (!currentPlayerId) {
      console.log('No current player turn found')
      return null
    }

    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer || !currentPlayer.isAI) {
      console.log('Current player is not AI or not found')
      return null
    }

    console.log(`It's ${currentPlayer.name}'s turn`)

    // Check if this AI should act
    if (!(await this.shouldAIAct(auction, currentPlayer, gameState))) {
      console.log(`${currentPlayer.name} should not act`)
      return null
    }

    // Get and apply decision for this single AI player
    const decision = await this.getAIDecision(currentPlayer, auction, gameState)
    if (!decision) {
      console.log(`${currentPlayer.name} returned no decision`)
      return null
    }

    console.log(`${currentPlayer.name} decision:`, decision)

    try {
      let updatedGameState = await this.applyAIDecision(gameState, currentPlayer, decision)
      console.log(`Successfully applied ${currentPlayer.name}'s decision`)

      // Check if auction has concluded after this action
      const auction = updatedGameState.round.phase.auction
      if (auction.type === 'one_offer' && !auction.isActive) {
        console.log('One Offer auction has ended, executing auction result')
        const auctionResult = concludeAuction(auction, updatedGameState.players)
        updatedGameState = executeAuction(updatedGameState, auctionResult, auction.card)
        console.log(`Auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)
      } else if (auction.type === 'fixed_price' && !auction.isActive) {
        console.log('Fixed Price auction has ended, executing auction result')
        const auctionResult = concludeFixedPriceAuction(auction, updatedGameState.players)
        updatedGameState = executeAuction(updatedGameState, auctionResult, auction.card)
        console.log(`Auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)
      }

      return updatedGameState
    } catch (error) {
      console.error(`Failed to apply AI decision for player ${currentPlayer.id}:`, error)
      return null
    }
  }

  /**
   * Process all AI players for hidden auction (simultaneous bidding)
   */
  private async processHiddenAuctionAI(gameState: GameState): Promise<GameState | null> {
    let currentAuction = gameState.round.phase.auction
    if (currentAuction.type !== 'hidden') {
      return null
    }

    console.log('Processing hidden auction AI for all AI players')

    // Get all AI players who haven't submitted bids yet
    const aiPlayers = gameState.players.filter(player =>
      player.isAI &&
      !currentAuction.bids[player.id] &&
      !currentAuction.revealedBids
    )

    if (aiPlayers.length === 0) {
      console.log('No AI players need to bid')
      return null
    }

    console.log(`Found ${aiPlayers.length} AI players who need to bid`)

    // Process all AI players simultaneously
    let updatedGameState = gameState

    for (const player of aiPlayers) {
      // Get the current auction state from the updated game state
      currentAuction = updatedGameState.round.phase.auction

      console.log(`Processing ${player.name}'s hidden bid`)

      // Check if this AI should act (use current auction state)
      if (!(await this.shouldAIAct(currentAuction, player, updatedGameState))) {
        console.log(`${player.name} should not act`)
        continue
      }

      // Get AI decision (use current auction state)
      const decision = await this.getAIDecision(player, currentAuction, updatedGameState)
      if (!decision) {
        console.log(`${player.name} returned no decision`)
        continue
      }

      console.log(`${player.name} decision:`, decision)

      try {
        // Apply the decision
        updatedGameState = await this.applyHiddenAuctionDecision(updatedGameState, player, decision)
        console.log(`Successfully applied ${player.name}'s decision`)
      } catch (error) {
        console.error(`Failed to apply ${player.name}'s decision:`, error)
      }
    }

    return updatedGameState
  }

  /**
   * Apply hidden auction decision for a specific player
   */
  private async applyHiddenAuctionDecision(gameState: GameState, player: Player, decision: AIDecision): Promise<GameState> {
    const auction = gameState.round.phase.auction

    if (decision.type === 'bid') {
      if (decision.action === 'bid' && decision.amount !== undefined) {
        const updatedAuction = submitBid(auction, player.id, decision.amount, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (decision.action === 'pass') {
        const updatedAuction = submitBid(auction, player.id, 0, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      }
    }

    return gameState
  }

  /**
   * Get the current player ID for this auction type
   */
  getCurrentPlayerId(auction: AuctionState): string | null {
    switch (auction.type) {
      case 'one_offer':
        if (auction.phase === 'bidding') {
          return auction.turnOrder[auction.currentTurnIndex]
        } else if (auction.phase === 'auctioneer_decision') {
          return auction.auctioneerId
        }
        return null

      case 'open':
        // Open auctions are free-for-all, return first AI player
        return null

      case 'hidden':
        // Hidden auctions are simultaneous, return first AI player
        return null

      case 'fixed_price':
        return auction.turnOrder[auction.currentTurnIndex]

      case 'double':
        if (!auction.secondCard) {
          return auction.currentAuctioneerId
        }
        return null

      default:
        return null
    }
  }

  /**
   * Check if AI player should act in current auction state
   */
  private async shouldAIAct(auction: AuctionState, player: Player, gameState: GameState): Promise<boolean> {
    const playerIndex = gameState.players.findIndex(p => p.id === player.id)

    switch (auction.type) {
      case 'double':
        // AI should act if it's their turn to offer second card
        if (!auction.secondCard && auction.currentAuctioneerId === player.id) {
          return true
        }
        // If second card is offered, handle based on second card's auction type
        if (auction.secondCard && auction.auctionType !== 'double') {
          return await this.shouldAIActInSubAuction(auction, player, gameState)
        }
        return false

      case 'open':
        // In open auctions, AI can bid anytime (for now, check if it's reasonable to bid)
        return this.shouldAIBidInOpenAuction(auction, player, gameState)

      case 'one_offer':
        // Check if it's AI's turn in the bidding order or auctioneer decision phase
        return this.isAITurnInOneOffer(auction, playerIndex, gameState)

      case 'hidden':
        // AI should submit bid if haven't submitted yet and bids aren't revealed
        return !auction.revealedBids && !auction.bids[player.id]

      case 'fixed_price':
        // Check if it's AI's turn in the fixed price order
        return this.isAITurnInFixedPrice(auction, playerIndex, gameState)

      default:
        return false
    }
  }

  /**
   * Get AI decision for current auction situation
   */
  private async getAIDecision(player: Player, auction: AuctionState, gameState: GameState): Promise<AIDecision | null> {
    console.log(`Getting simplified AI decision for ${player.name}`)

    try {
      const decision = await this.decisionMaker.makeAuctionDecision(player, auction, gameState)
      console.log(`AI decision:`, decision)
      return decision
    } catch (error) {
      console.error(`Error getting AI decision for ${player.name}:`, error)
      return null
    }
  }

  /**
   * Apply AI decision to the auction
   */
  private async applyAIDecision(gameState: GameState, player: Player, decision: AIDecision): Promise<GameState> {
    const playerIndex = gameState.players.findIndex(p => p.id === player.id)
    const auction = gameState.round.phase.auction

    if (auction.type === 'double') {
      return await this.applyDoubleAuctionDecision(gameState, playerIndex, decision)
    } else if (auction.type === 'open') {
      return await this.applyOpenAuctionDecision(gameState, playerIndex, decision)
    } else if (auction.type === 'one_offer') {
      return await this.applyOneOfferAuctionDecision(gameState, playerIndex, decision)
    } else if (auction.type === 'fixed_price') {
      return await this.applyFixedPriceAuctionDecision(gameState, playerIndex, decision)
    }

    return gameState
  }

  /**
   * Apply decisions for Double auction
   */
  private async applyDoubleAuctionDecision(gameState: GameState, playerIndex: number, decision: AIDecision): Promise<GameState> {
    const auction = gameState.round.phase.auction
    const player = gameState.players[playerIndex]

    if (decision.type === 'bid') {
      if (decision.action === 'offer' && auction.currentAuctioneerId === player.id && !auction.secondCard) {
        // Find a matching card in AI's hand
        const matchingCard = player.hand.find(card =>
          card.artist === auction.doubleCard.artist && card.auctionType !== 'double'
        )

        if (matchingCard) {
          const updatedAuction = offerSecondCard(auction, player.id, matchingCard, gameState.players)

          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                type: 'auction',
                auction: updatedAuction
              }
            }
          }
        }
      }
    }

    // If AI decides to offer second card, or any other action
    return gameState
  }

  /**
   * Apply decisions for Open auction
   */
  private async applyOpenAuctionDecision(gameState: GameState, playerIndex: number, decision: AIDecision): Promise<GameState> {
    const auction = gameState.round.phase.auction
    const player = gameState.players[playerIndex]

    if (decision.type === 'bid') {
      if (decision.action === 'bid' && decision.amount) {
        const updatedAuction = placeOpenBid(auction, player.id, decision.amount, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (decision.action === 'pass') {
        const updatedAuction = passOpenBid(auction, player.id)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      }
    }

    return gameState
  }

  /**
   * Apply decisions for One Offer auction
   */
  private async applyOneOfferAuctionDecision(gameState: GameState, playerIndex: number, decision: AIDecision): Promise<GameState> {
    const auction = gameState.round.phase.auction
    const player = gameState.players[playerIndex]

    if (decision.type === 'bid') {
      if (auction.phase === 'bidding' && decision.action === 'bid' && decision.amount) {
        const updatedAuction = makeOffer(auction, player.id, decision.amount, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (auction.phase === 'bidding' && decision.action === 'pass') {
        const updatedAuction = passOneOffer(auction, player.id)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (auction.phase === 'auctioneer_decision' && player.id === auction.auctioneerId) {
        // Handle auctioneer decision
        if (decision.action === 'accept') {
          const updatedAuction = acceptHighestBid(auction)
          console.log(`${player.name} accepted highest bid of ${auction.currentBid}k`)

          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                type: 'auction',
                auction: updatedAuction
              }
            }
          }
        } else if (decision.action === 'outbid' && decision.amount) {
          const updatedAuction = auctioneerOutbid(auction, decision.amount, gameState.players)
          console.log(`${player.name} outbid with ${decision.amount}k`)

          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                type: 'auction',
                auction: updatedAuction
              }
            }
          }
        } else if (decision.action === 'take_free') {
          const updatedAuction = auctioneerTakesFree(auction)
          console.log(`${player.name} took painting for free`)

          return {
            ...gameState,
            round: {
              ...gameState.round,
              phase: {
                type: 'auction',
                auction: updatedAuction
              }
            }
          }
        }
      }
    }

    return gameState
  }

  
  /**
   * Apply decisions for Fixed Price auction
   */
  private async applyFixedPriceAuctionDecision(gameState: GameState, playerIndex: number, decision: AIDecision): Promise<GameState> {
    const auction = gameState.round.phase.auction
    const player = gameState.players[playerIndex]

    if (decision.type === 'bid') {
      if (decision.action === 'set_price' && decision.amount) {
        // AI auctioneer setting the price
        const updatedAuction = setFixedPrice(auction, player.id, decision.amount, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (decision.action === 'buy') {
        const updatedAuction = buyAtPrice(auction, player.id, gameState.players)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      } else if (decision.action === 'pass') {
        const updatedAuction = passFixedPrice(auction, player.id)

        return {
          ...gameState,
          round: {
            ...gameState.round,
            phase: {
              type: 'auction',
              auction: updatedAuction
            }
          }
        }
      }
    }

    return gameState
  }

  /**
   * Helper methods for turn detection
   */
  private async shouldAIActInSubAuction(auction: any, player: Player, gameState: GameState): Promise<boolean> {
    // Handle sub-auction (second card's auction type)
    const subAuction = { ...auction, type: auction.auctionType }
    return this.shouldAIAct(subAuction, player, gameState)
  }

  private shouldAIBidInOpenAuction(auction: any, player: Player, gameState: GameState): boolean {
    // Simple logic: AI should consider bidding if they have enough money
    // This could be enhanced with strategy
    return player.money > auction.currentBid && Math.random() > 0.5 // 50% chance for now
  }

  private isAITurnInOneOffer(auction: any, playerIndex: number, gameState: GameState): boolean {
    const player = gameState.players[playerIndex]
    console.log(`isAITurnInOneOffer for ${player.name}:`, {
      phase: auction.phase,
      currentTurnIndex: auction.currentTurnIndex,
      turnOrder: auction.turnOrder,
      playerId: player.id,
      isCurrentTurn: auction.turnOrder?.[auction.currentTurnIndex] === player.id,
      isAuctioneer: auction.auctioneerId === player.id
    })

    if (auction.phase === 'bidding') {
      // Check if it's AI's turn in the bidding order
      return auction.turnOrder[auction.currentTurnIndex] === player.id
    } else if (auction.phase === 'auctioneer_decision') {
      // Check if AI is the auctioneer
      return auction.auctioneerId === player.id
    }

    return false
  }

  private isAITurnInFixedPrice(auction: any, playerIndex: number, gameState: GameState): boolean {
    const player = gameState.players[playerIndex]
    return auction.turnOrder[auction.currentTurnIndex] === player.id
  }

  /**
   * Get current thinking states for UI feedback
   */
  getThinkingStates(): Map<number, { startTime: number; expectedDuration: number }> {
    return new Map(this.thinkingStates)
  }
}

// Singleton instance
let orchestratorInstance: AuctionAIOrchestrator | null = null

export function getAuctionAIOrchestrator(): AuctionAIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AuctionAIOrchestrator()
  }
  return orchestratorInstance
}