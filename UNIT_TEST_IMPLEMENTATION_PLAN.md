# Unit Test Implementation Plan

## Money.ts Tests - Critical Game Economy

### Core Money Transfer Functions
1. **transferMoney()**
   - ✅ Valid transfer between two players
   - ✅ Transfer to same player (should work but no change)
   - ✅ Negative amount (should throw)
   - ✅ Zero amount (should throw)
   - ✅ Insufficient funds (should throw)
   - ✅ Non-existent player IDs
   - ✅ Transfer preserves total money

2. **payToBank() / receiveFromBank()**
   - ✅ Valid payment to bank
   - ✅ Valid receipt from bank
   - ✅ Negative amounts (should throw)
   - ✅ Insufficient funds for payment
   - ✅ Bank balance tracking

3. **processAuctionPayment()**
   - ✅ Winner pays bank full amount
   - ✅ Auctioneer receives money (if not winner)
   - ✅ Auctioneer wins their own auction (special case)
   - ✅ Free auction (0 sale price)
   - ✅ Bank balance updates correctly
   - ✅ Money conservation (total money in system)

### Game State Queries
4. **Utility Functions**
   - ✅ canAfford() - edge cases (exact amount, zero money)
   - ✅ getMaxBid() - returns exact player money
   - ✅ getPlayerMoney() - non-existent player returns 0
   - ✅ getPlayersByMoney() - correct sorting, ties
   - ✅ hasBankruptPlayer() - zero money, negative money
   - ✅ getPlayersWhoCannotAfford() - returns correct subset
   - ✅ getTotalMoney() - sum verification
   - ✅ getMoneyStats() - percentage calculations

### Complex Scenarios
5. **Real Game Scenarios**
   - Multiple payments in sequence
   - Player bankruptcy during auction
   - Chain reactions (A pays B, B pays C)
   - Fractional cent handling (if applicable)

---

## Selling.ts Tests - Bank Sale Mechanics

### Core Selling Functions
1. **sellPlayerPaintingsToBank()**
   - ✅ Single painting sale
   - ✅ Multiple paintings same artist
   - ✅ Paintings of different artists
   - ✅ Zero value paintings (not sold)
   - ✅ No paintings to sell
   - ✅ Player with empty purchases array
   - ✅ Paintings marked as sold correctly
   - ✅ Cards moved to discard pile
   - ✅ Event log updated

