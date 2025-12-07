# Modern Art Online - Implementation Plan (Revised)

**Version**: 2.0
**Last Updated**: 2025-12-07
**Status**: Peer Review Incorporated

## Implementation Status ✅

### Phase 1: Core Game Engine (Offline/Local Play)

- ✅ **1.0 Player Selection & Game Setup** - Types and validation logic complete (UI pending)
- ✅ **1.1 Artists (Board Order)** - All 5 artists defined with proper tie-breaking order
- ✅ **1.2 Core Data Models** - All game types, player types, and state interfaces defined
- ✅ **1.3 Deck Management** - Complete deck creation, shuffling, and dealing (20 tests passing)
- ✅ **1.4 Artist Valuation** - COMPLETE
- ⏳ **1.5 Auction Engines** - Pending
- ⏳ **1.6 Round Management** - Pending
- ⏳ **1.7 Game Flow** - Pending

---

## Game Overview Summary

**Modern Art** is an auction game by Reiner Knizia for 3-5 players where:

- Players act as museum curators buying/selling paintings
- 4 rounds of auctions, 5 artists (70 total cards)
- 5 auction types: Open, One Offer, Hidden, Fixed Price, Double
- Artist values accumulate across rounds based on sales rankings
- Winner has most money after 4 rounds

---

## Phase 1: Core Game Engine (Offline/Local Play)

### 1.0 Player Selection & Game Setup ✅ COMPLETED

Before any game logic, implement a comprehensive player configuration system:

#### 1.0.1 Game Setup Flow

```typescript
// ===================
// GAME SETUP FLOW
// ===================

interface SetupState {
  step: 'player_count' | 'player_config' | 'ai_difficulty' | 'ready_to_start';
  gameSetup: Partial<GameSetup>;
  validationErrors: string[];
}

// Step 1: Choose number of players (3-5)
interface PlayerCountSelection {
  playerCount: 3 | 4 | 5;
  maxHumanPlayers: number;  // Cannot exceed playerCount
}

// Step 2: Configure each player slot
interface PlayerSlotConfig {
  slotIndex: number;
  type: 'human' | 'ai' | 'empty';
  humanName?: string;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  color: string;
  avatar?: string;
}

// Step 3: Validation and game creation
function validateAndCreateGame(
  playerCount: number,
  playerSlots: PlayerSlotConfig[]
): { success: boolean; gameSetup?: GameSetup; errors: string[] } {
  const errors: string[] = [];

  // Validate at least 1 human player
  const humanPlayers = playerSlots.filter(s => s.type === 'human');
  if (humanPlayers.length === 0) {
    errors.push('At least one human player is required');
  }

  // Validate exactly playerCount slots filled
  const filledSlots = playerSlots.filter(s => s.type !== 'empty');
  if (filledSlots.length !== playerCount) {
    errors.push(`Exactly ${playerCount} players must be configured`);
  }

  // Validate AI players have difficulty
  const aiWithoutDifficulty = playerSlots.filter(
    s => s.type === 'ai' && !s.aiDifficulty
  );
  if (aiWithoutDifficulty.length > 0) {
    errors.push('All AI players must have a difficulty level');
  }

  // Validate unique player names
  const names = humanPlayers.map(p => p.humanName).filter(Boolean);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    errors.push('Player names must be unique');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Create game setup
  const players: PlayerConfig[] = playerSlots
    .filter(s => s.type !== 'empty')
    .map((slot, index) => ({
      id: `player_${index}`,
      name: slot.type === 'human' ? slot.humanName! : `AI ${slot.aiDifficulty}`,
      type: slot.type,
      aiDifficulty: slot.aiDifficulty,
      color: slot.color,
      avatar: slot.avatar,
    }));

  return {
    success: true,
    gameSetup: {
      playerCount: playerCount as 3 | 4 | 5,
      players,
      startingMoney: 100,
    },
    errors: [],
  };
}
```

#### 1.0.2 UI Component Structure for Setup

```typescript
// ===================
// SETUP UI COMPONENTS
// ===================

// Main setup wizard component
const GameSetupWizard = () => {
  const [setupState, setSetupState] = useState<SetupState>({
    step: 'player_count',
    gameSetup: {},
    validationErrors: [],
  });

  return (
    <div className="setup-wizard">
      {setupState.step === 'player_count' && (
        <PlayerCountSelection
          onSelect={(count) => setSetupState(prev => ({
            ...prev,
            step: 'player_config',
            gameSetup: { ...prev.gameSetup, playerCount: count }
          }))}
        />
      )}

      {setupState.step === 'player_config' && (
        <PlayerConfiguration
          playerCount={setupState.gameSetup.playerCount!}
          onConfigured={(slots) => setSetupState(prev => ({
            ...prev,
            step: 'ai_difficulty',
            gameSetup: { ...prev.gameSetup, playerSlots: slots }
          }))}
        />
      )}

      {/* Additional steps... */}
    </div>
  );
};

// Player count selector
const PlayerCountSelection = ({ onSelect }) => {
  return (
    <div className="player-count-selection">
      <h2>Number of Players</h2>
      <div className="player-count-options">
        {[3, 4, 5].map(count => (
          <button
            key={count}
            onClick={() => onSelect(count)}
            className="player-count-btn"
          >
            {count} Players
          </button>
        ))}
      </div>
    </div>
  );
};

// Player slot configuration
const PlayerConfiguration = ({ playerCount, onConfigured }) => {
  const [slots, setSlots] = useState<PlayerSlotConfig[]>(
    Array.from({ length: 5 }, (_, i) => ({
      slotIndex: i,
      type: i < playerCount ? 'human' : 'empty' as const,
      color: PLAYER_COLORS[i],
    }))
  );

  return (
    <div className="player-configuration">
      <h2>Configure Players</h2>
      {slots.slice(0, playerCount).map((slot, index) => (
        <PlayerSlot
          key={index}
          slot={slot}
          index={index}
          onUpdate={(updatedSlot) => {
            const newSlots = [...slots];
            newSlots[index] = updatedSlot;
            setSlots(newSlots);
          }}
        />
      ))}
      <button
        onClick={() => onConfigured(slots.slice(0, playerCount))}
        className="continue-btn"
      >
        Continue
      </button>
    </div>
  );
};

// Individual player slot
const PlayerSlot = ({ slot, index, onUpdate }) => {
  return (
    <div className="player-slot" style={{ borderColor: slot.color }}>
      <div className="slot-header">
        <span className="player-number">Player {index + 1}</span>
        <div className="player-type-selector">
          <button
            className={slot.type === 'human' ? 'active' : ''}
            onClick={() => onUpdate({ ...slot, type: 'human' })}
          >
            Human
          </button>
          <button
            className={slot.type === 'ai' ? 'active' : ''}
            onClick={() => onUpdate({ ...slot, type: 'ai' })}
          >
            AI
          </button>
        </div>
      </div>

      {slot.type === 'human' && (
        <input
          type="text"
          placeholder="Enter name"
          value={slot.humanName || ''}
          onChange={(e) => onUpdate({ ...slot, humanName: e.target.value })}
          className="player-name-input"
        />
      )}

      {slot.type === 'ai' && (
        <select
          value={slot.aiDifficulty || ''}
          onChange={(e) => onUpdate({
            ...slot,
            aiDifficulty: e.target.value as 'easy' | 'medium' | 'hard'
          })}
          className="ai-difficulty-select"
        >
          <option value="">Select difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      )}

      <div className="player-color-indicator" style={{ backgroundColor: slot.color }}>
        {slot.type === 'human' ? '👤' : '🤖'}
      </div>
    </div>
  );
};
```

