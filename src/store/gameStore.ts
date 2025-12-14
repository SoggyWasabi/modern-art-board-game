import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig, Artist } from '../types'

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

// Card distribution per player based on player count
const CARDS_PER_ROUND: Record<number, [number, number, number, number]> = {
  3: [10, 6, 6, 0], // 3 players: 10, 6, 6, 0 cards per round
  4: [9, 4, 4, 0], // 4 players: 9, 4, 4, 0 cards per round
  5: [8, 3, 3, 0], // 5 players: 8, 3, 3, 0 cards per round
}

// Mock game state for testing
const createMockGameState = (playerCount: number): GameState => {
  const artists: Artist[] = ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira']
  const cardsPerPlayer = CARDS_PER_ROUND[playerCount]?.[0] || 10 // Default to 10 for round 1

  return {
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: i === 0 ? 'You' : `AI Player ${i}`,
      money: 100,
      hand: Array.from({ length: cardsPerPlayer }, (_, j) => ({
        id: `card_${i}_${j}`,
        artist: artists[j % 5],
        auctionType: ['open', 'one_offer', 'hidden', 'fixed_price', 'double'][j % 5] as any,
        artworkId: `art_${j}`,
      })),
      purchases: [],
      purchasedThisRound: [],
      isAI: i !== 0,
      aiDifficulty: i !== 0 ? 'medium' as const : undefined,
    })),
    deck: [],
    discardPile: [],
    board: {
      artistValues: {
        'Manuel Carvalho': [0, 0, 0, 0],
        'Sigrid Thaler': [0, 0, 0, 0],
        'Daniel Melim': [0, 0, 0, 0],
        'Ramon Martins': [0, 0, 0, 0],
        'Rafael Silveira': [0, 0, 0, 0],
      },
    },
    round: {
      roundNumber: 1,
      cardsPlayedPerArtist: {
        'Manuel Carvalho': 0,
        'Sigrid Thaler': 0,
        'Daniel Melim': 0,
        'Ramon Martins': 0,
        'Rafael Silveira': 0,
      },
      currentAuctioneerIndex: 0,
      phase: { type: 'awaiting_card_play', activePlayerIndex: 0 },
    },
    gamePhase: 'playing',
    winner: null,
    eventLog: [],
  }
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

        // Create mock game for now
        const playerCount = gameSetup.playerCount || 3
        const gameState = createMockGameState(playerCount)

        // Randomly select first player
        const firstPlayerIndex = Math.floor(Math.random() * playerCount)

        // Update the game state with first player
        gameState.round.currentAuctioneerIndex = firstPlayerIndex
        if (gameState.round.phase.type === 'awaiting_card_play') {
          (gameState.round.phase as any).activePlayerIndex = firstPlayerIndex
        }

        console.log('startGameFromSetup: Creating game state', {
          playerCount,
          firstPlayerIndex: firstPlayerIndex,
          firstPlayerName: gameState.players[firstPlayerIndex]?.name,
          players: gameState.players
        })

        set(
          {
            gameState,
            isGameStarted: true,
            firstPlayerIndex,
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

      // Game actions (placeholders)
      playCard: (cardId: string) => {
        console.log('Playing card:', cardId)
      },

      placeBid: (amount: number) => {
        console.log('Placing bid:', amount)
      },

      passBid: () => {
        console.log('Passing bid')
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