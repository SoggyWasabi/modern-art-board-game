import { createDeck } from './src/engine/deck.js'

const deck = createDeck()
const totals = {}

deck.forEach(card => {
  totals[card.auctionType] = (totals[card.auctionType] || 0) + 1
})

console.log('Auction Type Totals:')
console.log(JSON.stringify(totals, null, 2))
console.log('\nTotal cards:', deck.length)