#### 1.0.3 Player Experience Features

```typescript
// ===================
// PLAYER EXPERIENCE
// ===================

interface PlayerProfile {
  id: string;
  displayName: string;
  avatar?: string;
  favoriteColor?: string;
  statistics: {
    gamesPlayed: number;
    gamesWon: number;
    favoriteArtist: Artist;
    averageWinningBid: number;
  };
  preferences: {
    autoSortHand: boolean;
    showBidHints: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast';
    soundEnabled: boolean;
  };
}

// Quick start templates
interface QuickStartTemplate {
  name: string;
  description: string;
  playerCount: 3 | 4 | 5;
  humanPlayers: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';
  icon: string;
}

const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    name: "Solo Practice",
    description: "Play against 4 AI opponents to learn the ropes",
    playerCount: 5,
    humanPlayers: 1,
    aiDifficulty: 'easy',
    icon: '🎯',
  },
  {
    name: "Date Night",
    description: "Perfect for two players with easy AI",
    playerCount: 3,
    humanPlayers: 2,
    aiDifficulty: 'medium',
    icon: '💑',
  },
  {
    name: "Game Night",
    description: "Full 5-player game with one AI to fill",
    playerCount: 5,
    humanPlayers: 4,
    aiDifficulty: 'medium',
    icon: '🎲',
  },
  {
    name: "Expert Challenge",
    description: "Face off against hard AI opponents",
    playerCount: 4,
    humanPlayers: 1,
    aiDifficulty: 'hard',
    icon: '🏆',
  },
];
```

### 1.1 Artists (Board Order - Left to Right) ✅ COMPLETED

This order is **critical** for tie-breaking in artist rankings:

| Priority | Artist | Card Count |
|----------|--------|------------|
| 1 (highest) | Manuel Carvalho | 12 |
| 2 | Sigrid Thaler | 13 |
| 3 | Daniel Melim | 15 |
| 4 | Ramon Martins | 15 |
| 5 (lowest) | Rafael Silveira | 15 |

**Total**: 70 cards

---

### 1.2 Core Data Models ✅ COMPLETED

```typescript
// ===================
// CONSTANTS
// ===================

// Artists in board order (LEFT to RIGHT) - used for tie-breaking
const ARTISTS = [
  'Manuel Carvalho',   // Priority 1 (wins ties)
  'Sigrid Thaler',     // Priority 2
  'Daniel Melim',      // Priority 3
  'Ramon Martins',     // Priority 4
  'Rafael Silveira',   // Priority 5 (loses ties)
] as const;
type Artist = typeof ARTISTS[number];

const AUCTION_TYPES = ['open', 'one_offer', 'hidden', 'fixed_price', 'double'] as const;
type AuctionType = typeof AUCTION_TYPES[number];

// ===================
// CARD
// ===================

interface Card {
  id: string;
  artist: Artist;
  auctionType: AuctionType;
  artworkId: string;  // Reference to visual asset
}

// ===================
// PLAYER
// ===================

interface Player {
  id: string;
  name: string;
  money: number;              // Hidden from other players until game end
  hand: Card[];               // Cards available to auction
  purchasedThisRound: Card[]; // Cleared after selling each round
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

// ===================
// GAME BOARD (Value Tracking)
// ===================

interface GameBoard {
  // Value tiles placed per round
  // artistValues[artist][roundIndex] = value earned that round (0, 10, 20, or 30)
  artistValues: Record<Artist, [number, number, number, number]>;
}

// Helper: Get cumulative value for artist (only if top 3 THIS round)
function getArtistValue(board: GameBoard, artist: Artist, round: number): number {
  const currentRoundValue = board.artistValues[artist][round];
  if (currentRoundValue === 0) {
    return 0; // Not top 3 this round = worth nothing
  }
  // Sum all historical values
  return board.artistValues[artist]
    .slice(0, round + 1)
    .reduce((sum, v) => sum + v, 0);
}

// ===================
// ROUND STATE
// ===================

interface ArtistRoundResult {
  artist: Artist;
  cardCount: number;       // Including unsold round-enders
  rank: 1 | 2 | 3 | null;  // null if not top 3
  value: 0 | 10 | 20 | 30;
}

interface RoundState {
  roundNumber: 1 | 2 | 3 | 4;
  cardsPlayedPerArtist: Record<Artist, number>;  // Counts ALL played cards
  currentAuctioneerIndex: number;
  phase: RoundPhase;
}

// ===================
// ROUND PHASES (State Machine)
// ===================

type RoundPhase =
  | { type: 'awaiting_card_play'; activePlayerIndex: number }
  | { type: 'auction'; auction: AuctionState }
  | { type: 'round_ending'; unsoldCards: Card[]; }
  | { type: 'selling_to_bank'; results: ArtistRoundResult[] }
  | { type: 'round_complete' };

// ===================
// GAME STATE
// ===================

interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  board: GameBoard;
  round: RoundState;
  gamePhase: 'setup' | 'playing' | 'finished';
  winner: string | null;
  eventLog: GameEvent[];  // For animations and history
}
```

---

### 1.3 Auction State Machines (Per Type)

Each auction type has unique state requirements:

```typescript
// ===================
// AUCTION STATES (Discriminated Union)
// ===================

type AuctionState =
  | OpenAuctionState
  | OneOfferAuctionState
  | HiddenAuctionState
  | FixedPriceAuctionState
  | DoubleAuctionState;

// -----------------------
// A. OPEN AUCTION
// -----------------------
// Rules:
// - All players (including auctioneer) can bid in ANY order
// - Bids must be higher than current highest
// - Ends when no player wants to bid higher
// - If no bids: auctioneer gets painting FREE

interface OpenAuctionState {
  type: 'open';
  card: Card;
  auctioneerIndex: number;
  currentHighBid: number | null;
  currentHighBidder: number | null;
  // For digital: countdown timer resets on each bid
  lastBidTimestamp: number;
  countdownSeconds: number;  // e.g., 5 seconds
}

// -----------------------
// B. ONE OFFER AUCTION
// -----------------------
// Rules:
// - Starts with player to LEFT of auctioneer
// - Goes CLOCKWISE around table
// - Each player: bid higher OR pass (one chance only)
// - Auctioneer bids LAST
// - If no bids: auctioneer gets painting FREE

interface OneOfferAuctionState {
  type: 'one_offer';
  card: Card;
  auctioneerIndex: number;
  currentPlayerIndex: number;       // Whose turn to bid
  currentHighBid: number | null;
  currentHighBidder: number | null;
  playersActed: number[];           // Players who have bid or passed
}

// -----------------------
// C. HIDDEN AUCTION
// -----------------------
// Rules:
// - All players (including auctioneer) bid SIMULTANEOUSLY in secret
// - $0 = not bidding
// - Reveal all at once
// - Highest bidder wins
// - TIE-BREAKER: Auctioneer wins if tied; otherwise closest CLOCKWISE from auctioneer

interface HiddenAuctionState {
  type: 'hidden';
  card: Card;
  auctioneerIndex: number;
  phase: 'collecting_bids' | 'revealed';
  submittedBids: Map<number, number>;   // playerIndex -> bid (hidden until reveal)
  revealedBids: Map<number, number> | null;  // Set after all submit
}

// -----------------------
// D. FIXED PRICE AUCTION
// -----------------------
// Rules:
// - Auctioneer declares a price (MUST be <= their own money)
// - Starting LEFT of auctioneer, clockwise
// - Each player: buy at that price OR pass
// - First buyer wins, auction ends
// - If ALL pass: auctioneer MUST buy at their declared price

interface FixedPriceAuctionState {
  type: 'fixed_price';
  card: Card;
  auctioneerIndex: number;
  fixedPrice: number;
  currentPlayerIndex: number;  // Whose turn to decide
  passedPlayers: number[];     // Players who passed
}

// -----------------------
// E. DOUBLE AUCTION (Most Complex)
// -----------------------
// Rules:
// 1. Auctioneer plays Double card
// 2. Auctioneer MAY play second card (same artist, NOT another Double)
// 3. If auctioneer doesn't, offer passes LEFT clockwise
// 4. If another player plays second card:
//    - THEY become the new auctioneer
//    - THEY receive all money from winning bid
//    - Original auctioneer gets NOTHING
// 5. If NO ONE plays second card: original auctioneer gets Double card FREE
// 6. Auction type = second card's type
// 7. Winner gets BOTH paintings
// 8. Next turn starts LEFT of whoever was final auctioneer
//    (players between original and new auctioneer LOSE their turn)

interface DoubleAuctionState {
  type: 'double';
  primaryCard: Card;  // The Double card
  primaryAuctioneerIndex: number;  // Who played the Double
  phase: DoubleAuctionPhase;
}

type DoubleAuctionPhase =
  | {
      type: 'awaiting_second_card';
      currentOfferIndex: number;      // Who is being asked to provide second card
      declinedPlayers: number[];      // Players who passed on providing second
    }
  | {
      type: 'auction_in_progress';
      secondaryCard: Card;
      secondaryAuctioneerIndex: number;  // Who provided second card (gets money)
      innerAuction: Exclude<AuctionState, DoubleAuctionState>;  // The actual auction
    }
  | {
      type: 'resolved_free';
      recipient: number;  // Auctioneer gets card free (no one offered second)
    };
```

