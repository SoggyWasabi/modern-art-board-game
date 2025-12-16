import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig, Artist } from '../types'
import { validateAndCreateGame } from '../types/setup'
import { startGame } from '../engine/game'
import { playCard } from '../engine/round'
import { getGameController, GameActionHandler } from '../integration/gameIntegration'
import { getAuctionAIOrchestrator } from '../integration/auctionAIOrchestrator'

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

  // UI actions
  selectCard: (cardId: string | null) => void
  deselectCard: () => void

  // Game start sequence actions
  setGameStartPhase: (phase: GameStartPhase) => void
  setDealingProgress: (progress: number) => void
  setFirstPlayerIndex: (index: number) => void
  completeGameStart: () => void

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

        const orchestrator = getAuctionAIOrchestrator()
        let updatedGameState = await orchestrator.processAuctionAI(gameState)

        if (updatedGameState) {
          console.log('AI actions processed, updating game state')
          set(
            { gameState: updatedGameState },
            false,
            'ai_actions_processed'
          )

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

          // Import auction functions dynamically
          const { placeBid: placeOpenBid, pass: passOpenBid } = require('../engine/auction/open')
          const { makeOffer, pass: passOneOffer } = require('../engine/auction/oneOffer')
          const { submitBid } = require('../engine/auction/hidden')
          const { buyAtPrice, pass: passFixedPrice } = require('../engine/auction/fixedPrice')

          let updatedAuction

          switch (auction.type) {
            case 'open':
              updatedAuction = placeOpenBid(auction, player.id, amount, gameState.players)
              break

            case 'one_offer':
              if (auction.phase === 'bidding') {
                updatedAuction = makeOffer(auction, player.id, amount, gameState.players)
              } else {
                console.error('Cannot bid during auctioneer decision phase')
                return
              }
              break

            case 'hidden':
              updatedAuction = submitBid(auction, player.id, amount)
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
            const { isAuctioneerDecisionPhase } = require('../engine/auction/oneOffer')

            // The engine automatically transitions to auctioneer decision phase when all others have acted
            if (isAuctioneerDecisionPhase(updatedAuction)) {
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

          // Import auction functions dynamically
          const { placeBid: placeOpenBid, pass: passOpenBid } = require('../engine/auction/open')
          const { makeOffer, pass: passOneOffer } = require('../engine/auction/oneOffer')
          const { pass: passFixedPrice } = require('../engine/auction/fixedPrice')

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

      submitHiddenBid: (amount: number) => {
        console.log('Submitting hidden bid:', amount)
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