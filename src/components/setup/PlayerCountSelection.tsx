import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../primitives'
import { Users, Zap, Trophy } from 'lucide-react'

interface PlayerCountOption {
  count: 3 | 4 | 5
  title: string
  description: string
  icon: React.ReactNode
  difficulty: 'Easy' | 'Balanced' | 'Challenging'
  bgColor: string
  borderColor: string
}

export const PlayerCountSelection: React.FC<{
  onSelect: (count: 3 | 4 | 5) => void
  onBack: () => void
}> = ({ onSelect, onBack }) => {
  const playerOptions: PlayerCountOption[] = [
    {
      count: 3,
      title: "Intimate Gallery",
      description: "A tight competition between 3 players. More cards, more strategy.",
      icon: <Zap className="w-8 h-8" />,
      difficulty: 'Easy',
      bgColor: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-400'
    },
    {
      count: 4,
      title: "Classic Exhibition",
      description: "The original 4-player experience. Perfect balance of strategy and speed.",
      icon: <Trophy className="w-8 h-8" />,
      difficulty: 'Balanced',
      bgColor: 'from-purple-500 to-indigo-600',
      borderColor: 'border-purple-400'
    },
    {
      count: 5,
      title: "Grand Auction",
      description: "A bustling 5-player market. Fast-paced and unpredictable.",
      icon: <Users className="w-8 h-8" />,
      difficulty: 'Challenging',
      bgColor: 'from-orange-500 to-red-600',
      borderColor: 'border-orange-400'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 50L100 0V100H0L50 50z' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E")`
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
            Choose Your Exhibition
          </h1>
          <p className="text-xl text-gray-300">
            Select the number of AI curators to compete against
          </p>
        </motion.div>

        {/* Player Count Options */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {playerOptions.map((option, index) => (
            <motion.div
              key={option.count}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="group cursor-pointer"
              onClick={() => onSelect(option.count)}
            >
              <div className={`h-full bg-gradient-to-br ${option.bgColor} p-1 rounded-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl`}>
                <div className="h-full bg-slate-900 rounded-xl p-8 flex flex-col">
                  {/* Icon and Badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 bg-gradient-to-br ${option.bgColor} rounded-xl ${option.borderColor} border-2`}>
                      {option.icon}
                    </div>
                    <span className={`px-3 py-1 bg-slate-800 ${option.borderColor} border rounded-full text-xs font-semibold`}>
                      {option.difficulty}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {option.title}
                  </h3>

                  <p className="text-gray-400 mb-6 flex-grow">
                    {option.description}
                  </p>

                  {/* Player Count Display */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex space-x-1">
                      {Array.from({ length: option.count }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${option.bgColor} flex items-center justify-center text-white text-sm font-bold border-2 ${option.borderColor}`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(option.count)
                    }}
                  >
                    Select {option.count} Players
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Main Menu
          </Button>
        </motion.div>

        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center text-gray-500 text-sm max-w-3xl mx-auto"
        >
          <p>
            All players will be AI-controlled with varying difficulties.
            You'll be able to customize AI personalities and skill levels in the next step.
          </p>
        </motion.div>
      </div>
    </div>
  )
}