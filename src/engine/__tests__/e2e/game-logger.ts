import type { GameState, GameEvent, Player, Card, Painting, Artist } from '../../types/game'
import { ARTISTS } from '../constants'

/**
 * Game Logger for E2E Testing
 *
 * Provides detailed, human-readable logs of all game actions.
 * Useful for debugging and verifying game flow.
 */
export class GameLogger {
  private logs: string[] = []
  private startTime: Date = new Date()

  /**
   * Log a game event with timestamp
   */
  log(message: string, data?: any): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const logEntry = data ? `[${timestamp}] ${message}\n  ${JSON.stringify(data, null, 2)}` : `[${timestamp}] ${message}`
    this.logs.push(logEntry)
    console.log(logEntry)
  }

  /**
   * Log game start
   */
  logGameStart(gameState: GameState): void {
    this.log('=== GAME START ===', {
      playerCount: gameState.players.length,
      startingMoney: gameState.players.map(p => `${p.name}: $${p.money}`),
      roundNumber: gameState.round.roundNumber
    })
  }

  /**
   * Log round start
   */
  logRoundStart(roundNumber: number): void {
    this.log(`\n=== ROUND ${roundNumber} ===`)
    this.log('Current Artist Values:')
    ARTISTS.forEach(artist => {
      this.log(`  ${artist}: $0 (not yet ranked)`)
    })
  }

  /**
   * Log card play
   */
  logCardPlay(player: Player, card: Card): void {
    this.log(`\nTurn: ${player.name} plays ${card.artist} (${card.auctionType} auction)`, {
      cardId: card.id,
      artworkId: card.artworkId
    })
  }

  /**
   * Log auction start
   */
  logAuctionStart(auctionType: string, card: Card, auctioneer: Player, startPrice: number): void {
    this.log(`\n  Auction Phase (${auctionType}):`, {
      painting: `${card.artist} - ${card.artworkId}`,
      auctioneer: auctioneer.name,
      startingBid: `$${startPrice}`
    })
  }

  /**
   * Log auction bid
   */
  logAuctionBid(player: Player, amount: number, currentBid: number): void {
    if (amount > currentBid) {
      this.log(`    ${player.name} bids: $${amount} ✅`)
    } else {
      this.log(`    ${player.name} passes`)
    }
  }

  /**
   * Log auction result
   */
  logAuctionResult(winner: Player, amount: number, auctioneer: Player): void {
    this.log(`  Auction Result:`, {
      winner: winner.name,
      winningBid: `$${amount}`,
      auctioneer: auctioneer.name,
      moneyFlow: `${winner.name} → ${auctioneer.name} ($${amount})`
    })

    if (winner.id === auctioneer.id) {
      this.log(`    (Auctioneer won own auction - money goes to bank)`)
    }
  }

  /**
   * Log sealed bid auction
   */
  logSealedBidBids(bids: Array<{ player: Player; bid: number }>): void {
    this.log('  Sealed Bids Revealed:')
    bids.forEach(({ player, bid }) => {
      this.log(`    ${player.name}: $${bid}`)
    })
  }

  /**
   * Log money status after auction
   */
  logMoneyStatus(gameState: GameState): void {
    this.log('\n  Money Status:')
    gameState.players.forEach(player => {
      this.log(`    ${player.name}: $${player.money}`)
    })
  }

  /**
   * Log player purchases
   */
  logPlayerPurchases(player: Player): void {
    if (player.purchases && player.purchases.length > 0) {
      this.log(`\n  ${player.name}'s Collection:`)
      player.purchases.forEach(painting => {
        this.log(`    ${painting.artist} - bought for $${painting.purchasePrice}`)
      })
    }
  }

  /**
   * Log round end with artist rankings
   */
  logRoundEnd(gameState: GameState): void {
    this.log(`\n=== END OF ROUND ${gameState.round.roundNumber} ===`)

    if (gameState.round.phase.type === 'selling_to_bank') {
      this.log('Artist Rankings:')
      gameState.round.phase.results
        .filter(r => r.value > 0)
        .forEach((result, index) => {
          const ordinal = this.getOrdinal(index + 1)
          this.log(`  ${ordinal}. ${result.artist}: ${result.cardsPlayed} cards → $${result.value} each`)
        })

      this.log('\nBank Sales:')
      gameState.players.forEach(player => {
        const sellablePaintings = this.getSellablePaintings(gameState, player.id)
        if (sellablePaintings.length > 0) {
          const totalValue = sellablePaintings.reduce((sum, sp) => sum + sp.value, 0)
          this.log(`  ${player.name} sells ${sellablePaintings.length} paintings → $${totalValue}`)
          sellablePaintings.forEach(({ painting, value }) => {
            this.log(`    ${painting.artist} → $${value}`)
          })
        }
      })
    }
  }

  /**
   * Log final game results
   */
  logGameEnd(gameState: GameState): void {
    this.log(`\n=== GAME OVER ===`)

    // Sort players by money
    const sortedPlayers = [...gameState.players].sort((a, b) => b.money - a.money)

    this.log('Final Results:')
    sortedPlayers.forEach((player, index) => {
      const ordinal = this.getOrdinal(index + 1)
      this.log(`  ${ordinal}. ${player.name}: $${player.money}`)
    })

    if (gameState.winner) {
      this.log(`\n🏆 Winner: ${gameState.winner.name} with $${gameState.winner.money}!`)
    } else {
      this.log('\n🤝 Game ended in a tie!')
    }

    const duration = new Date().getTime() - this.startTime.getTime()
    this.log(`\nGame completed in ${(duration / 1000).toFixed(1)} seconds`)
  }

  /**
   * Log error
   */
  logError(message: string, error?: any): void {
    this.log(`❌ ERROR: ${message}`, error)
  }

  /**
   * Log validation check
   */
  logValidation(check: string, passed: boolean, details?: any): void {
    const status = passed ? '✅' : '❌'
    this.log(`${status} ${check}`, details)
  }

  /**
   * Get all logs
   */
  getLogs(): string[] {
    return [...this.logs]
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = []
    this.startTime = new Date()
  }

  /**
   * Save logs to file (for debugging)
   */
  saveLogs(filename: string): void {
    const fs = require('fs')
    fs.writeFileSync(filename, this.logs.join('\n\n'))
  }

  // Helper methods
  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  private getSellablePaintings(gameState: GameState, playerId: string): Array<{ painting: Painting; value: number }> {
    const player = gameState.players.find(p => p.id === playerId)
    if (!player || !player.purchases) return []

    return player.purchases
      .map(painting => {
        // Calculate value based on round results
        const artistResult = gameState.round.phase.type === 'selling_to_bank'
          ? gameState.round.phase.results.find(r => r.artist === painting.artist)
          : null

        const value = artistResult?.value || 0
        return { painting, value }
      })
      .filter(item => item.value > 0)
  }
}

/**
 * Singleton logger instance for tests
 */
export const logger = new GameLogger()