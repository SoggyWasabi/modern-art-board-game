# Modern Art Board Game - Implementation Tasks

## Overview
This document tracks the remaining implementation tasks to complete the auction flows and AI integration for the Modern Art board game.

---

## 🎯 Priority 1: Core Game Flow

### 1.1 Fix Auction End Flow
**Issue**: After auction concludes, game doesn't transition to next turn properly

**Current State**:
- ✅ `executeAuction` handles money transfers and card movement
- ✅ Card added to winner's `purchasedThisRound`
- ❌ Game state stays in auction phase
- ❌ No turn transition to next player
- ❌ Auction UI doesn't clear

**Tasks**:
- [ ] Create `transitionAfterAuction` function in gameStore
  - Should change `round.phase.type` from `'auction'` to `'awaiting_card_play'`
  - Should increment `activePlayerIndex` to next player
  - Should clear auction state from UI
- [ ] Update all auction conclusion handlers to call transition function
- [ ] Test: One-offer auction → back to card selection with next player

**Files to modify**:
- `src/store/gameStore.ts` (add transition logic)
- `src/components/game/auction/ActiveAuction.tsx` (handle state clearing)

---

## 🎯 Priority 2: Complete Auction UI Implementations

### 2.1 Open Auction UI
**Current State**: Basic UI exists but incomplete

