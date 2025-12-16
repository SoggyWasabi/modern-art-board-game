// ===================
// ENHANCED GAME STORE
// ===================

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig, Artist } from '../types'
import { startGame } from '../engine/game'
import { createAIGameIntegration } from '../ai/integration/game-integration'
import type { GameSetup } from '../types/setup'
import { playCard } from '../engine/round'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

type GameStartPhase = 'idle' | 'dealing' | 'selecting_first_player' | 'ready'

interface EnhancedGameStore {
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

  // AI integration
  aiIntegration: ReturnType<typeof createAIGameIntegration> | null

  // Setup actions
  setPlayerCount: (count: 3 | 4 | 5) => void
  updatePlayerSlot: (slotIndex: number, slot: Partial<PlayerSlotConfig>) => void
  startGameFromSetup: () => void
  resetSetup: () => void

  // Setup helper actions
  initializePlayerSlots: (playerCount: 3 | 4 | 5) => void

  // Enhanced game actions (integrated with AI)
  playCard: (cardId: string) => void
  placeBid: (amount: number) => void
  passBid: () => void
  submitHiddenBid: (amount: number) => void
  setFixedPrice: (price: number) => void
  buyAtFixedPrice: () => void
  passFixedPrice: () => void
  offerSecondCardForDouble: (cardId: string) => void
  declineSecondCardForDouble: () => void

  // Game state management
  updateGameState: (newState: GameState) => void
  processAITurns: () => Promise<void>

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

export const useEnhancedGameStore = create<EnhancedGameStore>()(
  subscribeWithSelector(
    devtools(
      (set, get) => {
        // Initialize AI integration
        const aiIntegration = createAIGameIntegration()

        return {
          // Initial state
          setupState: initialSetupState,
          gameState: null,
          selectedCardId: null,
          isGameStarted: false,
          aiIntegration,

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
            const { setupState, aiIntegration } = get()
            const { gameSetup } = setupState

            if (!aiIntegration) {
              console.error('AI integration not initialized')
              return
            }

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
              type: 'human' as const,
              color: PLAYER_COLORS[0]
            })

            // Add AI players based on player count
            for (let i = 1; i < playerCount; i++) {
              players.push({
                id: `player_${i}`,
                name: `AI Player ${i}`,
                type: 'ai' as const,
                aiDifficulty: 'medium' as const,
                color: PLAYER_COLORS[i]
              })
            }

            const engineSetup: GameSetup = {
              playerCount,
              players,
              startingMoney: 100
            }

            console.log('Using engine setup:', engineSetup)

            // Use AI integration to start game (includes AI initialization)
            const gameState = aiIntegration.startNewGame(engineSetup)

            console.log('Game state created with AI:', {
              playerCount: gameState.players.length,
              deckSize: gameState.deck.length,
              handsDealt: gameState.players.map(p => p.hand.length),
              aiPlayers: gameState.players.filter(p => p.isAI).length,
              humanPlayers: gameState.players.filter(p => !p.isAI).length,
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

          // Enhanced game actions (integrated with AI)
          playCard: (cardId: string) => {
            const { gameState, aiIntegration } = get()

            if (!gameState || !aiIntegration) {
              console.error('Game state or AI integration not available')
              return
            }

            // Get current player (human)
            const currentPlayerIndex = 0
            const player = gameState.players[currentPlayerIndex]

            // Find card in hand
            const cardIndex = player.hand.findIndex(card => card.id === cardId)
            if (cardIndex === -1) {
              console.error(`Card ${cardId} not found in player's hand`)
              return
            }

            try {
              // Use engine to play card
              const newState = playCard(gameState, currentPlayerIndex, cardIndex)

              // Update state
              set(
                { gameState: newState },
                false,
                'playCard'
              )

              // Process AI turns after human action
              setTimeout(() => {
                get().processAITurns()
              }, 1000)

            } catch (error) {
              console.error('Error playing card:', error)
            }
          },

          placeBid: (amount: number) => {
            console.log('Placing bid:', amount)
            // TODO: Implement bid placement with auction engine
          },

          passBid: () => {
            console.log('Passing bid')
            // TODO: Implement bid passing with auction engine
          },

          submitHiddenBid: (amount: number) => {
            console.log('Submitting hidden bid:', amount)
            // TODO: Implement hidden bid submission
          },

          setFixedPrice: (price: number) => {
            console.log('Setting fixed price:', price)
            // TODO: Implement fixed price setting
          },

          buyAtFixedPrice: () => {
            console.log('Buying at fixed price')
            // TODO: Implement fixed price purchase
          },

          passFixedPrice: () => {
            console.log('Passing fixed price')
            // TODO: Implement fixed price pass
          },

          offerSecondCardForDouble: (cardId: string) => {
            console.log('Offering second card for double:', cardId)
            // TODO: Implement double auction second card
          },

          declineSecondCardForDouble: () => {
            console.log('Declining second card for double')
            // TODO: Implement double auction decline
          },

          // Game state management
          updateGameState: (newState: GameState) => {
            set(
              { gameState: newState },
              false,
              'updateGameState'
            )
          },

          processAITurns: async () => {
            const { gameState, aiIntegration } = get()

            if (!gameState || !aiIntegration) {
              return
            }

            try {
              const updatedState = await aiIntegration.processAITurns(gameState)

              if (updatedState !== gameState) {
                set(
                  { gameState: updatedState },
                  false,
                  'processAITurns'
                )
              }
            } catch (error) {
              console.error('Error processing AI turns:', error)
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
          resetGame: () => {
            const { aiIntegration } = get()

            // Cleanup AI resources
            aiIntegration?.cleanup()

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
            )
          },
        }
      },
      {
        name: 'enhanced-modern-art-game-store',
      }
    )
  )
)

// Subscribe to game state changes and process AI turns
useEnhancedGameStore.subscribe(
  (state) => state.gameState,
  (gameState, previousGameState) => {
    // Only process AI turns if game state actually changed
    if (gameState !== previousGameState && gameState) {
      const store = useEnhancedGameStore.getState()

      // Check if it's AI turn and process after a brief delay
      if (store.aiIntegration?.isAITurn(gameState)) {
        setTimeout(() => {
          store.processAITurns()
        }, 1500) // Give UI time to update
      }
    }
  }
)

// Selectors for commonly used state
export const useCurrentPlayer = () => {
  const gameState = useEnhancedGameStore((state) => state.gameState)
  return gameState?.players[0] // Assuming player 0 is the human player for now
}

export const useCurrentAuction = (): AuctionState | null => {
  const gameState = useEnhancedGameStore((state) => state.gameState)
  if (!gameState || gameState.round.phase.type !== 'auction') {
    return null
  }
  return gameState.round.phase.auction
}

export const useIsCurrentPlayerTurn = () => {
  const gameState = useEnhancedGameStore((state) => state.gameState)
  if (!gameState) return false

  const currentPlayerIndex = 0 // Assuming player 0 is the human player
  const phase = gameState.round.phase

  if (phase.type === 'awaiting_card_play') {
    return phase.activePlayerIndex === currentPlayerIndex
  }

  return false
}