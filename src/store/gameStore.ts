import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig, Artist } from '../types'
import { validateAndCreateGame } from '../types/setup'
import { startGame } from '../engine/game'
import { playCard } from '../engine/round'
import { getGameController, GameActionHandler } from '../integration/gameIntegration'
import { getAuctionAIOrchestrator } from '../integration/auctionAIOrchestrator'
import { getOpenAuctionAIManager } from '../integration/openAuctionAIManager'

// Import all auction engine functions
import { placeBid as placeOpenBid, pass as passOpenBid, checkTimerExpiration, endAuctionByTimer, concludeAuction as concludeOpenAuction } from '../engine/auction/open'
import { makeOffer, pass as passOneOffer, acceptHighestBid, auctioneerOutbid, auctioneerTakesFree, concludeAuction } from '../engine/auction/oneOffer'
import { submitBid, revealBids, concludeAuction as concludeHiddenAuction } from '../engine/auction/hidden'
import { buyAtPrice, pass as passFixedPrice } from '../engine/auction/fixedPrice'
import { executeAuction } from '../engine/auction/executor'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

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
        if (auction.type === 'open') {
          console.log('Starting Open Auction AI Manager for new auction')
          get().startOpenAuctionAI()
          return // Open auctions are handled by AI manager, not orchestrator
        }

        const orchestrator = getAuctionAIOrchestrator()
        let updatedGameState = await orchestrator.processAuctionAI(gameState)

        if (updatedGameState) {
          console.log('AI actions processed, updating game state')

          // For hidden auctions, merge with current state to preserve human bids
          // that may have been submitted while AI was processing
          const { gameState: currentState } = get()
          if (currentState &&
              currentState.round.phase.type === 'auction' &&
              currentState.round.phase.auction.type === 'hidden' &&
              updatedGameState.round.phase.type === 'auction' &&
              updatedGameState.round.phase.auction.type === 'hidden') {
            const currentAuction = currentState.round.phase.auction
            const aiAuction = updatedGameState.round.phase.auction

            // Merge bids - keep any bids from current state that AI state doesn't have
            const mergedBids = { ...aiAuction.bids }
            for (const [playerId, bid] of Object.entries(currentAuction.bids)) {
              if (mergedBids[playerId] === undefined) {
                mergedBids[playerId] = bid
                console.log(`Preserved human bid from ${playerId}: ${bid}`)
              }
            }

            // Update readyToReveal based on merged bids
            const allPlayersCount = currentState.players.length
            const submittedBidsCount = Object.keys(mergedBids).length
            const readyToReveal = submittedBidsCount >= allPlayersCount

            updatedGameState = {
              ...updatedGameState,
              round: {
                ...updatedGameState.round,
                phase: {
                  type: 'auction',
                  auction: {
                    ...aiAuction,
                    bids: mergedBids,
                    readyToReveal
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

          // For hidden auctions, check if all bids are in and trigger reveal
          if (updatedGameState.round.phase.type === 'auction' &&
              updatedGameState.round.phase.auction.type === 'hidden') {
            const hiddenAuction = updatedGameState.round.phase.auction
            if (hiddenAuction.readyToReveal && !hiddenAuction.revealedBids) {
              console.log('All hidden bids submitted, triggering reveal...')
              setTimeout(() => {
                const { gameState: currentGameState } = get()
                if (currentGameState && currentGameState.round.phase.type === 'auction') {
                  const currentAuction = currentGameState.round.phase.auction
                  if (currentAuction.type === 'hidden' && currentAuction.readyToReveal && !currentAuction.revealedBids) {
                    // Reveal the bids
                    const revealedAuction = revealBids(currentAuction)

                    // Update with revealed bids
                    set(
                      {
                        gameState: {
                          ...currentGameState,
                          round: {
                            ...currentGameState.round,
                            phase: {
                              type: 'auction',
                              auction: revealedAuction
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
                        if (finalAuction.type === 'hidden' && finalAuction.revealedBids) {
                          // Conclude the auction
                          const auctionResult = concludeHiddenAuction(finalAuction, newGameState.players)
                          console.log(`Hidden auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                          // Execute the auction (transfer money, card, etc.)
                          const finalGameState = executeAuction(
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
                            finalAuction.card
                          )

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
                  const finalGameState = executeAuction(
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
              if (amount === auction.price) {
                updatedAuction = buyAtPrice(auction, player.id, gameState.players)
              } else {
                console.error('Must bid exactly the fixed price')
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
          const auction = gameState.round.phase.auction

          // Auction functions now imported at top of file

          let updatedAuction

          switch (auction.type) {
            case 'open':
              updatedAuction = passOpenBid(auction, player.id)
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
              updatedAuction = passFixedPrice(auction, player.id, gameState.players)
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
        if (auction.type !== 'hidden') {
          console.error('Not a hidden auction')
          return
        }

        console.log('Submitting hidden bid:', amount)

        try {
          const player = gameState.players[0]
          const updatedAuction = submitBid(auction, player.id, amount, gameState.players)

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
          if (updatedAuction.readyToReveal && !updatedAuction.revealedBids) {
            setTimeout(() => {
              const { gameState: currentGameState } = get()
              if (currentGameState && currentGameState.round.phase.type === 'auction') {
                const currentAuction = currentGameState.round.phase.auction
                if (currentAuction.type === 'hidden' && currentAuction.readyToReveal) {
                  // Reveal the bids
                  const revealedAuction = revealBids(currentAuction)

                  // Update with revealed bids
                  set(
                    {
                      gameState: {
                        ...currentGameState,
                        round: {
                          ...currentGameState.round,
                          phase: {
                            type: 'auction',
                            auction: revealedAuction
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
                      if (finalAuction.type === 'hidden' && finalAuction.revealedBids) {
                        // Conclude the auction
                        const auctionResult = concludeHiddenAuction(finalAuction, newGameState.players)
                        console.log(`Hidden auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                        // Execute the auction (transfer money, card, etc.)
                        const finalGameState = executeAuction(
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
                          finalAuction.card
                        )

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
        console.log('Setting fixed price:', price)
      },

      buyAtFixedPrice: () => {
        console.log('Buying at fixed price')
      },

      passFixedPrice: () => {
        console.log('Passing fixed price')
      },

      offerSecondCardForDouble: (cardId: string) => {
        console.log('Offering second card for double:', cardId)
      },

      declineSecondCardForDouble: () => {
        console.log('Declining second card for double')
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
        if (auction.type === 'open') {
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
            if (currentAuction.type !== 'open') {
              return
            }

            // Find the AI player
            const aiPlayer = currentState.players.find(p => p.id === playerId)
            if (!aiPlayer || !aiPlayer.isAI) {
              return
            }

            try {
              // Place the bid using the open auction engine
              const updatedAuction = placeOpenBid(currentAuction, playerId, amount, currentState.players)

              const newGameState = {
                ...currentState,
                round: {
                  ...currentState.round,
                  phase: {
                    type: 'auction' as const,
                    auction: updatedAuction
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
        if (auction.type === 'open' && checkTimerExpiration(auction)) {
          console.log('Open auction timer expired, ending auction')

          // End the auction due to timer expiration
          const endedAuction = endAuctionByTimer(auction)

          // Update game state with ended auction
          set(
            {
              gameState: {
                ...gameState,
                round: {
                  ...gameState.round,
                  phase: {
                    type: 'auction',
                    auction: endedAuction
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
              if (currentAuction.type === 'open' && !currentAuction.isActive) {
                // Use the imported concludeOpenAuction function
                const auctionResult = concludeOpenAuction(currentAuction, currentGameState.players)
                console.log(`Open auction concluded: ${auctionResult.winnerId} won for $${auctionResult.salePrice}k`)

                // Execute the auction (transfer money, card, etc.)
                const finalGameState = executeAuction(
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
                  currentAuction.card
                )

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