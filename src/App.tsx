import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useGameStore } from './store/gameStore'
import MainGameplay from './components/game/MainGameplay'
import { ErrorBoundary } from './components/game/ErrorBoundary'
import { RulesPage } from './components/rules/RulesPage'
import { LandingPage, ColorBarNav } from './pages/LandingPage'
import { PlayerCountSelection } from './pages/PlayerCountSelection'
import { GalleryPage } from './pages/GalleryPage'
import { FloatingCardsBackground } from './components/background/FloatingCardsBackground'

// ============================================================================
// PAGE WRAPPERS
// ============================================================================

function LandingPageWrapper() {
  const navigate = useNavigate()

  return (
    <>
      <ColorBarNav onNavigate={(item) => {
        if (item === 'rules') navigate('/rules')
        if (item === 'gallery') navigate('/gallery')
      }} />
      <LandingPage onPlay={() => navigate('/player-count')} />
    </>
  )
}

function PlayerCountSelectionWrapper() {
  const navigate = useNavigate()
  const { startGameFromSetup, setPlayerCount: storeSetPlayerCount } = useGameStore()

  const handlePlayerCountSelect = (count: number, playerStarts: boolean = false, debugMode: boolean = false) => {
    storeSetPlayerCount(count as 3 | 4 | 5)

    if (debugMode) {
      console.log('[handlePlayerCountSelect] Loading debug mode scenario')
      useGameStore.getState().loadDebugScenario(count as 3 | 4 | 5)
    } else {
      startGameFromSetup()

      const { gameState } = useGameStore.getState()
      if (gameState) {
        if (playerStarts) {
          console.log('[handlePlayerCountSelect] Human selected to go first')
          useGameStore.getState().setFirstPlayerIndex(0)
        } else {
          const randomIndex = Math.floor(Math.random() * count)
          console.log('[handlePlayerCountSelect] Randomly selected first player:', randomIndex, 'Player:', gameState.players[randomIndex]?.name)
          useGameStore.getState().setFirstPlayerIndex(randomIndex)
        }
      }
    }

    navigate('/game')
  }

  return (
    <>
      <ColorBarNav onNavigate={(item) => {
        if (item === 'rules') navigate('/rules')
        if (item === 'gallery') navigate('/gallery')
      }} />
      <PlayerCountSelection
        onSelect={handlePlayerCountSelect}
        onBack={() => navigate('/')}
      />
    </>
  )
}

function RulesPageWrapper() {
  const navigate = useNavigate()
  return (
    <>
      <RulesPage onBack={() => navigate('/')} />
    </>
  )
}

function GalleryPageWrapper() {
  const navigate = useNavigate()
  return (
    <>
      <ColorBarNav onNavigate={(item) => {
        if (item === 'rules') navigate('/rules')
        if (item === 'gallery') navigate('/gallery')
      }} />
      <GalleryPage onBack={() => navigate('/')} />
    </>
  )
}

function GamePageWrapper() {
  const navigate = useNavigate()
  const { resetGame, gameState } = useGameStore()

  const handleReturnToMenu = () => {
    navigate('/')
  }

  if (!gameState) {
    return <Navigate to="/player-count" replace />
  }

  return (
    <ErrorBoundary>
      <MainGameplay onExitToMenu={handleReturnToMenu} />
    </ErrorBoundary>
  )
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  return (
    <>
      {/* Persistent background across all routes */}
      <FloatingCardsBackground />

      {/* Route content */}
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/player-count" element={<PlayerCountSelectionWrapper />} />
        <Route path="/rules" element={<RulesPageWrapper />} />
        <Route path="/gallery" element={<GalleryPageWrapper />} />
        <Route path="/game" element={<GamePageWrapper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
