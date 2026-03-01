import { useState, useEffect, useRef } from 'react'
import './PlayerCard.css'

const STARTING_LIFE = 40

export default function PlayerCard({ playerNumber, onEliminate, eliminated }) {
  const [life, setLife] = useState(STARTING_LIFE)
  const [delta, setDelta] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function changeLife(amount) {
    setLife(prev => prev + amount)
    setDelta(prev => (prev ?? 0) + amount)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setDelta(null), 1500)
  }

  function resetLife() {
    setLife(STARTING_LIFE)
    setDelta(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  return (
    <div className={`player-card${eliminated ? ' eliminated' : ''}`}>
      <div className="player-header">
        <span className="player-name">Player {playerNumber}</span>
        <button className="reset-btn" onClick={resetLife} title="Reset life">↺</button>
      </div>

      <div className="life-display">
        <span className="life-total">{life}</span>
        {delta !== null && (
          <span className={`delta ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>

      <div className="life-controls">
        <div className="btn-group">
          <button className="life-btn minus" onClick={() => changeLife(-5)}>-5</button>
          <button className="life-btn minus" onClick={() => changeLife(-1)}>-1</button>
        </div>
        <div className="btn-group">
          <button className="life-btn plus" onClick={() => changeLife(1)}>+1</button>
          <button className="life-btn plus" onClick={() => changeLife(5)}>+5</button>
        </div>
      </div>

      <button
        className={`eliminate-btn${eliminated ? ' active' : ''}`}
        onClick={() => onEliminate(playerNumber)}
      >
        {eliminated ? 'Revive' : 'Eliminate'}
      </button>
    </div>
  )
}
