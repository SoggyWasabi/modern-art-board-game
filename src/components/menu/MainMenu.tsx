import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../primitives'
import { Brush, Users, Trophy, Settings, Info } from 'lucide-react'

const MenuItem: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  delay: number
}> = ({ icon, title, description, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Button
      variant="ghost"
      onClick={onClick}
      className="w-full h-auto p-6 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300"
    >
      <div className="flex items-center space-x-4 text-left">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-200">{description}</p>
        </div>
      </div>
    </Button>
  </motion.div>
)

export const MainMenu: React.FC<{
  onStartLocalGame: () => void
  onBackToMenu: () => void
}> = ({ onStartLocalGame }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3Ccircle cx='53' cy='7' r='7'/%3E%3Ccircle cx='30' cy='30' r='7'/%3E%3Ccircle cx='7' cy='53' r='7'/%3E%3Ccircle cx='53' cy='53' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-block mb-6"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            <div className="w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
              <Brush className="w-12 h-12 text-purple-900" />
            </div>
          </motion.div>

          <h1 className="text-7xl font-bold text-white mb-4 tracking-tight">
            Modern Art
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            The prestigious auction game where art meets strategy. Buy, sell, and outbid your rivals to build the most valuable collection.
          </p>
        </motion.div>

        {/* Menu Items */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <MenuItem
            icon={<Users className="w-6 h-6 text-white" />}
            title="Local Game"
            description="Play against AI opponents on your device"
            onClick={onStartLocalGame}
            delay={0.2}
          />

          <MenuItem
            icon={<Trophy className="w-6 h-6 text-white" />}
            title="Online Multiplayer"
            description="Challenge players from around the world"
            onClick={() => {}}
            delay={0.3}
          />

          <MenuItem
            icon={<Settings className="w-6 h-6 text-white" />}
            title="Settings"
            description="Customize your game experience"
            onClick={() => {}}
            delay={0.4}
          />

          <MenuItem
            icon={<Info className="w-6 h-6 text-white" />}
            title="How to Play"
            description="Learn the rules of Modern Art"
            onClick={() => {}}
            delay={0.5}
          />
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-16 text-gray-300"
        >
          <p className="text-sm">
            Based on the award-winning game by Reiner Knizia
          </p>
        </motion.div>
      </div>
    </div>
  )
}