---

### 1.4 Bid Order Rules (Critical)

| Auction Type | Starting Player | Order | Auctioneer Position |
|--------------|-----------------|-------|---------------------|
| **Open** | Anyone | Any order | Can bid anytime |
| **One Offer** | Left of auctioneer | Clockwise | Bids LAST |
| **Hidden** | Simultaneous | N/A | Simultaneous with others |
| **Fixed Price** | Left of auctioneer | Clockwise | If all pass, MUST buy |
| **Double** | Depends on second card's type | Per second card | Per second card |

```typescript
// Helper: Get player to the left (clockwise) of given player
function getPlayerToLeft(playerIndex: number, playerCount: number): number {
  return (playerIndex + 1) % playerCount;
}

// Helper: Get clockwise distance from player A to player B
function clockwiseDistance(from: number, to: number, playerCount: number): number {
  if (to >= from) {
    return to - from;
  }
  return playerCount - from + to;
}

// Helper: Get turn order starting left of auctioneer, ending with auctioneer
function getTurnOrder(auctioneerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 1; i <= playerCount; i++) {
    order.push((auctioneerIndex + i) % playerCount);
  }
  return order;  // Auctioneer is last
}
```

---

### 1.5 Tie-Breaking Rules (Critical)

#### A. Hidden Auction Bid Ties

```typescript
function resolveHiddenAuctionWinner(
  bids: Map<number, number>,
  auctioneerIndex: number,
  playerCount: number
): { winner: number; amount: number } | null {
  // Find highest bid
  let maxBid = 0;
  for (const bid of bids.values()) {
    if (bid > maxBid) maxBid = bid;
  }

  if (maxBid === 0) {
    return null;  // No bids - auctioneer gets free
  }

  // Find all players with max bid
  const tiedPlayers: number[] = [];
  for (const [playerIndex, bid] of bids) {
    if (bid === maxBid) {
      tiedPlayers.push(playerIndex);
    }
  }

  if (tiedPlayers.length === 1) {
    return { winner: tiedPlayers[0], amount: maxBid };
  }

  // TIE-BREAKER:
  // 1. If auctioneer is tied, AUCTIONEER WINS
  if (tiedPlayers.includes(auctioneerIndex)) {
    return { winner: auctioneerIndex, amount: maxBid };
  }

  // 2. Otherwise, closest CLOCKWISE from auctioneer wins
  let closestPlayer = tiedPlayers[0];
  let closestDistance = clockwiseDistance(auctioneerIndex, closestPlayer, playerCount);

  for (const player of tiedPlayers) {
    const distance = clockwiseDistance(auctioneerIndex, player, playerCount);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlayer = player;
    }
  }

  return { winner: closestPlayer, amount: maxBid };
}
```

#### B. Artist Ranking Ties (End of Round)

```typescript
function rankArtists(
  cardsPlayedPerArtist: Record<Artist, number>
): ArtistRoundResult[] {
  // Create list of artists with their counts
  const artistCounts = ARTISTS.map((artist, index) => ({
    artist,
    cardCount: cardsPlayedPerArtist[artist],
    boardPosition: index,  // Lower = higher priority in ties
  }));

  // Sort by:
  // 1. Card count (descending)
  // 2. Board position (ascending) - leftmost wins ties
  artistCounts.sort((a, b) => {
    if (b.cardCount !== a.cardCount) {
      return b.cardCount - a.cardCount;
    }
    return a.boardPosition - b.boardPosition;  // Lower position wins
  });

  // Assign ranks to top 3 (if they have at least 1 card)
  const results: ArtistRoundResult[] = [];
  const values: (0 | 10 | 20 | 30)[] = [30, 20, 10];

  for (let i = 0; i < artistCounts.length; i++) {
    const { artist, cardCount } = artistCounts[i];

    if (i < 3 && cardCount > 0) {
      results.push({
        artist,
        cardCount,
        rank: (i + 1) as 1 | 2 | 3,
        value: values[i],
      });
    } else {
      results.push({
        artist,
        cardCount,
        rank: null,
        value: 0,
      });
    }
  }

  return results;
}
```

---

### 1.6 Round End Conditions (Critical Edge Cases)

```typescript
interface RoundEndCheck {
  shouldEnd: boolean;
  triggeringArtist: Artist | null;
  unsoldCards: Card[];  // 1 or 2 cards that triggered end
}

function checkRoundEnd(
  cardsPlayedPerArtist: Record<Artist, number>,
  cardJustPlayed: Card,
  isSecondCardOfDouble: boolean,
  firstCardOfDouble: Card | null
): RoundEndCheck {
  const artistCount = cardsPlayedPerArtist[cardJustPlayed.artist];

  // Case 1: 5th card of an artist ends the round
  if (artistCount >= 5) {
    const unsoldCards: Card[] = [cardJustPlayed];

    // Case 1a: If 5th card was SECOND card of Double, BOTH are unsold
    if (isSecondCardOfDouble && firstCardOfDouble) {
      unsoldCards.unshift(firstCardOfDouble);
    }

    return {
      shouldEnd: true,
      triggeringArtist: cardJustPlayed.artist,
      unsoldCards,
    };
  }

  return {
    shouldEnd: false,
    triggeringArtist: null,
    unsoldCards: [],
  };
}

// Special case: 5th card is FIRST card of a Double
// Round ends IMMEDIATELY - no second card is played
function checkRoundEndBeforeDouble(
  cardsPlayedPerArtist: Record<Artist, number>,
  doubleCard: Card
): RoundEndCheck {
  // The double card would be the 5th
  if (cardsPlayedPerArtist[doubleCard.artist] + 1 >= 5) {
    return {
      shouldEnd: true,
      triggeringArtist: doubleCard.artist,
      unsoldCards: [doubleCard],
    };
  }

  return {
    shouldEnd: false,
    triggeringArtist: null,
    unsoldCards: [],
  };
}
```

