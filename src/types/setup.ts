// ===================
// GAME SETUP TYPES
// ===================

export interface SetupState {
  step: 'player_count' | 'player_config' | 'ai_difficulty' | 'ready_to_start'
  gameSetup: Partial<GameSetup>
  validationErrors: string[]
}

export interface PlayerCountSelection {
  playerCount: 3 | 4 | 5
  maxHumanPlayers: number // Cannot exceed playerCount
}

export interface PlayerSlotConfig {
  slotIndex: number
  type: 'human' | 'ai' | 'empty'
  humanName?: string
  aiDifficulty?: 'easy' | 'medium' | 'hard'
  color: string
  avatar?: string
}

export interface GameSetup {
  playerCount: 3 | 4 | 5
  players: PlayerConfig[]
  startingMoney: number
}

export interface PlayerConfig {
  id: string
  name: string
  type: 'human' | 'ai'
  aiDifficulty?: 'easy' | 'medium' | 'hard'
  color: string
  avatar?: string
}

export function validateAndCreateGame(
  playerCount: number,
  playerSlots: PlayerSlotConfig[]
): { success: boolean; gameSetup?: GameSetup; errors: string[] } {
  const errors: string[] = []

  // Validate at least 1 human player
  const humanPlayers = playerSlots.filter(s => s.type === 'human')
  if (humanPlayers.length === 0) {
    errors.push('At least one human player is required')
  }

  // Validate exactly playerCount slots filled
  const filledSlots = playerSlots.filter(s => s.type !== 'empty')
  if (filledSlots.length !== playerCount) {
    errors.push(`Exactly ${playerCount} players must be configured`)
  }

  // Validate AI players have difficulty
  const aiWithoutDifficulty = playerSlots.filter(
    s => s.type === 'ai' && !s.aiDifficulty
  )
  if (aiWithoutDifficulty.length > 0) {
    errors.push('All AI players must have a difficulty level')
  }

  // Validate unique player names
  const names = humanPlayers.map(p => p.humanName).filter(Boolean)
  const uniqueNames = new Set(names)
  if (names.length !== uniqueNames.size) {
    errors.push('Player names must be unique')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Create game setup
  const players: PlayerConfig[] = playerSlots
    .filter(s => s.type !== 'empty')
    .map((slot, index) => ({
      id: `player_${index}`,
      name: slot.type === 'human' ? slot.humanName! : `AI ${slot.aiDifficulty}`,
      type: slot.type as 'human' | 'ai',
      aiDifficulty: slot.aiDifficulty,
      color: slot.color,
      avatar: slot.avatar,
    }))

  return {
    success: true,
    gameSetup: {
      playerCount: playerCount as 3 | 4 | 5,
      players,
      startingMoney: 100,
    },
    errors: [],
  }
}