import React from 'react'
import { motion } from 'framer-motion'
import { PaintingCard } from './PaintingCard'
import { useGameStore, useCurrentPlayer } from '../../store/gameStore'
import { Brush, Users, TrendingUp } from 'lucide-react'

const GameTable: React.FC = () => {
  const { gameState, isGameStarted } = useGameStore()
  const currentPlayer = useCurrentPlayer()

  if (!gameState || !isGameStarted) {
    return null
  }

  const roundNumber = gameState.round.roundNumber
  const currentPhase = gameState.round.phase

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-8">
      {/* Table Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-green-800/20 to-green-900/40"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0L100 50L50 100L0 50Z' fill='%23000000' fill-opacity='0.05'/%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Top Bar - Game Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/30 backdrop-blur-md rounded-2xl p-4 mb-6"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="text-white">
                <span className="text-sm opacity-75">Round</span>
                <div className="text-2xl font-bold">{roundNumber}/4</div>
              </div>
              <div className="text-white">
                <span className="text-sm opacity-75">Phase</span>
                <div className="text-lg font-semibold capitalize">
                  {currentPhase.type.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Users className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Game Area */}
        <div className="grid grid-cols-12 gap-6" style={{ minHeight: '600px' }}>
          {/* Left Side - Artist Board */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-3"
          >
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 h-full">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Brush className="w-5 h-5 mr-2" />
                Artist Values
              </h3>

              {/* Artist Value Trackers */}
              <div className="space-y-4">
                {['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira'].map((artist, index) => (
                  <div key={artist} className="bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-sm font-medium">{artist.split(' ')[0]}</span>
                      <span className="text-yellow-400 font-bold">$0k</span>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-8 flex-1 bg-white/10 rounded flex items-center justify-center text-xs text-gray-400"
                        >
                          R{i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Center - Auction Area */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-6"
          >
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-8 h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Auction Area</h2>
                <p className="text-gray-300">Cards being auctioned will appear here</p>
              </div>

              {/* Current Auction Card Placeholder */}
              <div className="w-48 h-64 bg-white/10 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-white/60">Waiting for auction...</p>
                </div>
              </div>

              {/* Auction Controls */}
              <div className="mt-8 flex space-x-4">
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                  Start Auction
                </button>
                <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors">
                  Pass
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Player Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-3"
          >
            <div className="space-y-4">
              {gameState.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`bg-black/20 backdrop-blur-md rounded-2xl p-4 border-2 transition-all ${
                    index === 0 ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-semibold">{player.name}</h4>
                    <span className="text-yellow-400 font-bold">${player.money}k</span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-300 mb-3">
                    <span>Hand: {player.hand.length} cards</span>
                    <span>Purchased: {player.purchasedThisRound.length}</span>
                  </div>

                  {/* Mini hand display for current player */}
                  {index === 0 && player.hand.length > 0 && (
                    <div className="flex space-x-1 overflow-x-auto pb-2">
                      {player.hand.slice(0, 5).map((card) => (
                        <div
                          key={card.id}
                          className="flex-shrink-0 w-12 h-16 bg-white/10 rounded border border-white/20"
                        >
                          <PaintingCard
                            card={card}
                            size="sm"
                            showAuctionType={false}
                            interactive={false}
                          />
                        </div>
                      ))}
                      {player.hand.length > 5 && (
                        <div className="flex-shrink-0 w-12 h-16 bg-white/10 rounded border border-white/20 flex items-center justify-center text-white text-xs">
                          +{player.hand.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  {player.isAI && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                        AI ({player.aiDifficulty})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom - Player Hand (Current Player) */}
        {currentPlayer && currentPlayer.hand.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-black/30 backdrop-blur-md rounded-2xl p-6"
          >
            <h3 className="text-white font-semibold mb-4">Your Hand</h3>
            <div className="flex justify-center space-x-4 overflow-x-auto">
              {currentPlayer.hand.map((card, index) => (
                <div
                  key={card.id}
                  className="transform transition-all hover:scale-110 hover:-translate-y-2"
                  style={{
                    transform: `rotate(${(index - currentPlayer.hand.length / 2) * 3}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <PaintingCard
                    card={card}
                    size="md"
                    showAuctionType={true}
                    interactive={true}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default GameTable