---

### 1.7 Card Distribution per Round

| Players | Round 1 | Round 2 | Round 3 | Round 4 |
|---------|---------|---------|---------|---------|
| 3 | 10 | 6 | 6 | 0 |
| 4 | 9 | 4 | 4 | 0 |
| 5 | 8 | 3 | 3 | 0 |

```typescript
const CARDS_PER_ROUND: Record<number, [number, number, number, number]> = {
  3: [10, 6, 6, 0],
  4: [9, 4, 4, 0],
  5: [8, 3, 3, 0],
};
```

---

### 1.8 Special Rules Summary

| Rule | Details |
|------|---------|
| **Money Hidden** | Players hide money behind screens until game end |
| **Minimum Bid** | 1k (one money token minimum) |
| **Cannot Overbid** | Cannot bid more than you have |
| **Auctioneer Wins Own Auction** | Pays money to BANK (not themselves) |
| **No Bids = Free** | Except Fixed Price: auctioneer must buy |
| **Cards Carry Over** | Unplayed cards stay in hand between rounds |
| **Paintings Don't Carry Over** | Purchased paintings sold at end of round |
| **Empty Hand** | Player can't auction but CAN still bid |
| **All Empty Early** | If all cards played before round 4 ends, game ends early |

---

### 1.9 Cumulative Artist Value Rule

**Critical Rule**: Artist must be in top 3 THIS round to have any value.

```typescript
function calculatePaintingValue(
  board: GameBoard,
  artist: Artist,
  currentRound: number,  // 0-indexed
  roundResults: ArtistRoundResult
): number {
  // If not in top 3 THIS round, painting is worthless
  if (roundResults.rank === null) {
    return 0;
  }

  // Sum all values from round 0 to current round
  let totalValue = 0;
  for (let r = 0; r <= currentRound; r++) {
    totalValue += board.artistValues[artist][r];
  }

  return totalValue;
}

// Example from rulebook:
// Round 1: Rafael = 1st (30k) → paintings worth 30k
// Round 2: Rafael = 3rd (10k) → paintings worth 40k (30+10)
// Round 3: Rafael = 4th (0k)  → paintings worth 0k (NOT in top 3!)
// Round 4: Rafael = 2nd (20k) → paintings worth 60k (30+10+20)
```

---

### 1.10 Game Logic Modules

| Module | Responsibility |
|--------|---------------|
| `DeckManager` | Shuffle, deal cards based on player count/round |
| `AuctionEngine` | Handle all 5 auction types with state machines |
| `RoundManager` | Track round progression, end conditions, unsold cards |
| `ValuationEngine` | Calculate artist rankings and cumulative values |
| `BankManager` | Handle money transactions, validate bids |
| `TurnManager` | Track whose turn, handle skips for empty hands |
| `EventEmitter` | Emit events for UI animations |

---

## Phase 2: AI Players

### 2.1 AI Decision Framework

```typescript
interface AIDecision {
  confidence: number;  // 0-1, for debugging/tuning
}

interface AIBidDecision extends AIDecision {
  action: 'bid' | 'pass';
  amount?: number;
}

interface AICardPlayDecision extends AIDecision {
  cardId: string;
}

interface AIFixedPriceDecision extends AIDecision {
  price: number;
}

interface AIDoubleOfferDecision extends AIDecision {
  action: 'offer' | 'decline';
  cardId?: string;
}

interface AIStrategy {
  // Core decisions
  chooseBid(state: GameState, auction: AuctionState): AIBidDecision;
  chooseCardToAuction(state: GameState, hand: Card[]): AICardPlayDecision;
  chooseFixedPrice(state: GameState, card: Card): AIFixedPriceDecision;
  chooseDoubleOffer(state: GameState, doubleCard: Card, hand: Card[]): AIDoubleOfferDecision;

  // Timing (for Open Auction feel)
  getBidDelay(): number;  // Milliseconds to wait before bidding
}
```

### 2.2 AI Difficulty Levels

| Level | Behavior |
|-------|----------|
| **Easy** | Random valid decisions, no strategy |
| **Medium** | Expected value calculations, basic card counting |
| **Hard** | Optimal play, market manipulation, opponent modeling |

### 2.3 AI Considerations by Auction Type

| Auction | Easy AI | Medium AI | Hard AI |
|---------|---------|-----------|---------|
| **Open** | Random up to fair value | Bid to expected value | Read opponent hesitation, bluff |
| **One Offer** | Random bid/pass | Bid if undervalued | Strategic passing to trap |
| **Hidden** | Random 0 to value | Estimate opponents, shade bid | Game theory optimal |
| **Fixed Price** | Random price | Price at expected purchase rate | Exploit opponent money knowledge |
| **Double** | Random offer | Offer if card helps self | Strategic denial/gifting |

### 2.4 AI Knowledge Constraints

**Fair Play**: AI should only use information a human player would have:

- Own hand and money
- Cards played (all visible)
- Paintings purchased by each player (visible)
- Bids placed (visible after auction)
- Artist value board (visible)

**AI Should NOT Know** (unless cheating mode):

- Other players' hands
- Other players' exact money
- Deck order

---

## Phase 3: Frontend Architecture

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | React 18 + TypeScript | Component-based, type safety |
| **State** | Zustand | Lightweight, works well with game state |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Animations** | Framer Motion | Smooth card/bid animations |
| **Build** | Vite | Fast dev experience |

### 3.2 Component Architecture

```
src/
├── components/
│   ├── game/
│   │   ├── GameTable.tsx           # Main play area layout
│   │   ├── ArtistBoard.tsx         # Value tiles display
│   │   ├── AuctionArea.tsx         # Current auction display
│   │   ├── PlayerHand.tsx          # Player's cards (fanned)
│   │   ├── PlayerZone.tsx          # Other players' purchased paintings
│   │   └── PlayerInfo.tsx          # Name, money (hidden), turn indicator
│   │
│   ├── auction/
│   │   ├── AuctionContainer.tsx    # Routes to correct auction UI
│   │   ├── OpenAuction.tsx         # Open bidding UI + countdown
│   │   ├── OneOfferAuction.tsx     # Turn-based bid/pass UI
│   │   ├── HiddenAuction.tsx       # Secret bid input + reveal
│   │   ├── FixedPriceAuction.tsx   # Price display + buy/pass
│   │   └── DoubleAuction.tsx       # Second card offer flow
│   │
│   ├── ui/
│   │   ├── Card.tsx                # Painting card component
│   │   ├── MoneyDisplay.tsx        # Hidden/revealed money
│   │   ├── BidInput.tsx            # Number input for bids
│   │   ├── ActionButton.tsx        # Bid/Pass/Buy buttons
│   │   ├── Countdown.tsx           # Timer for Open Auction
│   │   └── Gavel.tsx               # Auctioneer marker
│   │
│   └── screens/
│       ├── MainMenu.tsx            # Start game options
│       ├── GameSetup.tsx           # Player count, AI settings
│       ├── RoundSummary.tsx        # End of round results
│       └── GameOver.tsx            # Final scores, winner
│
├── engine/                          # Pure game logic (no React)
│   ├── types.ts                    # All TypeScript types
│   ├── constants.ts                # ARTISTS, AUCTION_TYPES, etc.
│   ├── deck.ts                     # Shuffle, deal
│   ├── auction.ts                  # Auction state machines
│   ├── round.ts                    # Round flow, end conditions
│   ├── valuation.ts                # Artist ranking, value calculation
│   ├── validation.ts               # Move validation
│   └── events.ts                   # Game event types
│
├── ai/
│   ├── types.ts                    # AI decision interfaces
│   ├── strategies/
│   │   ├── easy.ts
│   │   ├── medium.ts
│   │   └── hard.ts
│   └── evaluator.ts                # Card/position evaluation helpers
│
├── store/
│   └── gameStore.ts                # Zustand store
│
└── App.tsx
```

