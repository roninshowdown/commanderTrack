import { useState } from 'react'
import PlayerCard from './PlayerCard'
import './App.css'

const PLAYER_OPTIONS = [2, 3, 4, 5]

export default function App() {
  const [playerCount, setPlayerCount] = useState(4)
  const [eliminated, setEliminated] = useState({})
  const [gameKey, setGameKey] = useState(0)

  function toggleEliminated(playerNumber) {
    setEliminated(prev => ({
      ...prev,
      [playerNumber]: !prev[playerNumber],
    }))
  }

  function resetGame() {
    setEliminated({})
    setGameKey(k => k + 1)
  }

  function changePlayerCount(count) {
    setPlayerCount(count)
    setEliminated({})
    setGameKey(k => k + 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚔️ Commander Track</h1>
        <div className="controls">
          <div className="player-select">
            <span className="control-label">Players</span>
            {PLAYER_OPTIONS.map(n => (
              <button
                key={n}
                className={`select-btn${playerCount === n ? ' active' : ''}`}
                onClick={() => changePlayerCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="reset-all-btn" onClick={resetGame}>Reset All</button>
        </div>
      </header>

      <main className={`player-grid players-${playerCount}`}>
        {Array.from({ length: playerCount }, (_, i) => (
          <PlayerCard
            key={`${gameKey}-player-${i + 1}`}
            playerNumber={i + 1}
            eliminated={!!eliminated[i + 1]}
            onEliminate={toggleEliminated}
          />
        ))}
      </main>
    </div>
  )
}

