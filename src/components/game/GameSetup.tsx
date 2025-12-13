import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../primitives'

export const GameSetup: React.FC<{
  onBack: () => void
}> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-8">Game Setup</h1>
        <p className="text-xl text-gray-300 mb-8">
          This component has been replaced with AI Player Setup
        </p>
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
      </motion.div>
    </div>
  )
}