2. **sellAllPaintingsToBank()**
   - ✅ All players sell simultaneously
   - ✅ Order doesn't matter (no side effects)
   - ✅ Mixed scenarios (some have paintings, some don't)

3. **Value Calculations**
   - ✅ Value based on artist ranking
   - ✅ Value based on round number
   - ✅ Zero value for unranked artists
   - ✅ Correct value progression (30, 20, 10, etc.)

### Player Queries
4. **getPlayerSellablePaintings()**
   - ✅ Returns only paintings with value > 0
   - ✅ Correct value calculations
   - ✅ Empty purchases array

5. **calculatePlayerSaleEarnings()**
   - ✅ Sum of all sellable values
   - ✅ Zero when no sellable paintings

6. **hasSellablePaintings()**
   - ✅ True when at least one painting has value
   - ✅ False when all paintings have zero value

### Analytics Functions
7. **getAllPlayersSaleEarnings()**
   - ✅ Returns data for all players
   - ✅ Correct earnings calculation
   - ✅ Correct painting count

8. **getTotalPaintingValue()**
   - ✅ Sum of all painting values
   - ✅ Zero when no paintings

9. **getPaintingDistribution()**
   - ✅ Counts by artist
   - ✅ Handles empty collections

10. **getPlayersMostValuableArtist()**
    - ✅ Returns artist with highest total value
    - ✅ Tie-breaking by painting count
    - ✅ Null when no paintings

---

## Endgame.ts Tests - Victory Conditions

### Winner Determination
1. **determineWinner()**
   - ✅ Clear winner (highest money)
   - ✅ Two players tie on money
   - ✅ Three+ players tie on money
   - ✅ Tie-breaker by paintings count
   - ✅ Multiple players tie on money AND paintings
   - ✅ All players bankrupt
   - ✅ Single player game edge case

2. **Score Calculation**
   - ✅ Money only (unsold paintings worthless)
   - ✅ Correct final score calculation
   - ✅ Sorting by score

### Game Statistics
3. **getGameSummary()**
   - ✅ Correct round count
   - ✅ Money distribution
   - ✅ Sale earnings per player
   - ✅ Total painting value
   - ✅ Cards played statistics

4. **getPlayerFinalStats()**
   - ✅ Final money
   - ✅ Paintings owned
   - ✅ Total earned/spent
   - ✅ Auction participation

### Edge Cases
5. **Complex Scenarios**
   - Multiple bankruptcies
   - Comeback victory (low money, many paintings sold)
   - Economic victory strategy
   - Tie-breaking edge cases

---

## Auction Type Tests - Complex Bidding Mechanics

### Open Auction (Simplest)
1. **createOpenAuction()**
   - ✅ Initial state correct
   - ✅ Player order maintained

2. **placeBid()**
   - ✅ Valid bid increments
   - ✅ Bid too low (rejected)
   - ✅ Bid exceeds player money (rejected)
   - ✅ Auctioneer bidding (allowed)
   - ✅ Same player bidding again (allowed)

3. **pass()**
   - ✅ Single player passes
   - ✅ All players pass (auctioneer gets free)
   - ✅ Last bidder wins
   - ✅ Pass count tracking

4. **concludeAuction()**
   - ✅ Winner pays bank
   - ✅ Auctioneer receives money
   - ✅ Card distribution
   - ✅ Free auction handling

### Double Auction (Most Complex)
1. **createDoubleAuction()**
   - ✅ Validates double card
   - ✅ Correct turn order (left of auctioneer)

2. **offerSecondCard()**
   - ✅ Same artist, not double type
   - ✅ Turn order validation
   - ✅ Multiple offers tracking

3. **declineToOffer()**
   - ✅ Pass to next player
   - ✅ All decline (auctioneer gets free)

4. **acceptOffer()**
   - ✅ Accept current offer
   - ✅ New auctioneer gets money
   - ✅ Auction type changes to second card

5. **Complex Scenarios**
   - ✅ Chain of offers
   - ✅ Strategic offering (high value card)
   - ✅ No one wants to offer

### Fixed Price Auction
1. **Price Setting**
   - ✅ Any positive price
   - ✅ Zero price (free)
   - ✅ Negative price (invalid)

2. **Buyer Response**
   - ✅ Multiple buyers want it
   - ✅ No buyers want it
   - ✅ Auctioneer buys own
   - ✅ First come, first served

### Hidden Bid Auction
1. **Bid Collection**
   - ✅ Secret bid submission
   - ✅ All players submit bids
   - ✅ Some players don't bid

2. **Reveal and Winner**
   - ✅ Highest bid wins
   - ✅ Tie-breaking (auctioneer preference?)
   - ✅ All below reserve (no sale)

### One Offer Auction
1. **Offer Making**
   - ✅ Single buyer makes offer
   - ✅ Auctioneer counter-offers
   - ✅ Negotiation limits

2. **Outcomes**
   - ✅ Agreement reached
   - ✅ No agreement
   - ✅ Multiple counter-offers

---

## Test Implementation Strategy

### 1. Setup and Fixtures
- Create reusable player fixtures
- Create reusable game states
- Mock artist rankings for value tests

### 2. Test Data Design
- Realistic money amounts ($30, $60, $90 starting)
- Common auction scenarios
- Edge case values (0, 1, max bids)

### 3. State Mutation Testing
- Verify immutability (functions return new state)
- Check that original state isn't modified
- Validate complete state updates

### 4. Error Handling
- Test all error conditions
- Verify error messages
- Check system state after errors

### 5. Integration Points
- Money → Selling flow
- Auction → Money flow
- Endgame → All modules

---

## Priority Order

1. **money.ts** (Foundation - everything depends on this)
2. **selling.ts** (Uses money and valuation)
3. **endgame.ts** (Uses money and selling)
4. **open auction** (Simplest auction type)
5. **double auction** (Most complex)
6. **remaining auction types** (Similar patterns)

This ensures foundational modules are solid before building complex auction tests.