# Modern Art Online - Implementation Plan (Revised)

**Version**: 2.0
**Last Updated**: 2025-12-07
**Status**: Peer Review Incorporated

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

### 1.1 Artists (Board Order - Left to Right)

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

### 1.2 Core Data Models

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

## Implementation Order

### Milestone 1: Core Engine

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

### Milestone 2: Basic UI

1. [ ] Game table layout
2. [ ] Card display
3. [ ] Player hand
4. [ ] Auction area with controls
5. [ ] Artist value board
6. [ ] Round/game summaries

### Milestone 3: AI Players

1. [ ] AI decision framework
2. [ ] Easy AI
3. [ ] Medium AI
4. [ ] Hard AI

### Milestone 4: Polish

1. [ ] Animations (Framer Motion)
2. [ ] Sound effects
3. [ ] Tutorial
4. [ ] Responsive design

### Milestone 5: Online (Future)

1. [ ] Backend setup
2. [ ] WebSocket integration
3. [ ] Matchmaking
4. [ ] Accounts

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
