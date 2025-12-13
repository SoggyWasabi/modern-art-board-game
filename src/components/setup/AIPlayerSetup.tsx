import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../primitives'
import { useGameStore } from '../../store/gameStore'
import { Brain, Zap, Shield, Trophy, ChevronRight } from 'lucide-react'

interface AIProfile {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard'
  avatar: string
  description: string
  playStyle: string
  color: string
}

const aiProfiles: Record<'easy' | 'medium' | 'hard', Omit<AIProfile, 'difficulty' | 'color'>[]> = {
  easy: [
    {
      id: 'casual_collector',
      name: 'Casual Collector',
      avatar: '🎨',
      description: 'Enjoys art but plays for fun',
      playStyle: 'Makes occasional bids, prefers affordable pieces'
    },
    {
      id: 'enthusiast',
      name: 'Art Enthusiast',
      avatar: '🖼️',
      description: 'Loves the game but not very competitive',
      playStyle: 'Bids on what they like, doesn\'t track values closely'
    }
  ],
  medium: [
    {
      id: 'strategist',
      name: 'The Strategist',
      avatar: '♟️',
      description: 'Thinks about the market and values',
      playStyle: 'Balances immediate value with long-term strategy'
    },
    {
      id: 'opportunist',
      name: 'The Opportunist',
      avatar: '💰',
      description: 'Looks for good deals and undervalued art',
      playStyle: 'Waits for bargains, knows when to push prices'
    }
  ],
  hard: [
    {
      id: 'master_curator',
      name: 'Master Curator',
      avatar: '👑',
      description: 'Expert who plays to win',
      playStyle: 'Calculates odds, manipulates markets, plays perfectly'
    },
    {
      id: 'market_maker',
      name: 'Market Maker',
      avatar: '📈',
      description: 'Controls the auction flow',
      playStyle: 'Psychological warfare, expert at all auction types'
    }
  ]
}

const difficultyInfo = {
  easy: {
    color: 'from-green-500 to-emerald-600',
    icon: <Zap className="w-5 h-5" />,
    title: 'Easy',
    description: 'Great for learning the game'
  },
  medium: {
    color: 'from-yellow-500 to-orange-600',
    icon: <Brain className="w-5 h-5" />,
    title: 'Medium',
    description: 'A decent challenge'
  },
  hard: {
    color: 'from-red-500 to-rose-600',
    icon: <Shield className="w-5 h-5" />,
    title: 'Hard',
    description: 'For expert players'
  }
}

export const AIPlayerSetup: React.FC<{
  playerCount: 3 | 4 | 5
  onStartGame: () => void
  onBack: () => void
}> = ({ playerCount, onStartGame, onBack }) => {
  const { setupState, updatePlayerSlot, startGameFromSetup } = useGameStore()
  const [aiPlayers, setAiPlayers] = useState<(AIProfile & { difficulty: 'easy' | 'medium' | 'hard' })[]>(
    Array.from({ length: playerCount - 1 }, (_, i) => ({
      ...aiProfiles.medium[i % aiProfiles.medium.length],
      difficulty: 'medium' as const,
      color: `hsl(${(i * 60) % 360}, 70%, 60%)`
    }))
  )

  const handleDifficultyChange = (playerIndex: number, difficulty: 'easy' | 'medium' | 'hard') => {
    const currentProfile = aiPlayers[playerIndex]
    const profileList = aiProfiles[difficulty]
    const newProfile = profileList[Math.floor(Math.random() * profileList.length)]

    const newAiPlayers = [...aiPlayers]
    newAiPlayers[playerIndex] = {
      ...newProfile,
      difficulty,
      color: currentProfile.color
    }
    setAiPlayers(newAiPlayers)

    // Update store
    updatePlayerSlot(playerIndex + 1, {
      type: 'ai',
      aiDifficulty: difficulty,
      color: currentProfile.color,
      humanName: undefined
    })
  }

  const handleRandomizeAll = () => {
    const newAiPlayers = aiPlayers.map((player, index) => {
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
      const profileList = aiProfiles[difficulty]
      const profile = profileList[Math.floor(Math.random() * profileList.length)]

      return {
        ...profile,
        difficulty,
        color: player.color
      }
    })
    setAiPlayers(newAiPlayers)

    // Update store
    newAiPlayers.forEach((player, index) => {
      updatePlayerSlot(index + 1, {
        type: 'ai',
        aiDifficulty: player.difficulty,
        color: player.color,
        humanName: undefined
      })
    })
  }

  const handleStartGame = () => {
    startGameFromSetup()
    onStartGame()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0L80 40L40 80Z' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-6xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Configure AI Players
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Choose the difficulty and personalities for your AI opponents
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="ghost"
              onClick={handleRandomizeAll}
              className="bg-white/10 hover:bg-white/20"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Randomize All
            </Button>
          </div>
        </motion.div>

        {/* Players Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Human Player Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1 rounded-2xl"
          >
            <div className="h-full bg-slate-900 rounded-xl p-6 flex flex-col">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-white">You</h3>
                  <p className="text-gray-400">Human Player</p>
                </div>
              </div>
              <div className="text-center text-gray-500 text-sm">
                Ready to play!
              </div>
            </div>
          </motion.div>

          {/* AI Players */}
          {aiPlayers.map((aiPlayer, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="group"
            >
              <div className={`h-full bg-gradient-to-br ${difficultyInfo[aiPlayer.difficulty].color} p-1 rounded-2xl transform transition-all duration-300 group-hover:scale-105`}>
                <div className="h-full bg-slate-900 rounded-xl p-6 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: aiPlayer.color + '40', border: `2px solid ${aiPlayer.color}` }}
                      >
                        {aiPlayer.avatar}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-white">{aiPlayer.name}</h3>
                        <p className="text-gray-400">{aiPlayer.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="flex items-center mb-4">
                    {difficultyInfo[aiPlayer.difficulty].icon}
                    <span className="ml-2 text-sm font-semibold text-gray-300">
                      {difficultyInfo[aiPlayer.difficulty].title}
                    </span>
                  </div>

                  {/* Play Style */}
                  <p className="text-sm text-gray-500 mb-6 flex-grow">
                    {aiPlayer.playStyle}
                  </p>

                  {/* Difficulty Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => handleDifficultyChange(index, diff)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          aiPlayer.difficulty === diff
                            ? `bg-gradient-to-r ${difficultyInfo[diff].color} text-white`
                            : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-4"
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={handleStartGame}
            className="text-lg px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            Start Game
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center text-gray-500 text-sm max-w-3xl mx-auto"
        >
          <p className="mb-2">
            <span className="font-semibold">Tip:</span> Mix difficulties for a more varied experience!
          </p>
          <p>
            Easy AI makes mistakes, Medium plays a solid game, and Hard will challenge even experienced players.
          </p>
        </motion.div>
      </div>
    </div>
  )
}