### 3.3 Event-Driven UI Updates

```typescript
type GameEvent =
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
  | { type: 'double_card_offered'; playerIndex: number; card: Card }
  | { type: 'double_card_declined'; playerIndex: number }
  | { type: 'money_paid'; from: number; to: number | 'bank'; amount: number }
  | { type: 'round_ended'; unsoldCards: Card[]; rankings: ArtistRoundResult[] }
  | { type: 'paintings_sold'; playerIndex: number; paintings: Card[]; totalValue: number }
  | { type: 'game_ended'; winner: number; finalScores: Map<number, number> };
```

### 3.4 Open Auction Ending Mechanism

Since there's no auctioneer saying "Going once, going twice...":

```typescript
interface OpenAuctionUI {
  // After each bid, start a countdown (e.g., 5 seconds)
  // If no new bid before countdown expires, auction ends
  // Display: "Going once... Going twice... SOLD!"

  countdownSeconds: number;
  lastBidTime: number;
  phases: 'active' | 'going_once' | 'going_twice' | 'sold';
}
```

---

## Phase 4: Testing Strategy

### 4.1 Critical Test Cases

#### Auction Tests

- [ ] Open: No bids → auctioneer gets free
- [ ] Open: Auctioneer wins own auction → pays bank
- [ ] One Offer: Correct turn order (left of auctioneer, clockwise, auctioneer last)
- [ ] One Offer: No bids → auctioneer gets free
- [ ] Hidden: All tied at 0 → auctioneer gets free
- [ ] Hidden: Tie with auctioneer → auctioneer wins
- [ ] Hidden: Tie without auctioneer → closest clockwise wins
- [ ] Fixed Price: All pass → auctioneer must buy
- [ ] Fixed Price: Cannot set price > own money
- [ ] Double: No one offers second → auctioneer gets free
- [ ] Double: Another player offers second → they become auctioneer
- [ ] Double: Correct turn skip after transferred auctioneer

#### Round End Tests

- [ ] 5th card of artist ends round
- [ ] 5th card is not auctioned
- [ ] 5th card as first of Double → ends immediately
- [ ] 5th card as second of Double → both cards unsold
- [ ] Unsold cards count toward artist ranking
- [ ] All players empty → round/game ends

#### Valuation Tests

- [ ] Artist tie-breaker: Manuel > Sigrid > Daniel > Ramon > Rafael
- [ ] Top 3 get 30k, 20k, 10k respectively
- [ ] Not top 3 = 0 value even with prior tiles
- [ ] Cumulative value: sum all tiles if top 3 this round
- [ ] Paintings sold at cumulative value

#### Edge Cases

- [ ] Player with 0 cards can still bid
- [ ] Cannot bid more than own money
- [ ] Cards in hand persist between rounds
- [ ] Purchased paintings discarded after selling

---

## Phase 5: Online Multiplayer (Future)

### 5.1 Architecture

| Component | Technology |
|-----------|------------|
| WebSocket Server | Socket.io |
| Game Server | Node.js + Express |
| Database | PostgreSQL (games) + Redis (sessions) |
| Auth | JWT + OAuth |

### 5.2 Key Considerations

- Server is authoritative (prevents cheating)
- Client sends intents, server validates
- Optimistic UI with rollback
- Reconnection handling
- Turn timers for online play
- Mixed AI/human games

---

## Phase 6: Visual Design & Branding (Parallel Track)

This phase can be developed independently alongside the game engine. The UI/UX designer will create the complete visual identity, artwork, and design system.

### 6.1 Brand Identity & Theme

#### 6.1.1 Game Branding
```typescript
// ===================
// BRAND IDENTITY
// ===================

interface BrandIdentity {
  name: string;
  tagline: string;
  logo: {
    primary: string;      // Main logo path
    icon: string;         // Favicon/app icon
    monochrome: string;   // Single color version
  };
  brandColors: {
    primary: ColorPalette;
    secondary: ColorPalette;
    accent: ColorPalette;
  };
  typography: {
    heading: TypographyScale;
    body: TypographyScale;
    ui: TypographyScale;
  };
  iconography: {
    style: 'line' | 'filled' | 'duotone';
    set: 'custom' | 'material' | 'feather';
  };
  illustration: {
    style: 'modern' | 'abstract' | 'geometric' | 'artistic';
    artistProfiles: ArtistVisualProfile[];
  };
}

interface ColorPalette {
  50: string;   // Lightest
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;  // Base
  600: string;
  700: string;
  800: string;
  900: string;  // Darkest
}

interface ArtistVisualProfile {
  name: Artist;
  colorScheme: ColorPalette;
  visualMotif: string;    // e.g., "geometric patterns", "abstract shapes"
  backgroundStyle: string;
  cardBackDesign: string;
  signatureElement: string; // Unique element for each artist
}
```

#### 6.1.2 Visual Style Direction

| Element | Style Choice | Rationale |
|---------|--------------|-----------|
| **Overall Theme** | Modern Art Gallery | Clean, sophisticated, art-focused |
| **Color Mood** | Vibrant but elegant | Reflects art market, not overwhelming |
| **Typography** | Sans-serif with artistic flair | Modern, readable, premium feel |
| **Icon Style** | Line art with fills | Sophisticated, consistent |
| **Animation** | Smooth, physics-based | Premium feel, aids gameplay |
| **Sound** | Subtle gallery ambiance | Immersive but not distracting |

### 6.2 Card Artwork Design

#### 6.2.1 Artist-Specific Visual Languages

```typescript
// ===================
// ARTIST VISUAL GUIDES
// ===================

const ARTIST_VISUAL_PROFILES: ArtistVisualProfile[] = [
  {
    name: 'Manuel Carvalho',
    colorScheme: {
      50: '#fef3e2',
      500: '#f59e0b',
      900: '#78350f',
      // ... other shades
    },
    visualMotif: 'Abstract geometric patterns with warm oranges',
    backgroundStyle: 'Textured canvas with subtle gradients',
    cardBackDesign: 'Minimalist gold frame on cream background',
    signatureElement: 'Small golden sunburst in corner',
  },
  {
    name: 'Sigrid Thaler',
    colorScheme: {
      50: '#f0f9ff',
      500: '#0ea5e9',
      900: '#0c4a6e',
      // ... other shades
    },
    visualMotif: 'Fluid, wave-like forms in cool blues',
    backgroundStyle: 'Watercolor wash effects',
    cardBackDesign: 'Flowing blue lines on white',
    signatureElement: 'Wave crest symbol',
  },
  // ... other artists
];
```

#### 6.2.2 Card Design Specifications

