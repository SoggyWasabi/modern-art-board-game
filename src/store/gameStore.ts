import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig, Artist } from '../types'
import { validateAndCreateGame } from '../types/setup'
import { startGame } from '../engine/game'
import { playCard, getNextAuctioneerIndex, shouldRoundEnd, startRound, endRound } from '../engine/round'
import { sellAllPaintingsToBank } from '../engine/selling'
import { getGameController, GameActionHandler } from '../integration/gameIntegration'
import { getAuctionAIOrchestrator } from '../integration/auctionAIOrchestrator'
import { getOpenAuctionAIManager } from '../integration/openAuctionAIManager'
import { getCardSelectionAIOrchestrator } from '../integration/cardSelectionAIOrchestrator'

// Import all auction engine functions
import { placeBid as placeOpenBid, pass as passOpenBid, checkTimerExpiration, endAuctionByTimer, concludeAuction as concludeOpenAuction } from '../engine/auction/open'
import { makeOffer, pass as passOneOffer, acceptHighestBid, auctioneerOutbid, auctioneerTakesFree, concludeAuction } from '../engine/auction/oneOffer'
import { submitBid, revealBids, concludeAuction as concludeHiddenAuction } from '../engine/auction/hidden'
import { buyAtPrice, pass as passFixedPrice, setPrice as setFixedPrice, concludeAuction as concludeFixedPriceAuction } from '../engine/auction/fixedPrice'
import { offerSecondCard, declineToOffer, concludeAuction as concludeDoubleAuction } from '../engine/auction/double'
import { executeAuction } from '../engine/auction/executor'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

/**
 * Helper to get the effective auction for double auctions
 * When a double auction is in bidding phase with an embedded auction,
 * we delegate to the embedded auction for all mechanics
 */
function getEffectiveAuction(auction: AuctionState): AuctionState {
  if (auction.type === 'double' && auction.embeddedAuction) {
    return auction.embeddedAuction
  }
  return auction
}

/**
 * Check if an auction is effectively an open auction (handles embedded case)
 */
function isEffectiveOpenAuction(auction: AuctionState): boolean {
  const effective = getEffectiveAuction(auction)
  return effective.type === 'open'
}

/**
 * Check if an auction is effectively a hidden auction (handles embedded case)
 */
function isEffectiveHiddenAuction(auction: AuctionState): boolean {
  const effective = getEffectiveAuction(auction)
  return effective.type === 'hidden'
}

/**
 * Check if an auction is effectively a fixed price auction (handles embedded case)
 */
function isEffectiveFixedPriceAuction(auction: AuctionState): boolean {
  const effective = getEffectiveAuction(auction)
  return effective.type === 'fixed_price'
}

/**
 * Transition to the next auctioneer after an auction completes
 * This handles the phase transition from auction to awaiting_card_play
 */
function transitionToNextAuctioneer(gameState: GameState): GameState {
  // First check if the round should end
  if (shouldRoundEnd(gameState)) {
    // Round should end - trigger round ending
    // Import the endRound function from round.ts
    const { endRound } = require('../engine/round')
    return endRound(gameState)
  }

  // Get the next auctioneer
  const nextAuctioneerIndex = getNextAuctioneerIndex(gameState)

  console.log(`Transitioning to next auctioneer: player ${nextAuctioneerIndex}`)

  // Create new round state with next auctioneer
  const newRoundState = {
    ...gameState.round,
    currentAuctioneerIndex: nextAuctioneerIndex,
    phase: {
      type: 'awaiting_card_play' as const,
      activePlayerIndex: nextAuctioneerIndex
    }
  }

  return {
    ...gameState,
    round: newRoundState
  }
}

type GameStartPhase = 'idle' | 'dealing' | 'selecting_first_player' | 'ready'

interface GameStore {
  // Setup state
  setupState: SetupState

  // Game state
  gameState: GameState | null

  // UI state
  selectedCardId: string | null
  isGameStarted: boolean

  // Game start sequence state
  gameStartPhase: GameStartPhase
  firstPlayerIndex: number | null
  dealingProgress: number

  // Setup actions
  setPlayerCount: (count: 3 | 4 | 5) => void
  updatePlayerSlot: (slotIndex: number, slot: Partial<PlayerSlotConfig>) => void
  startGameFromSetup: () => void
  resetSetup: () => void

  // Setup helper actions
  initializePlayerSlots: (playerCount: 3 | 4 | 5) => void

  // Game actions
  playCard: (cardId: string) => void
  placeBid: (amount: number) => void
  passBid: () => void
  submitHiddenBid: (amount: number) => void
  setFixedPrice: (price: number) => void
  buyAtFixedPrice: () => void
  passFixedPrice: () => void
  offerSecondCardForDouble: (cardId: string) => void
  declineSecondCardForDouble: () => void
  processAIActionsInAuction: () => void
  processAITurn: () => void

  // UI actions
  selectCard: (cardId: string | null) => void
  deselectCard: () => void

  // Game start sequence actions
  setGameStartPhase: (phase: GameStartPhase) => void
  setDealingProgress: (progress: number) => void
  setFirstPlayerIndex: (index: number) => void
  completeGameStart: () => void

  // Open auction management
  startOpenAuctionAI: () => void
  stopOpenAuctionAI: () => void
  checkOpenAuctionTimer: () => void

  // Utility actions
  resetGame: () => void

  // Round transition actions
  completeRound: () => void
  progressToNextRound: () => void
}

const initialSetupState: SetupState = {
  step: 'player_count',
  gameSetup: {},
  validationErrors: [],
}



