import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GameState, SetupState, AuctionState, PlayerSlotConfig } from '../types'

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

interface GameStore {
  // Setup state
  setupState: SetupState

  // Game state
  gameState: GameState | null

  // UI state
  selectedCardId: string | null
  isGameStarted: boolean

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

  // Utility actions
  resetGame: () => void
}

const initialSetupState: SetupState = {
  step: 'player_count',
  gameSetup: {},
  validationErrors: [],
}

// Mock game state for testing
const createMockGameState = (playerCount: number): GameState => ({
  players: Array.from({ length: playerCount }, (_, i) => ({
    id: `player_${i}`,
    name: i === 0 ? 'You' : `AI Player ${i}`,
    money: 100,
    hand: Array.from({ length: 6 }, (_, j) => ({
      id: `card_${i}_${j}`,
      artist: ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira'][j % 5],
      auctionType: ['open', 'one_offer', 'hidden', 'fixed_price', 'double'][j % 5] as any,
      artworkId: `art_${j}`,
    })),
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
})

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      setupState: initialSetupState,
      gameState: null,
      selectedCardId: null,
      isGameStarted: false,

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
            const currentSlots = state.setupState.gameSetup.playerSlots || []
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

        set(
          {
            gameState,
            isGameStarted: true,
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

      // Utility actions
      resetGame: () =>
        set(
          {
            gameState: null,
            isGameStarted: false,
            selectedCardId: null,
            setupState: initialSetupState,
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