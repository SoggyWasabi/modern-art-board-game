// ===================
// CORE GAME TYPES
// ===================

export type Artist = 'Manuel Carvalho' | 'Sigrid Thaler' | 'Daniel Melim' | 'Ramon Martins' | 'Rafael Silveira'

export type AuctionType = 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'

// Forward declaration for auction state to avoid circular import
export interface AuctionState {
  type: 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'
  // Additional properties will be defined in auction.ts
}

export interface Card {
  id: string
  artist: Artist
  auctionType: AuctionType
  artworkId: string // Reference to visual asset
}

export interface Painting {
  card: Card
  artist: Artist
  purchasePrice: number
  purchasedRound: number
  salePrice?: number
  soldRound?: number
}

export interface Player {
  id: string
  name: string
  money: number // Hidden from other players until game end
  hand: Card[] // Cards available to auction
  purchasedThisRound: Card[] // Cleared after selling each round
  purchases?: Painting[] // All paintings owned by player
  isAI: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

export interface GameBoard {
  // Value tiles placed per round
  // artistValues[artist][roundIndex] = value earned that round (0, 10, 20, or 30)
  artistValues: Record<Artist, [number, number, number, number]>
  // Cards currently played on the board, organized by artist
  playedCards: Record<Artist, Card[]>
}

export interface ArtistRoundResult {
  artist: Artist
  cardCount: number // Including unsold round-enders
  rank: 1 | 2 | 3 | null // null if not top 3
  value: 0 | 10 | 20 | 30
}

export interface RoundState {
  roundNumber: 1 | 2 | 3 | 4
  cardsPlayedPerArtist: Record<Artist, number> // Counts ALL played cards
  currentAuctioneerIndex: number
  phase: RoundPhase
}

export type RoundPhase =
  | { type: 'awaiting_card_play'; activePlayerIndex: number }
  | { type: 'auction'; auction: AuctionState }
  | { type: 'round_ending'; unsoldCards: Card[] }
  | { type: 'selling_to_bank'; results: ArtistRoundResult[] }
  | { type: 'round_complete' }

export type GamePhase = 'setup' | 'playing' | 'ended'

export interface GameState {
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  board: GameBoard
  round: RoundState
  gamePhase: GamePhase
  winner: Player | null
  eventLog: GameEvent[] // For animations and history
}

export interface GameEndResult {
  winner: Player
  isTie: boolean
  tieBreakReason?: string
  finalScores: Array<{
    player: Player
    finalMoney: number
    unsoldPaintingsValue: number
    totalScore: number
    paintingsOwned: number
  }>
  totalRounds: number
  totalCardsPlayed: number
}

export type GameEvent =
  | { type: 'game_started'; players: Player[] }
  | { type: 'round_started'; round: number }
  | { type: 'cards_dealt'; playerIndex: number; count: number }
  | { type: 'card_played'; playerIndex: number; card: Card }
  | { type: 'auction_started'; auction: AuctionState }
  | { type: 'bid_placed'; playerIndex: number; amount: number }
  | { type: 'bid_passed'; playerIndex: number }
  | { type: 'hidden_bids_revealed'; bids: Map<number, number> }
  | { type: 'auction_won'; winnerIndex: number; amount: number; cards: Card[] }
  | { type: 'auction_no_bids'; recipientIndex: number; cards: Card[] }
  | { type: 'money_paid'; from: number; to: number | 'bank'; amount: number }
  | { type: 'round_ended'; unsoldCards: Card[]; rankings: ArtistRoundResult[] }
  | { type: 'paintings_sold'; playerIndex: number; paintings: Card[]; totalValue: number }
  | { type: 'game_ended'; winner: string | null }
  | { type: 'bank_sale'; playerId: string; totalSaleValue: number; paintingCount: number; paintings: Painting[] }