export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      setupState: initialSetupState,
      gameState: null,
      selectedCardId: null,
      isGameStarted: false,

      // Game start sequence initial state
      gameStartPhase: 'idle' as GameStartPhase,
      firstPlayerIndex: null,
      dealingProgress: 0,

      // Setup actions
      setPlayerCount: (count) =>
        set(
          (state) => ({
            setupState: {
              ...state.setupState,
              step: 'player_config',
              gameSetup: {
                ...state.setupState.gameSetup,
                playerCount: count,
              },
            },
          }),
          false,
          'setPlayerCount'
        ),

      updatePlayerSlot: (slotIndex, slot) =>
        set(
          (state) => {
            const currentSlots = (state.setupState.gameSetup as any)?.playerSlots || []
            const newSlots = [...currentSlots]
            newSlots[slotIndex] = { ...newSlots[slotIndex], ...slot }

            return {
              setupState: {
                ...state.setupState,
                gameSetup: {
                  ...state.setupState.gameSetup,
                  playerSlots: newSlots,
                },
              },
            }
          },
          false,
          'updatePlayerSlot'
        ),

      startGameFromSetup: () => {
        const { setupState } = get()
        const { gameSetup } = setupState

        console.log('startGameFromSetup: setupState:', setupState)
        console.log('startGameFromSetup: gameSetup:', gameSetup)

        // Get player count from setup
        const playerCount = (gameSetup as any)?.playerCount || 3
        console.log('Player count:', playerCount)

        // Get player slots from setup
        const playerSlots = (gameSetup as any)?.playerSlots || []
        console.log('Player slots:', playerSlots)

        // Create engine setup based on the actual player selection
        const players = []

        // Always add human player first
        players.push({
          id: 'player_0',
          name: 'You',
          type: 'human' as const
        })

        // Add AI players based on player count
        for (let i = 1; i < playerCount; i++) {
          players.push({
            id: `player_${i}`,
            name: `AI Player ${i}`,
            type: 'ai' as const,
            aiDifficulty: 'medium' as const
          })
        }

        const engineSetup = {
          players,
          playerCount: players.length as 3 | 4 | 5,
          startingMoney: 100 // Default starting money
        }

        console.log('Using engine setup:', engineSetup)

        // Use engine to create proper game state
        const gameState = startGame(engineSetup)

        console.log('Game state created:', {
          playerCount: gameState.players.length,
          deckSize: gameState.deck.length,
          handsDealt: gameState.players.map(p => p.hand.length),
          sampleCards: gameState.players[0]?.hand.slice(0, 3).map(c => ({ artist: c.artist, auctionType: c.auctionType }))
        })

        set(
          {
            gameState,
            isGameStarted: true,
            firstPlayerIndex: 0,
            setupState: {
              ...setupState,
              step: 'ready_to_start',
            },
          },
          false,
          'startGameFromSetup'
        )
      },

      resetSetup: () =>
        set(
          {
            setupState: initialSetupState,
            gameState: null,
            isGameStarted: false,
            selectedCardId: null,
          },
          false,
          'resetSetup'
        ),

      initializePlayerSlots: (playerCount) => {
        const slots = Array.from({ length: 5 }, (_, i) => ({
          slotIndex: i,
          type: i === 0 ? 'human' : (i < playerCount ? 'ai' : 'empty') as 'human' | 'ai' | 'empty',
          color: PLAYER_COLORS[i],
          aiDifficulty: i > 0 && i < playerCount ? 'medium' as const : undefined,
        }))

        slots.forEach((slot, index) => {
          get().updatePlayerSlot(index, slot)
        })
      },

      // Game actions with engine integration - simplified and more robust
      playCard: async (cardId: string) => {
        const { gameState } = get()
        if (!gameState) {
          console.error('No game state available')
          return
        }

        console.log('Store playCard called with:', { cardId, phase: gameState.round.phase.type })

        try {
          // Validate action
          const player = gameState.players[0]
          const cardIndex = player.hand.findIndex(c => c.id === cardId)

          if (cardIndex === -1) {
            console.error('Card not found in hand')
            alert('Card not found in hand')
            return
          }

          if (gameState.round.phase.type !== 'awaiting_card_play') {
            console.error('Cannot play card in current phase')
            alert('Cannot play card right now')
            return
          }

          if (gameState.round.phase.activePlayerIndex !== 0) {
            console.error('Not your turn')
            alert("It's not your turn")
            return
          }

          // Optimistic update - immediately remove card from hand
          const newHand = [...player.hand]
          const playedCard = newHand.splice(cardIndex, 1)[0]

          const tempGameState = {
            ...gameState,
            players: [
              {
                ...player,
                hand: newHand
              },
              ...gameState.players.slice(1)
            ]
          }

          // Update UI immediately for better UX
          set(
            { gameState: tempGameState, selectedCardId: null },
            false,
            'playCard_optimistic'
          )

          // Then call engine (synchronously for now)
          const newGameState = playCard(gameState, 0, cardIndex)

          console.log('Engine returned new state:', newGameState.round.phase.type)

          // Update with actual engine state
          set(
            { gameState: newGameState },
            false,
            'playCard_success'
          )

          // If auction started, process AI turns for all auction types
          if (newGameState.round.phase.type === 'auction') {
            setTimeout(() => {
              get().processAIActionsInAuction()
            }, 1000) // Give user time to see the auction
          }

        } catch (error) {
          console.error('Error playing card:', error)
          // Revert optimistic update by restoring original state
          set(
            { gameState },
            false,
            'playCard_error'
          )
          alert(`Error playing card: ${error.message}`)
        }
      },

      // Process AI actions in auctions
      processAIActionsInAuction: async () => {
        const { gameState } = get()
        if (!gameState || gameState.round.phase.type !== 'auction') {
          return
        }

        console.log('Processing AI actions in auction...')
        const auction = gameState.round.phase.auction

        // Start Open Auction AI Manager for open auctions
        if (isEffectiveOpenAuction(auction)) {
          console.log('Starting Open Auction AI Manager for new auction')
          get().startOpenAuctionAI()
          return // Open auctions are handled by AI manager, not orchestrator
        }

        const orchestrator = getAuctionAIOrchestrator()
        const result = await orchestrator.processAuctionAI(gameState)

        if (result.gameState) {
          console.log('AI actions processed, updating game state')

          let updatedGameState = result.gameState

          // For hidden auctions, merge with current state to preserve human bids
          // that may have been submitted while AI was processing
          const { gameState: currentState } = get()
          if (currentState &&
              currentState.round.phase.type === 'auction' &&
              isEffectiveHiddenAuction(currentState.round.phase.auction) &&
              updatedGameState.round.phase.type === 'auction' &&
              isEffectiveHiddenAuction(updatedGameState.round.phase.auction)) {
            const currentAuction = currentState.round.phase.auction
            const aiAuction = updatedGameState.round.phase.auction

            // Get the actual hidden auction (could be embedded in double auction)
            const currentHidden = getEffectiveAuction(currentAuction)
            const aiHidden = getEffectiveAuction(aiAuction)

            if (currentHidden.type === 'hidden' && aiHidden.type === 'hidden') {
              // Merge bids - keep any bids from current state that AI state doesn't have
              const mergedBids = { ...aiHidden.bids }
              for (const [playerId, bid] of Object.entries(currentHidden.bids)) {
                if (mergedBids[playerId] === undefined) {
                  mergedBids[playerId] = bid
                  console.log(`Preserved human bid from ${playerId}: ${bid}`)
                }
              }

              // Update readyToReveal based on merged bids
              const allPlayersCount = currentState.players.length
              const submittedBidsCount = Object.keys(mergedBids).length
              const readyToReveal = submittedBidsCount >= allPlayersCount

              // Update the embedded auction with merged bids
              const mergedAuction = currentAuction.type === 'double'
                ? {
                    ...currentAuction,
                    embeddedAuction: {
                      ...currentHidden,
                      bids: mergedBids,
                      readyToReveal
                    }
                  }
                : {
                    ...currentHidden,
                    bids: mergedBids,
                    readyToReveal
                  }

              updatedGameState = {
                ...updatedGameState,
                round: {
                  ...updatedGameState.round,
                  phase: {
                    type: 'auction',
                    auction: mergedAuction
                  }
                }
              }
            }
          }

          set(
            { gameState: updatedGameState },
            false,
            'ai_actions_processed'
          )

          // KEY FIX: If AI offered a second card in double auction, continue processing
          // This ensures AI players act in the newly created embedded auction
          if (result.shouldContinue) {
            console.log('AI offered second card in double auction, continuing AI processing for embedded auction...')
            setTimeout(() => {
              get().processAIActionsInAuction()
            }, 500)
            return
          }

          // For hidden auctions, check if all bids are in and trigger reveal
          if (updatedGameState.round.phase.type === 'auction' &&
              isEffectiveHiddenAuction(updatedGameState.round.phase.auction)) {
            const currentAuction = updatedGameState.round.phase.auction
            const effectiveAuction = getEffectiveAuction(currentAuction)
            if (effectiveAuction.type === 'hidden' && effectiveAuction.readyToReveal && !effectiveAuction.revealedBids) {
              console.log('All hidden bids submitted, triggering reveal...')
              setTimeout(() => {
                const { gameState: currentGameState } = get()
                if (currentGameState && currentGameState.round.phase.type === 'auction') {
                  const currentAuction = currentGameState.round.phase.auction
                  const effectiveAuction = getEffectiveAuction(currentAuction)
                  if (effectiveAuction.type === 'hidden' && effectiveAuction.readyToReveal && !effectiveAuction.revealedBids) {
                    // Reveal the bids
                    const revealedAuction = revealBids(effectiveAuction)

                    // Update with revealed bids (handle both embedded and standalone)
                    const updatedAuction = currentAuction.type === 'double'
                      ? { ...currentAuction, embeddedAuction: revealedAuction }
                      : revealedAuction

                    set(
                      {
                        gameState: {
                          ...currentGameState,
                          round: {
                            ...currentGameState.round,
                            phase: {
                              type: 'auction',
                              auction: updatedAuction
                            }
                          }
                        }
                      },
                      false,
                      'revealHiddenBids_fromAI'
                    )

                    // After revealing, conclude the auction and execute it
                    setTimeout(() => {
                      const { gameState: newGameState } = get()
                      if (newGameState && newGameState.round.phase.type === 'auction') {
                        const finalAuction = newGameState.round.phase.auction
                        const finalEffective = getEffectiveAuction(finalAuction)
                        if (finalEffective.type === 'hidden' && finalEffective.revealedBids) {
                          // Conclude the auction
                          const auctionResult = concludeHiddenAuction(finalEffective, newGameState.players)
                          console.log(`Hidden auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                          // Get the card(s) for execution
                          const cards = finalAuction.type === 'double' && finalAuction.secondCard
                            ? [finalAuction.doubleCard, finalAuction.secondCard]
                            : [finalEffective.card]

                          // Execute the auction (transfer money, card, etc.)
                          const executedGameState = executeAuction(
                            {
                              ...newGameState,
                              round: {
                                ...newGameState.round,
                                phase: {
                                  type: 'auction',
                                  auction: finalAuction
                                }
                              }
                            },
                            auctionResult,
                            cards[0], // Primary card
                            cards[1]  // Second card for double auctions
                          )

                          // Transition to next auctioneer
                          const finalGameState = transitionToNextAuctioneer(executedGameState)

                          set(
                            { gameState: finalGameState },
                            false,
                            'hiddenAuction_concluded_fromAI'
                          )

                          // Check if round should continue
                          setTimeout(() => {
                            const { gameState: nextGameState } = get()
                            if (nextGameState && nextGameState.round.phase.type === 'awaiting_card_play') {
                              // Check if it's an AI's turn to play a card
                              if (nextGameState.round.phase.activePlayerIndex !== 0) {
                                get().processAITurn()
                              }
                            }
                          }, 2000)
                        }
                      }
                    }, 1500)
                  }
                }
              }, 1000)
              return // Don't continue to check for more AI turns
            }
          }

          // Check for concluded auctions that need execution
          // This handles fixed price, one_offer, and other auctions that conclude during AI processing
          if (updatedGameState.round.phase.type === 'auction') {
            const currentAuction = updatedGameState.round.phase.auction
            const effectiveAuction = getEffectiveAuction(currentAuction)

            // Check if auction has concluded (not active)
            if (!effectiveAuction.isActive) {

              // Handle double auctions with embedded auctions
              if (currentAuction.type === 'double' && currentAuction.embeddedAuction) {
                // For embedded auctions, we need to call the appropriate conclude function
                // to get the AuctionResult with winner/salePrice
                const embedded = currentAuction.embeddedAuction
                let embeddedAuctionResult
                if (embedded.type === 'one_offer') {
                  embeddedAuctionResult = concludeAuction(embedded, updatedGameState.players)
                } else if (embedded.type === 'open') {
                  embeddedAuctionResult = concludeOpenAuction(embedded, updatedGameState.players)
                } else if (embedded.type === 'hidden') {
                  embeddedAuctionResult = concludeHiddenAuction(embedded, updatedGameState.players)
                } else if (embedded.type === 'fixed_price') {
                  embeddedAuctionResult = concludeFixedPriceAuction(embedded, updatedGameState.players)
                }

                if (embeddedAuctionResult) {
                  console.log(`Double auction executed: ${embeddedAuctionResult.winnerId} won for $${embeddedAuctionResult.salePrice}k`)

                  const cards = currentAuction.secondCard
                    ? [currentAuction.doubleCard, currentAuction.secondCard]
                    : [currentAuction.doubleCard]

                  const executedGameState = executeAuction(
                    updatedGameState,
                    embeddedAuctionResult,
                    cards[0],
                    cards[1]
                  )

                  // Transition to next auctioneer
                  const finalGameState = transitionToNextAuctioneer(executedGameState)

                  set(
                    { gameState: finalGameState },
                    false,
                    'auction_concluded_from_ai'
                  )

                  // Check if round should continue
                  setTimeout(() => {
                    const { gameState: nextGameState } = get()
                    if (nextGameState && nextGameState.round.phase.type === 'awaiting_card_play') {
                      if (nextGameState.round.phase.activePlayerIndex !== 0) {
                        get().processAITurn()
                      }
                    }
                  }, 1500)
                  return // Auction executed, don't continue processing
                }
              } else {
                // Handle regular auctions (one_offer, fixed_price, etc.)
                let auctionResult
                if (effectiveAuction.type === 'one_offer') {
                  auctionResult = concludeAuction(effectiveAuction, updatedGameState.players)
                } else if (effectiveAuction.type === 'fixed_price') {
                  auctionResult = concludeFixedPriceAuction(effectiveAuction, updatedGameState.players)
                } else if (effectiveAuction.type === 'open') {
                  auctionResult = concludeOpenAuction(effectiveAuction, updatedGameState.players)
                }

                if (auctionResult) {
                  console.log(`Auction executed: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                  const executedGameState = executeAuction(
                    updatedGameState,
                    auctionResult,
                    effectiveAuction.type === 'double' ? effectiveAuction.doubleCard : effectiveAuction.card
                  )

                  // Transition to next auctioneer
                  const finalGameState = transitionToNextAuctioneer(executedGameState)

                  set(
                    { gameState: finalGameState },
                    false,
                    'auction_concluded_from_ai'
                  )

                  // Check if round should continue
                  setTimeout(() => {
                    const { gameState: nextGameState } = get()
                    if (nextGameState && nextGameState.round.phase.type === 'awaiting_card_play') {
                      if (nextGameState.round.phase.activePlayerIndex !== 0) {
                        get().processAITurn()
                      }
                    }
                  }, 1500)
                  return // Auction executed, don't continue processing
                }
              }
            }
          }

          // Check if we should continue processing AI turns
          // Add a small delay before checking for next AI turn
          setTimeout(() => {
            const { gameState: newGameState } = get()
            if (newGameState && newGameState.round.phase.type === 'auction') {
              // Check if it's still an AI's turn
              const auction = newGameState.round.phase.auction
              const currentPlayerId = orchestrator.getCurrentPlayerId?.(auction)
              const currentPlayer = newGameState.players.find(p => p.id === currentPlayerId)

              if (currentPlayer && currentPlayer.isAI) {
                console.log('Continuing to next AI turn...')
                get().processAIActionsInAuction()
              }
            }
          }, 1500)
        }
      },

      placeBid: async (amount: number) => {
        const { gameState } = get()
        if (!gameState) {
          console.error('No game state available')
          return
        }

        console.log('Placing bid:', amount)

        try {
          const player = gameState.players[0]

          // Check if we're in auction phase
          if (gameState.round.phase.type !== 'auction') {
            console.error('Cannot place bid: not in auction phase')
            return
          }

          const auction = gameState.round.phase.auction

          // Auction functions now imported at top of file

          let updatedAuction

          switch (auction.type) {
            case 'open':
              updatedAuction = placeOpenBid(auction, player.id, amount, gameState.players)

              // Update AI manager with new state so AI can react to new bids
              const aiManager = getOpenAuctionAIManager()
              if (aiManager.isActive()) {
                const newGameState = {
                  ...gameState,
                  round: {
                    ...gameState.round,
                    phase: {
                      type: 'auction' as const,
                      auction: updatedAuction
                    }
                  }
                }
                aiManager.updateGameState(newGameState)
              }
              break

            case 'one_offer':
              if (auction.phase === 'bidding') {
                updatedAuction = makeOffer(auction, player.id, amount, gameState.players)
              } else if (auction.phase === 'auctioneer_decision') {
                // Auctioneer decision phase
                // acceptHighestBid, auctioneerOutbid, concludeAuction now imported at top
                // executeAuction now imported at top

                if (amount === -1) {
                  // Special value for accepting highest bid
                  updatedAuction = acceptHighestBid(auction)
                  console.log('Auctioneer accepted highest bid')
                } else if (amount === -2) {
                  // Special value for taking painting for free
                  // auctioneerTakesFree now imported at top
                  updatedAuction = auctioneerTakesFree(auction)
                  console.log('Auctioneer takes painting for free')
                } else {
                  // Auctioneer is outbidding
                  updatedAuction = auctioneerOutbid(auction, amount, gameState.players)
                  console.log(`Auctioneer outbid with ${amount}k`)
                }

                // Conclude the auction immediately after auctioneer decision
                if (!updatedAuction.isActive) {
                  const auctionResult = concludeAuction(updatedAuction, gameState.players)
                  console.log(`Auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                  // Execute the auction (transfer money, card, etc.)
                  const executedGameState = executeAuction(
                    {
                      ...gameState,
                      round: {
                        ...gameState.round,
                        phase: {
                          type: 'auction',
                          auction: updatedAuction
                        }
                      }
                    },
                    auctionResult,
                    updatedAuction.card
                  )

                  // Transition to next auctioneer
                  const finalGameState = transitionToNextAuctioneer(executedGameState)

                  set(
                    { gameState: finalGameState },
                    false,
                    'placeBid_auctioneer_concluded'
                  )

                  // Check if round should continue
                  setTimeout(() => {
                    const { gameState: newGameState } = get()
                    if (newGameState && newGameState.round.phase.type === 'awaiting_card_play') {
                      // Check if it's an AI's turn to play a card
                      if (newGameState.round.phase.activePlayerIndex !== 0) {
                        get().processAITurn()
                      }
                    }
                  }, 1500)

                  return // Exit early since auction is concluded
                }
              } else {
                console.error('Cannot bid in this phase')
                return
              }
              break

            case 'hidden':
              updatedAuction = submitBid(auction, player.id, amount, gameState.players)
              break

            case 'fixed_price':
              // Check if we're in price setting phase (price = 0)
              if (auction.price === 0) {
                // Auctioneer setting the price
                if (player.id === auction.auctioneerId && amount > 0) {
                  updatedAuction = setFixedPrice(auction, player.id, amount, gameState.players)
                } else {
                  console.error('Only auctioneer can set price')
                  return
                }
              } else {
                // Buying phase - player buying at fixed price
                if (amount === -1) {
                  // Special signal for "buy at fixed price"
                  updatedAuction = buyAtPrice(auction, player.id, gameState.players)
                } else {
                  console.error('Use buy action to purchase at fixed price')
                  return
                }
              }
              break

            case 'double':
              // Handle Double auctions by delegating to embedded auction
              if (auction.embeddedAuction) {
                console.log('Double auction: delegating to embedded auction type:', auction.embeddedAuction.type)

                // Handle the bid based on embedded auction type
                const embeddedAuction = auction.embeddedAuction
                let updatedEmbeddedAuction

                switch (embeddedAuction.type) {
                  case 'one_offer':
                    if (embeddedAuction.phase === 'bidding') {
                      updatedEmbeddedAuction = makeOffer(embeddedAuction, player.id, amount, gameState.players)
                    } else if (embeddedAuction.phase === 'auctioneer_decision') {
                      if (amount === -1) {
                        updatedEmbeddedAuction = acceptHighestBid(embeddedAuction)
                        console.log('Auctioneer accepted highest bid')
                      } else if (amount === -2) {
                        updatedEmbeddedAuction = auctioneerTakesFree(embeddedAuction)
                        console.log('Auctioneer takes painting for free')
                      } else {
                        updatedEmbeddedAuction = auctioneerOutbid(embeddedAuction, amount, gameState.players)
                        console.log(`Auctioneer outbid with ${amount}k`)
                      }
                    }
                    break

                  case 'open':
                    updatedEmbeddedAuction = placeOpenBid(embeddedAuction, player.id, amount, gameState.players)

                    // Update AI manager with new state so AI can react to new bids
                    const aiManager = getOpenAuctionAIManager()
                    if (aiManager.isActive()) {
                      const newGameState = {
                        ...gameState,
                        round: {
                          ...gameState.round,
                          phase: {
                            type: 'auction' as const,
                            auction: {
                              ...auction,
                              embeddedAuction: updatedEmbeddedAuction
                            }
                          }
                        }
                      }
                      aiManager.updateGameState(newGameState)
                    }
                    break

                  case 'hidden':
                    updatedEmbeddedAuction = submitBid(embeddedAuction, player.id, amount, gameState.players)
                    break

                  case 'fixed_price':
                    // Check if we're in price setting phase (price = 0)
                    if (embeddedAuction.price === 0) {
                      // Auctioneer setting the price
                      if (player.id === embeddedAuction.auctioneerId && amount > 0) {
                        updatedEmbeddedAuction = setFixedPrice(embeddedAuction, player.id, amount, gameState.players)
                      } else {
                        console.error('Only auctioneer can set price')
                        return
                      }
                    } else {
                      // Buying phase - player buying at fixed price
                      if (amount === -1) {
                        updatedEmbeddedAuction = buyAtPrice(embeddedAuction, player.id, gameState.players)
                      } else {
                        console.error('Use buy action to purchase at fixed price')
                        return
                      }
                    }
                    break
                }

                if (updatedEmbeddedAuction) {
                  updatedAuction = {
                    ...auction,
                    embeddedAuction: updatedEmbeddedAuction
                  }

                  // Check if the embedded auction has concluded
                  if (!updatedEmbeddedAuction.isActive) {
                    // Get the result from the embedded auction
                    let embeddedAuctionResult
                    if (embeddedAuction.type === 'one_offer') {
                      embeddedAuctionResult = concludeAuction(updatedEmbeddedAuction, gameState.players)
                    } else if (embeddedAuction.type === 'open') {
                      embeddedAuctionResult = concludeOpenAuction(updatedEmbeddedAuction, gameState.players)
                    } else if (embeddedAuction.type === 'hidden') {
                      embeddedAuctionResult = concludeHiddenAuction(updatedEmbeddedAuction, gameState.players)
                    } else if (embeddedAuction.type === 'fixed_price') {
                      embeddedAuctionResult = concludeFixedPriceAuction(updatedEmbeddedAuction, gameState.players)
                    }

                    if (embeddedAuctionResult) {
                      console.log(`Embedded auction concluded: ${embeddedAuctionResult.winnerId} won for $${embeddedAuctionResult.salePrice}k`)

                      // Transfer the result to the Double auction
                      updatedAuction = {
                        ...updatedAuction,
                        sold: true,
                        isActive: false,
                        winnerId: embeddedAuctionResult.winnerId,
                        finalPrice: embeddedAuctionResult.salePrice
                      }

                      // Now conclude the Double auction
                      const doubleAuctionResult = concludeDoubleAuction(updatedAuction, gameState.players)
                      console.log(`Double auction concluded: ${doubleAuctionResult.winnerId} won for $${doubleAuctionResult.salePrice}k`)

                      // Execute the auction (transfer money, cards, etc.)
                      const executedGameState = executeAuction(
                        {
                          ...gameState,
                          round: {
                            ...gameState.round,
                            phase: {
                              type: 'auction',
                              auction: updatedAuction
                            }
                          }
                        },
                        doubleAuctionResult,
                        auction.doubleCard, // Double card is the primary card
                        auction.secondCard   // Second card for Double auctions
                      )

                      // Transition to next auctioneer
                      const finalGameState = transitionToNextAuctioneer(executedGameState)

                    set(
                      { gameState: finalGameState },
                      false,
                      'placeBid_double_auction_concluded'
                    )

                    // Check if round should continue
                    setTimeout(() => {
                      const { gameState: newGameState } = get()
                      if (newGameState && newGameState.round.phase.type === 'awaiting_card_play') {
                        // Check if it's an AI's turn to play a card
                        if (newGameState.round.phase.activePlayerIndex !== 0) {
                          get().processAITurn()
                        }
                      }
                    }, 1500)

                    return // Exit early since auction is concluded
                  }
                }
                // Note: If the embedded auction is still active (e.g., fixed price waiting for buyers,
                // open auction with active timer), we continue below to update the game state normally.
                // This is not an error - it's the expected behavior for these auction types.
              }
              } else {
                console.error('Double auction has no embedded auction to handle bid')
                return
              }
              break

            default:
              console.error('Auction type not implemented:', auction.type)
              return
          }

          // Update game state
          set(
            {
              gameState: {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              }
            },
            false,
            'placeBid'
          )

          // Check if fixed price auction has ended (someone bought or everyone passed)
          if (isEffectiveFixedPriceAuction(auction) && !updatedAuction.isActive) {
            // Get the effective auction (could be embedded in double auction)
            const effectiveAuction = getEffectiveAuction(updatedAuction)
            if (effectiveAuction.type !== 'fixed_price') {
              console.error('Expected fixed price auction but got:', effectiveAuction.type)
              return
            }

            const auctionResult = concludeFixedPriceAuction(effectiveAuction, gameState.players)
            console.log(`Fixed price auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

            // Get the card(s) for execution
            const cards = auction.type === 'double' && auction.secondCard
              ? [auction.doubleCard, auction.secondCard]
              : [effectiveAuction.card]

            // Execute the auction (transfer money, card, etc.)
            const executedGameState = executeAuction(
              {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              },
              auctionResult,
              cards[0], // Primary card
              cards[1]  // Second card for double auctions
            )

            // Transition to next auctioneer
            const finalGameState = transitionToNextAuctioneer(executedGameState)

            console.log('Fixed price auction executed successfully')

            // Update with final state
            set(
              { gameState: finalGameState },
              false,
              'fixed_price_auction_executed'
            )

            // Check if we should transition to next turn
            if (finalGameState && finalGameState.round.phase.type === 'awaiting_card_play') {
              setTimeout(() => {
                if (finalGameState.round.phase.type === 'awaiting_card_play' &&
                    finalGameState.round.phase.activePlayerIndex !== 0) {
                  get().processAITurn()
                }
              }, 1500)
            }

            return // Exit early since auction is concluded
          }

          // If all players have acted in One Offer, move to auctioneer decision phase
          if (auction.type === 'one_offer' &&
              updatedAuction.completedTurns.size === updatedAuction.turnOrder.length - 1) {
            // All non-auctioneer players have acted, now it's auctioneer decision time
            // isAuctioneerDecisionPhase now imported at top

            // The engine automatically transitions to auctioneer decision phase when all others have acted
            if (updatedAuction.phase === 'auctioneer_decision') {
              console.log('Moving to auctioneer decision phase')

              // If human is the auctioneer, show decision interface
              // If AI is the auctioneer, let AI make decision
              if (updatedAuction.auctioneerId !== 'player_0') {
                setTimeout(() => {
                  get().processAIActionsInAuction()
                }, 1500)
              }
            }
          } else {
            // For other auction types or ongoing One Offer, process next AI turn
            setTimeout(() => {
              get().processAIActionsInAuction()
            }, 1000)
          }

        } catch (error) {
          console.error('Error placing bid:', error)
          alert(`Error placing bid: ${error.message}`)
        }
      },

      passBid: async () => {
        const { gameState } = get()
        if (!gameState) {
          console.error('No game state available')
          return
        }

        console.log('Passing bid')

        try {
          const player = gameState.players[0]

          // Check if we're in auction phase
          if (gameState.round.phase.type !== 'auction') {
            console.error('Cannot pass bid: not in auction phase')
            return
          }

          const auction = gameState.round.phase.auction

          // Auction functions now imported at top of file

          let updatedAuction

          switch (auction.type) {
            case 'open':
              updatedAuction = passOpenBid(auction, player.id, gameState.players)
              break

            case 'one_offer':
              if (auction.phase === 'bidding') {
                updatedAuction = passOneOffer(auction, player.id)
              } else {
                console.error('Cannot pass during auctioneer decision phase')
                return
              }
              break

            case 'fixed_price':
              updatedAuction = passFixedPrice(auction, player.id)
              break

            default:
              console.error('Pass not implemented for auction type:', auction.type)
              return
          }

          // Update game state
          set(
            {
              gameState: {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              }
            },
            false,
            'passBid'
          )

          // Check if fixed price auction has ended (everyone passed, auctioneer forced to buy)
          if (isEffectiveFixedPriceAuction(auction) && !updatedAuction.isActive) {
            // Get the effective auction (could be embedded in double auction)
            const effectiveAuction = getEffectiveAuction(updatedAuction)
            if (effectiveAuction.type !== 'fixed_price') {
              console.error('Expected fixed price auction but got:', effectiveAuction.type)
              return
            }

            const auctionResult = concludeFixedPriceAuction(effectiveAuction, gameState.players)
            console.log(`Fixed price auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

            // Get the card(s) for execution
            const cards = auction.type === 'double' && auction.secondCard
              ? [auction.doubleCard, auction.secondCard]
              : [effectiveAuction.card]

            // Execute the auction (transfer money, card, etc.)
            const executedGameState = executeAuction(
              {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              },
              auctionResult,
              cards[0], // Primary card
              cards[1]  // Second card for double auctions
            )

            // Transition to next auctioneer
            const finalGameState = transitionToNextAuctioneer(executedGameState)

            console.log('Fixed price auction executed successfully')

            // Update with final state
            set(
              { gameState: finalGameState },
              false,
              'fixed_price_auction_executed'
            )

            // Check if we should transition to next turn
            if (finalGameState && finalGameState.round.phase.type === 'awaiting_card_play') {
              setTimeout(() => {
                if (finalGameState.round.phase.type === 'awaiting_card_play' &&
                    finalGameState.round.phase.activePlayerIndex !== 0) {
                  get().processAITurn()
                }
              }, 1500)
            }

            return // Exit early since auction is concluded
          }

          // If all players have acted in One Offer, move to auctioneer decision
          if (auction.type === 'one_offer' &&
              updatedAuction.completedTurns.size === updatedAuction.turnOrder.length - 1) {
            // Check if auctioneer is AI
            if (auction.auctioneerId !== 'player_0') {
              setTimeout(() => {
                get().processAIActionsInAuction()
              }, 1500)
            }
          } else {
            // For other cases, process next AI turn
            setTimeout(() => {
              get().processAIActionsInAuction()
            }, 1000)
          }

        } catch (error) {
          console.error('Error passing bid:', error)
          alert(`Error passing bid: ${error.message}`)
        }
      },

      submitHiddenBid: async (amount: number) => {
        const { gameState } = get()
        if (!gameState) {
          console.error('No game state available')
          return
        }

        if (gameState.round.phase.type !== 'auction') {
          console.error('Not in auction phase')
          return
        }

        const auction = gameState.round.phase.auction
        const effectiveAuction = getEffectiveAuction(auction)
        if (effectiveAuction.type !== 'hidden') {
          console.error('Not a hidden auction')
          return
        }

        console.log('Submitting hidden bid:', amount)

        try {
          const player = gameState.players[0]
          const updatedHiddenAuction = submitBid(effectiveAuction, player.id, amount, gameState.players)

          // Update the auction state (handle both embedded and standalone)
          const updatedAuction = auction.type === 'double'
            ? { ...auction, embeddedAuction: updatedHiddenAuction }
            : updatedHiddenAuction

          // Update game state
          set(
            {
              gameState: {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              }
            },
            false,
            'submitHiddenBid'
          )

          // If all bids submitted, reveal them after a short delay
          if (updatedHiddenAuction.readyToReveal && !updatedHiddenAuction.revealedBids) {
            setTimeout(() => {
              const { gameState: currentGameState } = get()
              if (currentGameState && currentGameState.round.phase.type === 'auction') {
                const currentAuction = currentGameState.round.phase.auction
                const currentEffective = getEffectiveAuction(currentAuction)
                if (currentEffective.type === 'hidden' && currentEffective.readyToReveal && !currentEffective.revealedBids) {
                  // Reveal the bids
                  const revealedAuction = revealBids(currentEffective)

                  // Update with revealed bids (handle both embedded and standalone)
                  const updatedAuction = currentAuction.type === 'double'
                    ? { ...currentAuction, embeddedAuction: revealedAuction }
                    : revealedAuction

                  set(
                    {
                      gameState: {
                        ...currentGameState,
                        round: {
                          ...currentGameState.round,
                          phase: {
                            type: 'auction',
                            auction: updatedAuction
                          }
                        }
                      }
                    },
                    false,
                    'revealHiddenBids'
                  )

                  // After revealing, conclude the auction and execute it
                  setTimeout(() => {
                    const { gameState: newGameState } = get()
                    if (newGameState && newGameState.round.phase.type === 'auction') {
                      const finalAuction = newGameState.round.phase.auction
                      const finalEffective = getEffectiveAuction(finalAuction)
                      if (finalEffective.type === 'hidden' && finalEffective.revealedBids) {
                        // Conclude the auction
                        const auctionResult = concludeHiddenAuction(finalEffective, newGameState.players)
                        console.log(`Hidden auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                        // Get the card(s) for execution
                        const cards = finalAuction.type === 'double' && finalAuction.secondCard
                          ? [finalAuction.doubleCard, finalAuction.secondCard]
                          : [finalEffective.card]

                        // Execute the auction (transfer money, card, etc.)
                        const executedGameState = executeAuction(
                          {
                            ...newGameState,
                            round: {
                              ...newGameState.round,
                              phase: {
                                type: 'auction',
                                auction: finalAuction
                              }
                            }
                          },
                          auctionResult,
                          cards[0], // Primary card
                          cards[1]  // Second card for double auctions
                        )

                        // Transition to next auctioneer
                        const finalGameState = transitionToNextAuctioneer(executedGameState)

                        set(
                          { gameState: finalGameState },
                          false,
                          'hiddenAuction_concluded'
                        )

                        // Check if round should continue
                        setTimeout(() => {
                          const { gameState: newGameState } = get()
                          if (newGameState && newGameState.round.phase.type === 'awaiting_card_play') {
                            // Check if it's an AI's turn to play a card
                            if (newGameState.round.phase.activePlayerIndex !== 0) {
                              get().processAITurn()
                            }
                          }
                        }, 2000)
                      }
                    }
                  }, 1500)
                }
              }
            }, 1000)
          }

        } catch (error) {
          console.error('Error submitting hidden bid:', error)
          alert(`Error submitting bid: ${error.message}`)
        }
      },

      setFixedPrice: (price: number) => {
        // Delegate to placeBid with price amount (placeBid handles setting the price)
        get().placeBid(price)
      },

      buyAtFixedPrice: () => {
        // Delegate to placeBid with -1 (special signal for buying at fixed price)
        get().placeBid(-1)
      },

      passFixedPrice: () => {
        // Delegate to passBid (passBid handles fixed price passing)
        get().passBid()
      },

      offerSecondCardForDouble: (cardId: string) => {
        const { gameState } = get()
        if (!gameState || gameState.round.phase.type !== 'auction') return

        const auction = gameState.round.phase.auction
        if (auction.type !== 'double') return

        const playerIndex = 0 // Assuming human player is index 0
        const player = gameState.players[playerIndex]

        // Find the card in player's hand
        const card = player.hand.find(c => c.id === cardId)
        if (!card) return

        // Find the card index to remove it from hand
        const cardIndex = player.hand.findIndex(c => c.id === cardId)
        if (cardIndex === -1) return

        try {
          // Use the double auction engine to offer the card
          const updatedAuction = offerSecondCard(auction, player.id, card, gameState.players)

          // Create updated players array with the card removed from player's hand
          const updatedPlayers = [...gameState.players]
          updatedPlayers[playerIndex] = {
            ...player,
            hand: player.hand.filter((_, i) => i !== cardIndex)
          }

          // Increment cards played per artist for the second card
          const newCardsPlayed = { ...gameState.round.cardsPlayedPerArtist }
          newCardsPlayed[card.artist] = (newCardsPlayed[card.artist] || 0) + 1

          // Update game state with the new auction and updated player hand
          set({
            gameState: {
              ...gameState,
              players: updatedPlayers,
              round: {
                ...gameState.round,
                cardsPlayedPerArtist: newCardsPlayed,
                phase: {
                  type: 'auction',
                  auction: updatedAuction
                }
              }
            }
          }, false, 'offerSecondCardForDouble')

          // Process AI for the new auction state
          get().processAIActionsInAuction()

        } catch (error) {
          console.error('Error offering second card:', error)
        }
      },

      declineSecondCardForDouble: () => {
        const { gameState } = get()
        if (!gameState || gameState.round.phase.type !== 'auction') return

        const auction = gameState.round.phase.auction
        if (auction.type !== 'double') return

        const playerIndex = 0 // Assuming human player is index 0
        const player = gameState.players[playerIndex]

        try {
          // Use the double auction engine to decline
          const updatedAuction = declineToOffer(auction, player.id)

          // Update game state with the new auction
          set({
            gameState: {
              ...gameState,
              round: {
                ...gameState.round,
                phase: {
                  type: 'auction',
                  auction: updatedAuction
                }
              }
            }
          }, false, 'declineSecondCardForDouble')

          // Process AI for the next turn
          get().processAIActionsInAuction()

        } catch (error) {
          console.error('Error declining second card:', error)
        }
      },

      // UI actions
      selectCard: (cardId: string | null) =>
        set(
          { selectedCardId: cardId },
          false,
          'selectCard'
        ),

      deselectCard: () =>
        set(
          { selectedCardId: null },
          false,
          'deselectCard'
        ),

      // Game start sequence actions
      setGameStartPhase: (phase) =>
        set(
          { gameStartPhase: phase },
          false,
          'setGameStartPhase'
        ),

      setDealingProgress: (progress) =>
        set(
          { dealingProgress: progress },
          false,
          'setDealingProgress'
        ),

      setFirstPlayerIndex: (index) =>
        set(
          (state) => {
            console.log('[setFirstPlayerIndex] Setting first player to index:', index, {
              firstPlayerIndex: state.firstPlayerIndex,
              currentAuctioneerIndex: state.gameState?.round?.currentAuctioneerIndex,
              activePlayerIndex: state.gameState?.round?.phase?.activePlayerIndex
            })

            // Update the store state
            const newState: any = { firstPlayerIndex: index }

            // Also update the game state's round to set the first player as active
            if (state.gameState) {
              newState.gameState = {
                ...state.gameState,
                round: {
                  ...state.gameState.round,
                  currentAuctioneerIndex: index,
                  phase: {
                    type: 'awaiting_card_play',
                    activePlayerIndex: index
                  }
                }
              }
            }

            return newState
          },
          false,
          'setFirstPlayerIndex'
        ),

      completeGameStart: () =>
        set(
          { gameStartPhase: 'ready' },
          false,
          'completeGameStart'
        ),

      // Open auction management
      startOpenAuctionAI: () => {
        const { gameState } = get()
        if (!gameState || gameState.round.phase.type !== 'auction') {
          return
        }

        const auction = gameState.round.phase.auction
        if (isEffectiveOpenAuction(auction)) {
          const aiManager = getOpenAuctionAIManager()

          // Set up callback for AI to place bids
          aiManager.setPlaceBidCallback((playerId: string, amount: number) => {
            console.log(`AI ${playerId} placing bid of ${amount}k`)

            // Create a copy of current game state for AI bid
            const currentState = get().gameState
            if (!currentState || currentState.round.phase.type !== 'auction') {
              return
            }

            const currentAuction = currentState.round.phase.auction
            const effectiveAuction = getEffectiveAuction(currentAuction)
            if (effectiveAuction.type !== 'open') {
              return
            }

            // Find the AI player
            const aiPlayer = currentState.players.find(p => p.id === playerId)
            if (!aiPlayer || !aiPlayer.isAI) {
              return
            }

            try {
              // Place the bid using the open auction engine
              const updatedAuction = placeOpenBid(effectiveAuction, playerId, amount, currentState.players)

              // Update the auction state (handle both embedded and standalone)
              const finalAuction = currentAuction.type === 'double'
                ? { ...currentAuction, embeddedAuction: updatedAuction }
                : updatedAuction

              const newGameState = {
                ...currentState,
                round: {
                  ...currentState.round,
                  phase: {
                    type: 'auction' as const,
                    auction: finalAuction
                  }
                }
              }

              // Update game state with AI bid
              set(
                { gameState: newGameState },
                false,
                'ai_open_bid'
              )

              // Sync the new state back to the AI manager so other AIs see updated bid
              aiManager.updateGameState(newGameState)

            } catch (error) {
              console.error(`Error placing AI bid for ${playerId}:`, error)
            }
          })

          aiManager.startManaging(gameState)
          console.log('Started Open Auction AI management')
        }
      },

      stopOpenAuctionAI: () => {
        const aiManager = getOpenAuctionAIManager()
        aiManager.stopManaging()
        console.log('Stopped Open Auction AI management')
      },

      checkOpenAuctionTimer: () => {
        const { gameState } = get()
        if (!gameState || gameState.round.phase.type !== 'auction') {
          return
        }

        const auction = gameState.round.phase.auction
        const effectiveAuction = getEffectiveAuction(auction)
        if (effectiveAuction.type === 'open' && checkTimerExpiration(effectiveAuction)) {
          console.log('Open auction timer expired, ending auction')

          // End the auction due to timer expiration
          const endedAuction = endAuctionByTimer(effectiveAuction)

          // Update the auction state (handle both embedded and standalone)
          const updatedAuction = auction.type === 'double'
            ? { ...auction, embeddedAuction: endedAuction }
            : endedAuction

          // Update game state with ended auction
          set(
            {
              gameState: {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: updatedAuction
                  }
                }
              }
            },
            false,
            'open_auction_timer_ended'
          )

          // Stop AI management
          get().stopOpenAuctionAI()

          // Conclude and execute the auction after a short delay
          setTimeout(() => {
            const { gameState: currentGameState } = get()
            if (currentGameState && currentGameState.round.phase.type === 'auction') {
              const currentAuction = currentGameState.round.phase.auction
              const currentEffective = getEffectiveAuction(currentAuction)
              if (currentEffective.type === 'open' && !currentEffective.isActive) {
                // Use the imported concludeOpenAuction function
                const auctionResult = concludeOpenAuction(currentEffective, currentGameState.players)
                console.log(`Open auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                // Get the card(s) for execution
                const cards = currentAuction.type === 'double' && currentAuction.secondCard
                  ? [currentAuction.doubleCard, currentAuction.secondCard]
                  : [currentEffective.card]

                // Debug logging
                console.log('[Open Auction] executeAuction call params:', {
                  auctionType: currentAuction.type,
                  isDoubleAuction: currentAuction.type === 'double',
                  hasSecondCard: !!(currentAuction.type === 'double' && currentAuction.secondCard),
                  effectiveAuctionType: currentEffective.type,
                  cardsArrayLength: cards.length,
                  primaryCardId: cards[0]?.id,
                  primaryCardArtist: cards[0]?.artist,
                  secondCardId: cards[1]?.id,
                  secondCardArtist: cards[1]?.artist
                })

                // Execute the auction (transfer money, card, etc.)
                const executedGameState = executeAuction(
                  {
                    ...currentGameState,
                    round: {
                      ...currentGameState.round,
                      phase: {
                        type: 'auction',
                        auction: currentAuction
                      }
                    }
                  },
                  auctionResult,
                  cards[0], // Primary card
                  cards[1]  // Second card for double auctions
                )

                // Transition to next auctioneer
                const finalGameState = transitionToNextAuctioneer(executedGameState)

                set(
                  { gameState: finalGameState },
                  false,
                  'open_auction_executed'
                )

                // Check if round should continue
                setTimeout(() => {
                  const { gameState: newGameState } = get()
                  if (newGameState && newGameState.round.phase.type === 'awaiting_card_play') {
                    // Check if it's an AI's turn to play a card
                    if (newGameState.round.phase.activePlayerIndex !== 0) {
                      get().processAITurn()
                    }
                  }
                }, 1500)
              }
            }
          }, 1000)
        }
      },

      processAITurn: async () => {
        const { gameState } = get()
        if (!gameState) {
          console.log('No game state available for AI turn')
          return
        }

        const phase = gameState.round.phase

        // Only process AI turns during awaiting_card_play phase
        if (phase.type !== 'awaiting_card_play') {
          console.log('Not in awaiting_card_play phase, skipping AI turn')
          return
        }

        const activePlayerIndex = phase.activePlayerIndex
        const activePlayer = gameState.players[activePlayerIndex]

        if (!activePlayer || !activePlayer.isAI) {
          console.log(`Player at index ${activePlayerIndex} is not an AI or not found`)
          return
        }

        console.log(`Processing AI turn for ${activePlayer.name}...`)

        // Get the card selection orchestrator
        const cardOrchestrator = getCardSelectionAIOrchestrator()

        try {
          // Have the AI select a card to play
          const selectedCard = await cardOrchestrator.processAICardSelection(activePlayer, gameState)

          if (!selectedCard) {
            console.log(`${activePlayer.name} has no cards to play`)
            // Check if round should end due to no cards
            if (shouldRoundEnd(gameState)) {
              // Round should end - transition to selling phase
              console.log('All players out of cards, ending round')
              // The round ending logic will be handled elsewhere
            }
            return
          }

          // Find the card index in the player's hand
          const cardIndex = activePlayer.hand.findIndex(c => c.id === selectedCard.id)
          if (cardIndex === -1) {
            console.error(`Selected card ${selectedCard.id} not found in ${activePlayer.name}'s hand`)
            return
          }

          console.log(`${activePlayer.name} playing ${selectedCard.artist} (${selectedCard.auctionType})`)

          // Play the card using the round engine
          const newGameState = playCard(gameState, activePlayerIndex, cardIndex)

          // Update game state
          set(
            { gameState: newGameState },
            false,
            'ai_played_card'
          )

          // Check if we started an auction - if so, trigger AI auction processing
          if (newGameState.round.phase.type === 'auction') {
            console.log('Auction started by AI, triggering AI auction processing')

            // Small delay before starting auction AI
            setTimeout(() => {
              const { gameState: currentGameState } = get()
              if (currentGameState && currentGameState.round.phase.type === 'auction') {
                // Start open auction AI if applicable
                const auction = currentGameState.round.phase.auction
                if (auction.type === 'open' ||
                    (auction.type === 'double' && auction.embeddedAuction?.type === 'open')) {
                  get().startOpenAuctionAI()
                } else {
                  // For other auction types, use the orchestrator
                  get().processAIActionsInAuction()
                }
              }
            }, 1000)
          } else if (newGameState.round.phase.type === 'round_ending') {
            console.log('Round ending (5th card played)')

            // Auto-trigger endRound() to transition to selling_to_bank phase
            setTimeout(() => {
              const { gameState: currentGameState } = get()
              if (currentGameState && currentGameState.round.phase.type === 'round_ending') {
                console.log('[playCard] Auto-triggering endRound() to transition to selling_to_bank')

                // Call endRound to rank artists and transition to selling_to_bank
                const endedRoundState = endRound(currentGameState)

                set(
                  { gameState: endedRoundState },
                  false,
                  'endRound_from_5th_card'
                )
              }
            }, 1500) // Wait 1.5s to show the 5th card before transitioning
          } else if (newGameState.round.phase.type === 'awaiting_card_play') {
            // Continue to next player if it's their turn
            setTimeout(() => {
              const { gameState: nextGameState } = get()
              if (nextGameState && nextGameState.round.phase.type === 'awaiting_card_play') {
                const nextPlayerIndex = nextGameState.round.phase.activePlayerIndex
                if (nextPlayerIndex !== 0) {
                  get().processAITurn()
                }
              }
            }, 1500)
          }

        } catch (error) {
          console.error(`Error processing AI turn for ${activePlayer.name}:`, error)
        }
      },

      // Utility actions
      resetGame: () =>
        set(
          {
            gameState: null,
            isGameStarted: false,
            selectedCardId: null,
            setupState: initialSetupState,
            gameStartPhase: 'idle' as GameStartPhase,
            firstPlayerIndex: null,
            dealingProgress: 0,
          },
          false,
          'resetGame'
        ),

      // Round transition actions
      /**
       * Complete the current round
       * Transitions from selling_to_bank phase to round_complete phase
       * Called after animations have finished showing payouts
       */
      completeRound: () => {
        const { gameState } = get()
        if (!gameState) return

        // Only proceed if we're in selling_to_bank phase
        if (gameState.round.phase.type !== 'selling_to_bank') {
          console.log('[completeRound] Not in selling_to_bank phase, skipping')
          return
        }

        console.log('[completeRound] Completing round, transitioning to round_complete')

        // Sell all paintings to the bank and clear purchasedThisRound
        let updatedGameState = sellAllPaintingsToBank(gameState)

        // Clear purchasedThisRound for all players (move to purchases if needed)
        updatedGameState = {
          ...updatedGameState,
          players: updatedGameState.players.map(player => {
            // Move purchasedThisRound cards to purchases
            const newPaintings = [
              ...(player.purchases || []),
              ...player.purchasedThisRound.map(card => ({
                card,
                artist: card.artist,
                auctionPrice: 0, // Will be set when sold
                salePrice: undefined as number | undefined,
                soldRound: undefined as number | undefined
              }))
            ]
            return {
              ...player,
              purchasedThisRound: [],
              purchases: newPaintings
            }
          }),
          // Transition to round_complete phase
          round: {
            ...updatedGameState.round,
            phase: { type: 'round_complete' }
          }
        }

        set(
          { gameState: updatedGameState },
          false,
          'completeRound'
        )
      },

      /**
       * Progress to the next round
       * Called after round_complete phase and card dealing animation
       * Starts the next round, deals cards, and rotates auctioneer
       */
      progressToNextRound: () => {
        const { gameState } = get()
        if (!gameState) return

        // Only proceed if we're in round_complete phase
        if (gameState.round.phase.type !== 'round_complete') {
          console.log('[progressToNextRound] Not in round_complete phase, skipping')
          return
        }

        const currentRoundNumber = gameState.round.roundNumber
        const nextRoundNumber = (currentRoundNumber + 1) as 1 | 2 | 3 | 4

        console.log(`[progressToNextRound] Progressing from round ${currentRoundNumber} to ${nextRoundNumber}`)

        // Check if game is over (after round 4)
        if (currentRoundNumber >= 4) {
          console.log('[progressToNextRound] Game is over after round 4')
          // TODO: Handle game over state
          return
        }

        // Start the next round (deals cards, sets up phase)
        const nextRoundState = startRound(gameState, nextRoundNumber)

        set(
          { gameState: nextRoundState },
          false,
          'progressToNextRound'
        )

        // Trigger AI turn if next player is AI
        const phase = nextRoundState.round.phase
        if (phase.type === 'awaiting_card_play') {
          const nextPlayerIndex = phase.activePlayerIndex
          const nextPlayer = nextRoundState.players[nextPlayerIndex]
          if (nextPlayer?.isAI) {
            console.log(`[progressToNextRound] Next player is AI (${nextPlayer.name}), triggering AI turn`)
            setTimeout(() => {
              get().processAITurn()
            }, 1500)
          }
        }
      },
    }),
    {
      name: 'modern-art-game-store',
    }
  )
)

// Selectors for commonly used state
export const useCurrentPlayer = () => {
  const gameState = useGameStore((state) => state.gameState)
  return gameState?.players[0] // Assuming player 0 is the human player for now
}

export const useCurrentAuction = (): AuctionState | null => {
  const gameState = useGameStore((state) => state.gameState)
  if (!gameState || gameState.round.phase.type !== 'auction') {
    return null
  }
  return gameState.round.phase.auction
}

export const useIsCurrentPlayerTurn = () => {
  const gameState = useGameStore((state) => state.gameState)
  if (!gameState) return false

  const currentPlayerIndex = 0 // Assuming player 0 is the human player
  const phase = gameState.round.phase

  if (phase.type === 'awaiting_card_play') {
    return phase.activePlayerIndex === currentPlayerIndex
  }

  return false
}