```typescript
interface CardDesignSpec {
  dimensions: {
    width: number;   // e.g., 200px
    height: number;  // e.g., 280px
    aspectRatio: number;
  };
  layout: {
    headerHeight: number;    // Artist name
    imageArea: number;       // Artwork display
    footerHeight: number;    // Auction type icon
    margins: MarginSpacing;
  };
  typography: {
    artistName: TextSpec;
    auctionType: TextSpec;
  };
  artworkSpecs: {
    minResolution: number;   // 512x512 for crisp display
    format: 'svg' | 'png' | 'webp';
    styleGuide: string;      // Path to style guide
  };
}

// Card variations per artist
interface CardArtworkVariations {
  // Each artist needs multiple unique artworks
  // Total: 70 unique artworks across all artists
  [artist: string]: {
    artworks: ArtworkAsset[];
    distribution: number[];  // How many cards of this artwork
  };
}
```

#### 6.2.3 Auction Type Visual Indicators

```typescript
interface AuctionTypeIndicator {
  type: AuctionType;
  icon: string;           // SVG path or emoji
  color: string;
  animation?: string;     // How it appears/animates
  position: 'corner' | 'bottom' | 'overlay';
}

const AUCTION_TYPE_INDICATORS: AuctionTypeIndicator[] = [
  {
    type: 'open',
    icon: '📢',           // Or custom SVG
    color: '#10b981',     // Green - open, accessible
    position: 'corner',
    animation: 'pulse-slow',
  },
  {
    type: 'one_offer',
    icon: '👆',
    color: '#3b82f6',     // Blue - single action
    position: 'bottom',
  },
  // ... other types
];
```

### 6.3 UI Screen Designs

#### 6.3.1 Screen-by-Screen Design Requirements

| Screen | Design Elements | Interactive Elements | Art Requirements |
|--------|----------------|----------------------|------------------|
| **Main Menu** | Logo, background art, nav buttons | Hover states, transitions | Gallery ambiance illustration |
| **Player Setup** | Player slots, color indicators | Type toggles, name inputs | Player avatars/icons |
| **Game Table** | Felt texture, board layout | Card interactions, bid UI | Table texture, board design |
| **Auction UI** | Card spotlight, bid controls | Animated bids, timers | Spotlight effects |
| **Round Summary** | Value tiles, results display | Continue button | Celebration animations |
| **Game Over** | Winner reveal, scores | Play again, main menu | Trophy/artwork display |

#### 6.3.2 Responsive Design Considerations

```typescript
// ===================
// RESPONSIVE BREAKPOINTS
// ===================

interface Breakpoints {
  mobile: {
    max: 640;
    cardSize: { w: 60; h: 84 };
    layout: 'scroll' | 'zoom';
  };
  tablet: {
    min: 641; max: 1024;
    cardSize: { w: 120; h: 168 };
    layout: 'adapt';
  };
  desktop: {
    min: 1025;
    cardSize: { w: 200; h: 280 };
    layout: 'full';
  };
}

// Layout adaptations per screen size
interface LayoutAdaptation {
  gameTable: {
    mobile: 'vertical-stack' | 'scroll-horizontal';
    tablet: 'compact-view';
    desktop: 'full-table';
  };
  playerHand: {
    mobile: 'scrollable-fan';
    tablet: 'compact-fan';
    desktop: 'full-fan';
  };
}
```

### 6.4 Animation & Motion Design

#### 6.4.1 Animation Specification

```typescript
// ===================
// ANIMATION LIBRARY
// ===================

interface AnimationSpec {
  duration: number;      // milliseconds
  easing: EasingFunction;
  delay?: number;
  repeat?: number | 'infinite';
}

interface GameAnimations {
  card: {
    deal: AnimationSpec;           // Cards dealt to players
    play: AnimationSpec;           // Card played to table
    auction: AnimationSpec;        // Move to auction area
    collect: AnimationSpec;        // Winner takes cards
    discard: AnimationSpec;        // End of round cleanup
  };
  bid: {
    place: AnimationSpec;          // Bid token appears
    raise: AnimationSpec;          // Bid amount increases
    win: AnimationSpec;            // Winner confirmation
  };
  ui: {
    highlight: AnimationSpec;      // Active player/cursor
    countdown: AnimationSpec;      // Timer tick
    notification: AnimationSpec;   // Info/error messages
    transition: AnimationSpec;     // Screen changes
  };
}

// Physics-based constants for realistic motion
const MOTION_CONSTANTS = {
  gravity: 9.8,
  friction: 0.95,
  bounceDamping: 0.7,
  cardHover: 5,      // pixels lift
  cardFanAngle: 15,  // degrees per card
};
```

#### 6.4.2 Visual Feedback Systems

```typescript
// ===================
// VISUAL FEEDBACK
// ===================

interface FeedbackSystem {
  turn: {
    activePlayer: {
      glow: ColorGlow;
      pulse: PulseAnimation;
    };
    inactivePlayers: {
      opacity: number;
      blur: number;
    };
  };
  auction: {
    biddingActive: {
      countdownGlow: ColorGlow;
      buttonPulse: PulseAnimation;
    };
    bidPlaced: {
      confirmation: NotificationSpec;
      highlight: BorderGlow;
    };
  };
  validation: {
    invalidMove: ShakeAnimation;
    insufficientFunds: RedFlash;
    validAction: GreenFlash;
  };
}
```

---

## Phase 7: UI/UX Implementation (Parallel Track)

This phase implements the design system and creates all UI components. Can be done parallel to Phase 1-2.

### 7.1 Component Library Setup

#### 7.1.1 Design System Structure

```typescript
// ===================
// DESIGN TOKENS
// ===================

// File: src/design/tokens.ts
export const tokens = {
  colors: {
    brand: {
      primary: { 50: '#fef3e2', 500: '#f59e0b', 900: '#78350f' },
      secondary: { 50: '#f0f9ff', 500: '#0ea5e9', 900: '#0c4a6e' },
      // ... all brand colors
    },
    neutral: {
      gray: { 50: '#f9fafb', 500: '#6b7280', 900: '#111827' },
      white: '#ffffff',
      black: '#000000',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      display: ['Playfair Display', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    card: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
};
```

#### 7.1.2 Base Component Primitives

```typescript
// ===================
// COMPONENT PRIMITIVES
// ===================

// File: src/components/primitives/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', ...props }, ref) => {
    const baseClasses = 'font-medium rounded-lg transition-all focus:outline-none focus:ring-2';
    const variantClasses = {
      primary: 'bg-brand-primary-500 text-white hover:bg-brand-primary-600 focus:ring-brand-primary-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    };
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size])}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={props.disabled}
        {...props}
      />
    );
  }
);

// File: src/components/primitives/Card.tsx
interface CardBaseProps {
  size: 'sm' | 'md' | 'lg';
  elevation: 'none' | 'sm' | 'md' | 'lg';
  hover: boolean;
  clickable: boolean;
  children: ReactNode;
  onClick?: () => void;
}

const CardBase = forwardRef<HTMLDivElement, CardBaseProps>(
  ({ size = 'md', elevation = 'md', hover = true, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-12 h-16',
      md: 'w-24 h-32',
      lg: 'w-48 h-64',
    };
    const elevationClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-card',
      lg: 'shadow-xl',
    };

    return (
      <motion.div
        ref={ref}
        className={clsx(
          'bg-white rounded-lg border border-gray-200',
          sizeClasses[size],
          elevationClasses[elevation],
          hover && 'hover:shadow-xl transition-shadow',
          props.clickable && 'cursor-pointer'
        )}
        whileHover={hover ? { y: -4 } : {}}
        {...props}
      />
    );
  }
);
```

### 7.2 Game-Specific Components

#### 7.2.1 Painting Card Component

