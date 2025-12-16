import React from 'react'
import type { TurnIndicator } from '../../integration/gameIntegration'

interface AIThinkingIndicatorProps {
  turnIndicator: TurnIndicator | null
  className?: string
}

/**
 * Component to display AI thinking state with visual feedback
 */
const AIThinkingIndicator: React.FC<AIThinkingIndicatorProps> = ({
  turnIndicator,
  className = ''
}) => {
  if (!turnIndicator || turnIndicator.type !== 'ai_thinking') {
    return null
  }

  return (
    <div
      className={`ai-thinking-indicator ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '20px',
        animation: 'pulse-subtle 2s ease-in-out infinite',
      }}
    >
      {/* Animated thinking dots */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'thinking-dot-1 1.4s ease-in-out infinite',
          }}
        />
        <span
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'thinking-dot-2 1.4s ease-in-out infinite 0.2s',
          }}
        />
        <span
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'thinking-dot-3 1.4s ease-in-out infinite 0.4s',
          }}
        />
      </div>

      {/* Thinking text */}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#f59e0b',
        }}
      >
        AI is thinking...
      </span>
    </div>
  )
}

export default AIThinkingIndicator