**Missing Features**:
- [ ] Turn-based bidding indicator (who's turn to bid)
- [ ] Current player highlighting
- [ ] Pass button functionality
- [ ] Minimum bid enforcement (current + 1)
- [ ] End auction detection (all players pass)

### 2.2 Hidden Auction UI
**Current State**: Not implemented

**Required UI**:
- [ ] Bid input field (hidden from other players)
- [ ] "Submit Bid" button
- [ ] Reveal phase UI (show all bids simultaneously)
- [ ] Winner announcement
- [ ] Money transfer visualization

### 2.3 Fixed Price Auction UI
**Current State**: Not implemented

**Required UI**:
- [ ] Price setting interface for auctioneer
- [ ] "Buy at $Xk" button for other players
- [ ] Pass button
- [ ] Turn order indicator (left of auctioneer first)
- [ ] First-come-first-served behavior

### 2.4 Double Auction UI
**Current State**: Not implemented

**Required UI**:
- [ ] Second card selection from hand
- [ ] Card pairing confirmation
- [ ] Combined auction display (both cards)
- [ ] Bidding interface for combined auction
- [ ] Decline option (play single card instead)

**Files to create/modify**:
- `src/components/game/auction/OpenAuction.tsx` (extract from ActiveAuction)
- `src/components/game/auction/HiddenAuction.tsx` (new)
- `src/components/game/auction/FixedPriceAuction.tsx` (new)
- `src/components/game/auction/DoubleAuction.tsx` (new)
- `src/components/game/auction/ActiveAuction.tsx` (use appropriate component)

---

## 🎯 Priority 3: AI Turn System

### 3.1 AI Card Playing Logic
**Current State**: `processAITurn()` is called but not implemented

**Required Implementation**:
- [ ] Implement `processAITurn()` in gameStore
  - Should identify current AI player
  - Should select optimal card to auction
  - Should call `playCard()` with selected card
- [ ] Create AI card selection strategy
  - Consider hand composition
  - Consider market conditions
  - Consider player money levels
- [ ] Add AI thinking delay (1-2 seconds for UX)

### 3.2 AI Turn Detection
**Current State**: AI doesn't know when it's their turn to play cards

**Required Implementation**:
- [ ] Turn change detection after auction ends
- [ ] Automatic AI turn triggering
- [ ] AI turn queue management (if multiple AI players)

### 3.3 AI Auction Integration
**Current State**: ✅ Working (auctionAIOrchestrator handles this)

**Verification**:
- [ ] Test all auction types work with AI
- [ ] Verify AI decision making for each auction type
- [ ] Ensure smooth flow from AI card play → auction → next turn

**Files to modify**:
- `src/store/gameStore.ts` (implement processAITurn)
- `src/integration/` (potentially create AI turn manager)
- `src/ai/strategies/` (card selection strategies)

---

## 🎯 Priority 4: Polish & Edge Cases

### 4.1 Round Management
**Tasks**:
- [ ] Implement round ending detection (5th card of same artist)
- [ ] Add round-to-round state persistence
- [ ] Implement artist valuation at round end
- [ ] Bank selling phase UI

### 4.2 Game Flow Polish
**Tasks**:
- [ ] Add animations for card movements
- [ ] Add sound effects for auction actions
- [ ] Improve bid history visualization
- [ ] Add tutorial/hints for new players

### 4.3 Error Handling
**Tasks**:
- [ ] Handle invalid bids gracefully
- [ ] Handle network/game state sync issues
- [ ] Add undo functionality (optional)
- [ ] Add game state persistence (save/load)

---

## 📋 Implementation Order Recommendation

1. **Week 1**: Core Game Flow
   - Fix auction end transitions
   - Implement AI card playing
   - Test basic loop: AI plays → auction → AI plays

2. **Week 2**: Complete Auction UIs
   - Hidden auction UI
   - Fixed price auction UI
   - Open auction improvements

3. **Week 3**: Advanced Features
   - Double auction UI
   - Round management
   - Polish and edge cases

---

## 🔍 Testing Checklist

When implementing each feature, verify:

- [ ] Game state transitions correctly
- [ ] Money transfers are accurate
- [ ] Card ownership updates properly
- [ ] Turn order follows game rules
- [ ] AI makes reasonable decisions
- [ ] UI updates smoothly
- [ ] No browser console errors
- [ ] Works on mobile (if applicable)

---

## 📚 References

- **Game Rules**: [Link to official Modern Art rules]
- **Engine Functions**: `src/engine/auction/`
- **AI Integration**: `src/integration/auctionAIOrchestrator.ts`
- **UI Components**: `src/components/game/auction/`
- **Game Store**: `src/store/gameStore.ts`

---

## 🔊 Open Auction Implementation Plan

### Design Decisions

1. **Auction Ending**: 10 seconds of no bids ends the auction (timer resets on each new bid)
2. **AI Behavior**: AI has its own bidding logic, separate from frontend implementation
3. **Bid Increments**: Minimum +$1k over current bid

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   OpenAuctionManager                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │  AI 1   │  │  AI 2   │  │  AI 3   │  │ Human  │ │
│  │ Timer   │  │ Timer   │  │ Timer   │  │  (UI)  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
│       └────────────┴────────────┴────────────┘      │
│                        │                            │
│              ┌─────────▼─────────┐                  │
│              │   Auction State   │                  │
│              │   (currentBid,    │                  │
│              │    timer, etc)    │                  │
│              └───────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

### State Changes

```typescript
interface OpenAuctionState {
  type: 'open'
  card: Card
  auctioneerId: string
  currentBid: number
  currentBidderId: string | null
  isActive: boolean

  // NEW FIELDS
  timerEndTime: number | null      // When countdown ends (epoch ms)
  timerDuration: number            // Reset duration (10000ms)
  bidHistory: Array<{              // For showing bid stream
    playerId: string
    amount: number
    timestamp: number
  }>
}
```

### Components to Build

| Component | Description |
|-----------|-------------|
| `OpenAuction.tsx` | Real-time UI with countdown, bid stream, always-active input |
| `OpenAuctionAIManager.ts` | Manages AI "threads" with setTimeout |
| `gameStore.ts` | New action for open bids that resets timer |
| `open.ts` (engine) | Add timer logic, remove turn-based concepts |

### UI Elements

- Live countdown timer (updates every 100ms)
- Bid stream showing recent bids
- Quick bid buttons (+1, +5 over current)
- Always-active bid input (no waiting for turns)

### Implementation Order

1. Update types - Add new fields to `OpenAuctionState`
2. Update engine - Timer logic, remove turn-based pass counting
3. Create `OpenAuctionAIManager` - Handle concurrent AI bidding
4. Create `OpenAuction.tsx` - Real-time UI component
5. Wire up gameStore - New actions for open auction flow

---

**Last Updated**: 2025-12-20
**Status**: Ready for implementation