```typescript
// ===================
// PAINTING CARD
// ===================

// File: src/components/game/PaintingCard.tsx
interface PaintingCardProps {
  card: Card;
  size: 'sm' | 'md' | 'lg';
  showAuctionType: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  orientation?: 'vertical' | 'horizontal';
}

const PaintingCard: React.FC<PaintingCardProps> = ({
  card,
  size,
  showAuctionType,
  interactive = false,
  selected = false,
  ...props
}) => {
  const artworkSrc = `/assets/artworks/${card.artist}/${card.artworkId}.webp`;
  const profile = ARTIST_VISUAL_PROFILES.find(p => p.name === card.artist);
  const auctionIndicator = AUCTION_TYPE_INDICATORS.find(
    i => i.type === card.auctionType
  );

  return (
    <motion.div
      className={clsx(
        'painting-card relative overflow-hidden',
        `size-${size}`,
        selected && 'ring-4 ring-blue-500',
        interactive && 'cursor-pointer hover:scale-105'
      )}
      onClick={props.onClick}
      whileHover={interactive ? { y: -10, rotate: 2 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Card background with artist color scheme */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: profile?.colorScheme[50] }}
      />

      {/* Artwork */}
      <div className="relative h-3/4 p-2">
        <img
          src={artworkSrc}
          alt={`${card.artist} painting`}
          className="w-full h-full object-cover rounded"
          loading="lazy"
        />
      </div>

      {/* Artist name */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded">
        <span className="text-sm font-semibold" style={{ color: profile?.colorScheme[700] }}>
          {card.artist}
        </span>
      </div>

      {/* Auction type indicator */}
      {showAuctionType && auctionIndicator && (
        <motion.div
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 backdrop-blur"
          style={{ color: auctionIndicator.color }}
          animate={auctionIndicator.animation ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {auctionIndicator.icon}
        </motion.div>
      )}

      {/* Artist signature element */}
      {profile?.signatureElement && (
        <div className="absolute bottom-2 left-2 opacity-30">
          {profile.signatureElement}
        </div>
      )}
    </motion.div>
  );
};
```

#### 7.2.2 Player Hand Component

```typescript
// ===================
// PLAYER HAND
// ===================

// File: src/components/game/PlayerHand.tsx
interface PlayerHandProps {
  cards: Card[];
  isCurrentPlayer: boolean;
  playableCards: string[];  // Card IDs that can be played
  onCardSelect: (cardId: string) => void;
  maxFanAngle?: number;     // Maximum spread angle
  cardOverlap?: number;     // How much cards overlap
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  isCurrentPlayer,
  playableCards,
  onCardSelect,
  maxFanAngle = 45,
  cardOverlap = 0.6,
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Calculate card positions in a fan
  const getCardStyle = (index: number, total: number): CSSProperties => {
    if (total === 1) return {};

    const angleStep = maxFanAngle / (total - 1);
    const angle = (index - (total - 1) / 2) * angleStep;
    const rotate = `${angle}deg`;

    const offset = index * (1 - cardOverlap) * 100;
    const translate = `translateX(${offset}px) translateY(${-Math.abs(angle) * 0.5}px)`;

    return {
      transform: `${translate} rotate(${rotate})`,
      zIndex: hoveredCard === cards[index].id ? 20 : 10 + index,
    };
  };

  return (
    <div className="player-hand relative h-40 flex items-end justify-center">
      {cards.map((card, index) => {
        const isPlayable = playableCards.includes(card.id);
        const isHovered = hoveredCard === card.id;
        const isSelected = selectedCard === card.id;

        return (
          <motion.div
            key={card.id}
            className="absolute"
            style={getCardStyle(index, cards.length)}
            animate={{
              y: isHovered ? -20 : isSelected ? -10 : 0,
              scale: isHovered ? 1.1 : isSelected ? 1.05 : 1,
            }}
            whileHover={isPlayable ? { y: -20, scale: 1.1 } : {}}
            onHoverStart={() => isPlayable && setHoveredCard(card.id)}
            onHoverEnd={() => setHoveredCard(null)}
            onClick={() => {
              if (isPlayable) {
                setSelectedCard(card.id === selectedCard ? null : card.id);
                onCardSelect(card.id);
              }
            }}
          >
            <PaintingCard
              card={card}
              size="md"
              showAuctionType={true}
              interactive={isPlayable && isCurrentPlayer}
              selected={isSelected}
            />
            {!isPlayable && (
              <div className="absolute inset-0 bg-gray-500/50 rounded-lg" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
```

#### 7.2.3 Auction Interface Components

```typescript
// ===================
// AUCTION INTERFACES
// ===================

// File: src/components/auction/OpenAuction.tsx
interface OpenAuctionProps {
  auction: OpenAuctionState;
  currentPlayerIndex: number;
  onPlaceBid: (amount: number) => void;
  onPass: () => void;
}

const OpenAuction: React.FC<OpenAuctionProps> = ({
  auction,
  currentPlayerIndex,
  onPlaceBid,
  onPass,
}) => {
  const [bidAmount, setBidAmount] = useState(
    auction.currentHighBid ? auction.currentHighBid + 1 : 1
  );
  const timeLeft = auction.countdownSeconds;

  return (
    <motion.div
      className="open-auction p-6 bg-white rounded-xl shadow-xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {/* Card being auctioned */}
      <div className="flex justify-center mb-6">
        <PaintingCard card={auction.card} size="lg" showAuctionType={false} />
      </div>

      {/* Current bid info */}
      <div className="text-center mb-4">
        {auction.currentHighBid ? (
          <p className="text-lg">
            Current bid: <span className="font-bold text-brand-primary-600">
              ${auction.currentHighBid}k
            </span> by Player {auction.currentHighBidder + 1}
          </p>
        ) : (
          <p className="text-lg text-gray-600">No bids yet</p>
        )}
      </div>

      {/* Countdown timer */}
      <div className="flex justify-center mb-6">
        <motion.div
          className="relative w-16 h-16"
          animate={{ rotate: 360 }}
          transition={{ duration: timeLeft, ease: 'linear' }}
        >
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="#10b981"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - timeLeft / 5) }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{Math.ceil(timeLeft)}</span>
          </div>
        </motion.div>
      </div>

      {/* Bid controls */}
      <div className="flex items-center justify-center gap-4">
        <BidInput
          value={bidAmount}
          onChange={setBidAmount}
          min={auction.currentHighBid ? auction.currentHighBid + 1 : 1}
        />
        <Button
          variant="primary"
          size="lg"
          onClick={() => onPlaceBid(bidAmount)}
          disabled={!canAffordBid(bidAmount)}
        >
          Bid ${bidAmount}k
        </Button>
        {auction.currentHighBid === null && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onPass}
          >
            Pass
          </Button>
        )}
      </div>
    </motion.div>
  );
};
```

---

## Phase 8: Component Library & Design System (Parallel Track)

Creating a comprehensive component library that can be used across all phases.

### 8.1 Storybook Documentation

#### 8.1.1 Component Documentation Structure

