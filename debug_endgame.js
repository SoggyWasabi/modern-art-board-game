// Create the exact test scenario
const gameState = {
  players: [
    { id: 'p1', money: -10 },
    { id: 'p2', money: -20 },
    { id: 'p3', money: 50 },
    { id: 'p4', money: 30 },
    { id: 'p5', money: 10 }
  ],
  deck: [1, 2, 3],
  round: {
    roundNumber: 3
  }
};

function checkEarlyEndConditions(gameState) {
  console.log('Checking early end conditions...');
  
  // Check if all players are bankrupt
  const allBankrupt = gameState.players.every(player => player.money <= 0);
  console.log('All bankrupt?', allBankrupt);
  
  if (allBankrupt) {
    console.log('Returning: All players bankrupt');
    return { shouldEnd: true, reason: 'All players bankrupt' };
  }

  // Check if only one player has money
  const playersWithMoney = gameState.players.filter(player => player.money > 0);
  console.log('Players with money:', playersWithMoney.length);
  
  if (playersWithMoney.length === 1) {
    console.log('Returning: Single player with money');
    return { shouldEnd: true, reason: `${playersWithMoney[0].name} is the only player with money` };
  }

  // Check if deck is empty and all players are out of cards
  const deckEmpty = gameState.deck.length === 0;
  console.log('Deck empty?', deckEmpty);
  
  if (deckEmpty && gameState.round.roundNumber < 4) {
    console.log('Returning: Deck empty condition');
    return { shouldEnd: true, reason: 'No cards remaining in deck or player hands' };
  }

  console.log('Returning: Game continues');
  return { shouldEnd: false };
}

const result = checkEarlyEndConditions(gameState);
console.log('Final result:', result);