```typescript
// File: .storybook/main.ts
export default {
  stories: ['../src/components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-backgrounds',
  ],
};

// Example: PaintingCard.stories.tsx
export default {
  title: 'Game/PaintingCard',
  component: PaintingCard,
  parameters: {
    docs: {
      description: {
        component: 'A painting card that displays artwork, artist, and auction type.',
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f8fafc' },
        { name: 'dark', value: '#1e293b' },
        { name: 'table', value: '#065f46' },  // Game table green
      ],
    },
  },
};

const Template = (args) => <PaintingCard {...args} />;

export const Default = Template.bind({});
Default.args = {
  card: {
    id: 'mc-001',
    artist: 'Manuel Carvalho',
    auctionType: 'open',
    artworkId: 'mc-001',
  },
  size: 'md',
  showAuctionType: true,
};

export const AllSizes = () => (
  <div className="flex gap-4">
    <PaintingCard size="sm" {...Default.args} />
    <PaintingCard size="md" {...Default.args} />
    <PaintingCard size="lg" {...Default.args} />
  </div>
);
```

#### 8.1.2 Design Token Documentation

```typescript
// File: src/design/ColorPalette.stories.tsx
export default {
  title: 'Design/Colors',
  parameters: {
    docs: {
      description: {
        component: 'Complete color palette used throughout the application.',
      },
    },
  },
};

export const BrandColors = () => (
  <div className="grid grid-cols-3 gap-8">
    {Object.entries(tokens.colors.brand).map(([name, palette]) => (
      <div key={name}>
        <h3 className="text-lg font-semibold mb-2">{name}</h3>
        <div className="space-y-2">
          {Object.entries(palette).map(([shade, value]) => (
            <div key={shade} className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded border"
                style={{ backgroundColor: value }}
              />
              <span className="text-sm">{shade}: {value}</span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
```

### 8.2 Testing Strategy for Components

#### 8.2.1 Component Testing Setup

```typescript
// File: src/components/__tests__/PaintingCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PaintingCard } from '../PaintingCard';

describe('PaintingCard', () => {
  const mockCard = {
    id: 'test-001',
    artist: 'Manuel Carvalho' as Artist,
    auctionType: 'open' as AuctionType,
    artworkId: 'test-artwork',
  };

  it('displays artist name', () => {
    render(<PaintingCard card={mockCard} size="md" showAuctionType />);
    expect(screen.getByText('Manuel Carvalho')).toBeInTheDocument();
  });

  it('shows auction type when enabled', () => {
    render(<PaintingCard card={mockCard} size="md" showAuctionType />);
    expect(screen.getByText('📢')).toBeInTheDocument();  // Open auction icon
  });

  it('calls onClick when clicked and interactive', () => {
    const handleClick = jest.fn();
    render(
      <PaintingCard
        card={mockCard}
        size="md"
        showAuctionType
        interactive
        onClick={handleClick}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### 8.2.2 Visual Regression Testing

```typescript
// File: src/components/__tests__/visual/PlayerHand.visual.tsx
import { render } from '@testing-library/react';
import { PlayerHand } from '../../game/PlayerHand';

describe('PlayerHand Visual Tests', () => {
  it('matches snapshot with 5 cards', () => {
    const { container } = render(
      <PlayerHand
        cards={mockCards.slice(0, 5)}
        isCurrentPlayer={true}
        playableCards={mockCards.slice(0, 5).map(c => c.id)}
        onCardSelect={jest.fn()}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### 8.3 Performance Optimization

#### 8.3.1 Component Performance

```typescript
// File: src/components/performance/LazyCard.tsx
import { lazy, Suspense } from 'react';

const PaintingCard = lazy(() => import('../game/PaintingCard'));

export const LazyPaintingCard = (props) => (
  <Suspense fallback={<CardSkeleton />}>
    <PaintingCard {...props} />
  </Suspense>
);

// Skeleton placeholder while loading
const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg w-24 h-32" />
  </div>
);
```

#### 8.3.2 Asset Optimization

```typescript
// File: src/utils/imageOptimization.ts
export const getOptimizedArtworkSrc = (
  artist: Artist,
  artworkId: string,
  size: 'thumb' | 'small' | 'medium' | 'large'
): string => {
  const sizeMap = {
    thumb: 'w=60&h=84',
    small: 'w=120&h=168',
    medium: 'w=240&h=336',
    large: 'w=480&h=672',
  };

  return `/api/artwork/${artist}/${artworkId}?${sizeMap[size]}&format=webp`;
};

// Preload critical assets
export const preloadArtworks = (cards: Card[]) => {
  const uniqueArtworks = new Set(
    cards.map(c => `${c.artist}/${c.artworkId}`)
  );

  uniqueArtworks.forEach(artwork => {
    const img = new Image();
    img.src = getOptimizedArtworkSrc(
      artwork.split('/')[0] as Artist,
      artwork.split('/')[1],
      'medium'
    );
  });
};
```

---

## Updated Implementation Order (Parallel Tracks)

### Track A: Game Engine & Logic (Phases 1-2)
**Can be done independently of UI/UX work**

1. [ ] Project setup (React + TypeScript + Vite + Tailwind)
2. [ ] Define all TypeScript types from this document
3. [ ] Implement deck shuffle and deal
4. [ ] Implement artist ranking with correct tie-breaker
5. [ ] Implement cumulative value calculation
6. [ ] Implement each auction type (with tests):
   - [ ] Open Auction
   - [ ] One Offer Auction
   - [ ] Hidden Auction
   - [ ] Fixed Price Auction
   - [ ] Double Auction (most complex, do last)
7. [ ] Implement round flow and end conditions
8. [ ] Implement 4-round game flow
9. [ ] AI Players implementation (Phase 2)

### Track B: Visual Design & Art (Phase 6)
**Can be done independently and in parallel**

1. [ ] Brand identity design (logo, colors, typography)
2. [ ] Artist visual profiles (color schemes, motifs)
3. [ ] Create 70 unique artwork assets:
   - 12 for Manuel Carvalho
   - 13 for Sigrid Thaler
   - 15 for Daniel Melim
   - 15 for Ramon Martins
   - 15 for Rafael Silveira
4. [ ] UI screen mockups (Figma/Sketch)
5. [ ] Animation and motion design specifications
6. [ ] Asset optimization and export

### Track C: Component Library (Phase 7-8)
**Can be done after Phase 6 basic visuals are ready**

1. [ ] Design tokens implementation (colors, spacing, typography)
2. [ ] Component primitives (Button, Input, Card, etc.)
3. [ ] Game-specific components (PaintingCard, PlayerHand, etc.)
4. [ ] Auction interface components (all 5 types)
5. [ ] Storybook documentation
6. [ ] Component testing (unit + visual regression)

### Track D: Integration & Polish
**Requires work from other tracks**

1. [ ] Integrate engine with UI components
2. [ ] Implement animations (Framer Motion)
3. [ ] Add sound effects
4. [ ] Responsive design adjustments
5. [ ] Performance optimization
6. [ ] Tutorial and help system

### Track E: Online Multiplayer (Future)
**Phase 5 - after single player complete**

1. [ ] Backend setup (Node.js + Socket.io)
2. [ ] WebSocket integration
3. [ ] Matchmaking system
4. [ ] User accounts and profiles
5. [ ] Leaderboards and statistics

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| **Bid order** | Left of auctioneer, clockwise, auctioneer last (One Offer, Fixed Price) |
| **Hidden tie-breaker** | Auctioneer wins if tied; else closest clockwise from auctioneer |
| **Artist tie-breaker** | Board position (Manuel=1 wins over Rafael=5) |
| **Cumulative values** | Only if top 3 THIS round; otherwise 0 |
| **5th card** | Ends round, counts for ranking, not auctioned |
| **Double 5th** | As first: immediate end. As second: both unsold |

---

## Legal Note

Modern Art is designed by Reiner Knizia. This implementation is for personal/educational use. Commercial distribution would require licensing from the rights holders.
