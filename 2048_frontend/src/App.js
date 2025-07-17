import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Nord color palette
const NORD = {
  primary: "#5E81AC",
  accent: "#A3BE8C",
  secondary: "#4C566A",
  background: "#ECEFF4",
  tile: "#E5E9F0",
  tileEmpty: "#D8DEE9",
  tileText: "#2E3440",
  scoreBg: "#D8DEE9",
  scoreText: "#4C566A",
  btn: "#5E81AC",
  btnText: "#ECEFF4",
  gridBorder: "#B0BEC9",
  header: "#2E3440",
};

const GRID_SIZE = 4;
const START_TILES = 2;
const LOCALSTORAGE_HIGHSCORE_KEY = "nord_2048_high_score";
const LOCALSTORAGE_GRID_KEY = "nord_2048_grid";
const LOCALSTORAGE_SCORE_KEY = "nord_2048_score";
const LOCALSTORAGE_MOVES_KEY = "nord_2048_moves";

function getInitialGrid() {
  const emptyGrid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(0)
  );
  let placed = 0;
  while (placed < START_TILES) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (emptyGrid[x][y] === 0) {
      emptyGrid[x][y] = Math.random() < 0.9 ? 2 : 4;
      placed++;
    }
  }
  return emptyGrid;
}

function deepCopyGrid(grid) {
  return grid.map((row) => [...row]);
}

// Returns true if any moves are possible on grid
function canMove(grid) {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === 0) return true;
      if (
        (i < GRID_SIZE - 1 && grid[i][j] === grid[i + 1][j]) ||
        (j < GRID_SIZE - 1 && grid[i][j] === grid[i][j + 1])
      )
        return true;
    }
  }
  return false;
}

function getRandomEmptyCell(grid) {
  const empties = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) if (grid[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function addRandomTile(grid) {
  const cell = getRandomEmptyCell(grid);
  if (!cell) return grid;
  const [r, c] = cell;
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return grid;
}

function moveLeft(grid) {
  let newGrid = grid.map((row) => [...row]);
  let score = 0;
  let moved = false;
  for (let i = 0; i < GRID_SIZE; i++) {
    let row = newGrid[i].filter((v) => v);
    for (let j = 0; j < row.length - 1; j++) {
      if (row[j] === row[j + 1]) {
        row[j] *= 2;
        score += row[j];
        row[j + 1] = 0;
        moved = true;
      }
    }
    row = row.filter((v) => v);
    while (row.length < GRID_SIZE) row.push(0);
    for (let j = 0; j < GRID_SIZE; j++) {
      if (newGrid[i][j] !== row[j]) {
        moved = true;
        newGrid[i][j] = row[j];
      }
    }
  }
  return { grid: newGrid, score, moved };
}

function moveRight(grid) {
  let reversed = grid.map((row) => [...row].reverse());
  let res = moveLeft(reversed);
  let newGrid = res.grid.map((row) => row.reverse());
  return { grid: newGrid, score: res.score, moved: res.moved };
}

function moveUp(grid) {
  let newGrid = deepCopyGrid(grid);
  let moved = false;
  let score = 0;
  for (let col = 0; col < GRID_SIZE; col++) {
    let column = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      if (newGrid[row][col] !== 0) column.push(newGrid[row][col]);
    }
    for (let k = 0; k < column.length - 1; k++) {
      if (column[k] === column[k + 1]) {
        column[k] *= 2;
        score += column[k];
        column[k + 1] = 0;
        moved = true;
      }
    }
    column = column.filter((v) => v);
    while (column.length < GRID_SIZE) column.push(0);
    for (let row = 0; row < GRID_SIZE; row++) {
      if (newGrid[row][col] !== column[row]) moved = true;
      newGrid[row][col] = column[row];
    }
  }
  return { grid: newGrid, score, moved };
}

function moveDown(grid) {
  let reversed = [];
  for (let col = 0; col < GRID_SIZE; col++) {
    let column = [];
    for (let row = 0; row < GRID_SIZE; row++) column.push(grid[row][col]);
    column.reverse();
    reversed.push(column);
  }
  // Transpose
  let transposed = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let i = 0; i < GRID_SIZE; i++)
    for (let j = 0; j < GRID_SIZE; j++) transposed[i][j] = reversed[j][i];
  let res = moveLeft(transposed);
  // Un-reverse
  let unReversed = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let i = 0; i < GRID_SIZE; i++)
    for (let j = 0; j < GRID_SIZE; j++) unReversed[j][i] = res.grid[i][GRID_SIZE - 1 - j];
  return { grid: unReversed, score: res.score, moved: res.moved };
}

function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef();
  useEffect(() => { savedHandler.current = handler; }, [handler]);
  useEffect(() => {
    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}

/** NordTile: A tile for a single cell. */
function NordTile({ value }) {
  let style = {
    background: value > 0 ? NORD.tile : NORD.tileEmpty,
    color: value > 4 ? "#ECEFF4" : NORD.tileText,
    fontWeight: "800",
    fontSize: value < 1024 ? "2rem" : "1.4rem",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60px",
    margin: "3px",
    boxShadow: value ? "0 2px 5px rgba(94,129,172,0.07)" : "none",
    transition: "background 0.1s, color 0.1s",
    userSelect: "none",
    letterSpacing: "0.03em",
  };
  if (value === 2) style.background = "#E0E3F3";
  else if (value === 4) style.background = "#D3DADF";
  else if (value === 8) style.background = NORD.primary;
  else if (value === 16) style.background = "#81A1C1";
  else if (value === 32) style.background = NORD.accent;
  else if (value === 64) style.background = "#B48EAD";
  else if (value === 128) style.background = "#A3BE8C";
  else if (value === 256) style.background = "#88C0D0";
  else if (value === 512) style.background = "#EBCB8B";
  else if (value === 1024) style.background = "#A3A3BE";
  else if (value === 2048) style.background = "#FFD700";
  else if (value > 2048) style.background = "#FFB830";

  return (
    <div style={style} className="nord-tile" data-testid="tile">
      {value > 0 ? value : ""}
    </div>
  );
}
// PUBLIC_INTERFACE
function GameBoard({ grid }) {
  return (
    <div
      style={{
        background: NORD.gridBorder,
        display: "inline-block",
        borderRadius: "12px",
        padding: "13px 13px 17px 13px",
        boxShadow: "0 6px 28px -5px rgba(76,86,106,0.08)",
      }}
      className="game-board"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 66px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 66px)`,
          gap: "0 0",
        }}
      >
        {grid.map((row, i) =>
          row.map((val, j) => <NordTile value={val} key={`${i}-${j}`} />)
        )}
      </div>
    </div>
  );
}
/** ScorePanel - displays current score, high score, moves */
function ScorePanel({ score, highScore, moves }) {
  return (
    <div
      className="score-panel"
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "1.2rem",
        gap: "14px",
      }}
    >
      <div className="score-block" style={scoreBlockStyle}>
        Score
        <div style={scoreValStyle}>{score}</div>
      </div>
      <div className="score-block" style={scoreBlockStyle}>
        High
        <div style={scoreValStyle}>{highScore}</div>
      </div>
      <div className="score-block" style={scoreBlockStyle}>
        Moves
        <div style={scoreValStyle}>{moves}</div>
      </div>
    </div>
  );
}

const scoreBlockStyle = {
  background: NORD.scoreBg,
  color: NORD.scoreText,
  borderRadius: "9px",
  minWidth: 70,
  padding: "7px 18px",
  textAlign: "center",
  fontWeight: "600",
  fontSize: "1rem",
  boxShadow: "0 2px 8px rgba(76,86,106,0.06)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const scoreValStyle = {
  fontSize: "1.3rem",
  marginTop: "2px",
  fontWeight: "bold",
  lineHeight: "1.2",
  fontFamily: "monospace",
};
/** Header with logo and title */
function Header() {
  return (
    <div style={{marginBottom: "0.25rem"}}>
      <h1
        style={{
          color: NORD.primary,
          fontFamily: "Montserrat, Arial, sans-serif",
          letterSpacing: "0.12em",
          margin: "0 0 0.07em 0",
          fontWeight: "900",
          fontSize: "2.05rem",
        }}
        className="game-header-title"
      >
        2048
      </h1>
      <span
        style={{
          color: NORD.secondary,
          fontFamily: "Roboto Mono, monospace",
          fontWeight: "500",
          fontSize: "1.07rem",
          letterSpacing: "0.08em",
          opacity: 0.93,
        }}
      >
        Nord Edition – Minimal & Modern
      </span>
    </div>
  );
}

/** ControlsPanel - Undo, Restart Buttons (+ Directions for mobile) */
function ControlsPanel({ onRestart, canUndo, onUndo }) {
  return (
    <div
      className="controls-panel"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "17px 0 6px 0",
        gap: "14px",
      }}
    >
      <button onClick={onRestart} style={controlBtnStyle}>
        Restart
      </button>
      <button
        onClick={onUndo}
        style={{
          ...controlBtnStyle,
          opacity: canUndo ? 1 : 0.45,
          cursor: canUndo ? "pointer" : "default",
        }}
        disabled={!canUndo}
      >
        Undo
      </button>
    </div>
  );
}
const controlBtnStyle = {
  background: NORD.btn,
  color: NORD.btnText,
  border: "none",
  borderRadius: "8px",
  padding: "10px 21px",
  fontWeight: 700,
  fontSize: "1rem",
  letterSpacing: "0.05em",
  boxShadow: "0 2px 6px rgba(94,129,172,0.07)",
  transition: "all 0.2s",
  cursor: "pointer",
  outline: "none",
  margin: 0,
};

/** Responsive hint for mobile users */
function MobileSwipeHint() {
  return (
    <div
      style={{
        color: NORD.secondary,
        margin: "13px auto 1.5rem auto",
        fontSize: "0.94rem",
        fontFamily: "Roboto Mono, monospace",
        opacity: 0.82,
        maxWidth: 275,
      }}
      className="mobile-swipe-hint"
    >
      Swipe or use arrow keys to move. Combine tiles to reach <b>2048</b>!
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Load from localStorage or start fresh
  const [grid, setGrid] = useState(() =>
    JSON.parse(window.localStorage.getItem(LOCALSTORAGE_GRID_KEY)) ||
    getInitialGrid()
  );
  const [score, setScore] = useState(() =>
    parseInt(window.localStorage.getItem(LOCALSTORAGE_SCORE_KEY) || "0", 10)
  );
  const [moves, setMoves] = useState(() =>
    parseInt(window.localStorage.getItem(LOCALSTORAGE_MOVES_KEY) || "0", 10)
  );
  const [highScore, setHighScore] = useState(() =>
    parseInt(window.localStorage.getItem(LOCALSTORAGE_HIGHSCORE_KEY) || "0", 10)
  );
  const [history, setHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  // Keyboard controls
  useEventListener("keydown", (e) => {
    if (gameOver || won) return;
    let handled = false;
    let moveFn;
    if (e.key === "ArrowLeft") moveFn = moveLeft;
    else if (e.key === "ArrowRight") moveFn = moveRight;
    else if (e.key === "ArrowUp") moveFn = moveUp;
    else if (e.key === "ArrowDown") moveFn = moveDown;
    if (moveFn) {
      e.preventDefault();
      handleMove(moveFn);
      handled = true;
    }
    return handled;
  });

  // Touch/swipe for mobile
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  useEffect(() => {
    function handleTouchStart(e) {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    }
    function handleTouchEnd(e) {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      touchEnd.current = { x: t.clientX, y: t.clientY };
      const dx = touchEnd.current.x - touchStart.current.x;
      const dy = touchEnd.current.y - touchStart.current.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // Not a swipe
      let moveFn = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) moveFn = moveRight;
        else moveFn = moveLeft;
      } else {
        if (dy > 0) moveFn = moveDown;
        else moveFn = moveUp;
      }
      if (moveFn && !(gameOver || won)) handleMove(moveFn);
    }
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line
  }, [grid, gameOver, won]);

  // Save to localStorage on state change
  useEffect(() => {
    window.localStorage.setItem(LOCALSTORAGE_GRID_KEY, JSON.stringify(grid));
    window.localStorage.setItem(LOCALSTORAGE_SCORE_KEY, score.toString());
    window.localStorage.setItem(LOCALSTORAGE_MOVES_KEY, moves.toString());
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem(
        LOCALSTORAGE_HIGHSCORE_KEY,
        score.toString()
      );
    }
  }, [grid, score, moves, highScore]);

  // Detect game over/win
  useEffect(() => {
    let has2048 = false;
    for (let row of grid)
      for (let val of row) if (val === 2048) has2048 = true;
    setWon(has2048);
    setGameOver(!canMove(grid) && !has2048);
  }, [grid]);

  // Move logic (keyboard/touch/click)
  // PUBLIC_INTERFACE
  function handleMove(moveFn) {
    // Save history for undo
    setHistory((prev) => [
      { grid: deepCopyGrid(grid), score, moves },
      ...prev.slice(0, 19), // history limit to 20
    ]);
    const { grid: newGrid, score: gained, moved } = moveFn(grid);
    if (moved) {
      let withTile = addRandomTile(deepCopyGrid(newGrid));
      setGrid(withTile);
      setScore(score + gained);
      setMoves(moves + 1);
    } else {
      // Don't mutate history if not moved
      setHistory((prev) => prev.slice(1));
    }
  }

  // PUBLIC_INTERFACE
  function restartGame() {
    setGrid(getInitialGrid());
    setScore(0);
    setMoves(0);
    setHistory([]);
    setGameOver(false);
    setWon(false);
  }

  // PUBLIC_INTERFACE
  function undoMove() {
    if (history.length === 0) return;
    const prevState = history[0];
    setGrid(deepCopyGrid(prevState.grid));
    setScore(prevState.score);
    setMoves(prevState.moves);
    setHistory(history.slice(1));
    setGameOver(false);
    setWon(false);
  }

  // Handle theme (light always for Nord, but CSS theme toggle optional)
  useEffect(() => {
    document.documentElement.style.backgroundColor = NORD.background;
  }, []);

  return (
    <div className="nord-2048-app"
      style={{
        minHeight: "100vh",
        background: NORD.background,
        color: NORD.header,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Montserrat', 'Roboto', Arial, sans-serif",
        transition: "background 0.23s",
        padding: "0",
      }}>
      <div style={{ width: "100%", maxWidth: 430, padding: "20px 12px 32px 12px", margin: "0 auto" }}>
        <Header />
        <ScorePanel score={score} highScore={highScore} moves={moves} />
        <ControlsPanel
          onRestart={restartGame}
          canUndo={history.length > 0}
          onUndo={undoMove}
        />
        <GameBoard grid={grid} />

        <MobileSwipeHint />

        {(gameOver || won) && (
          <div
            style={{
              margin: "0.9rem auto 1.2rem auto",
              textAlign: "center",
              background: won ? NORD.accent : NORD.secondary,
              color: "#fff",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "1.2rem",
              padding: "16px 18px 14px 18px",
              letterSpacing: "0.1em",
              boxShadow: "0 3px 12px 0 rgba(76,130,172,0.07)",
              maxWidth: 330,
              animation: "fadein 0.3s"
            }}>
            {won
              ? "Congratulations! You made 2048 🎉"
              : "Game Over – No more moves"}
            <div>
              <button
                style={{
                  ...controlBtnStyle,
                  marginTop: "1.1rem",
                  background: "#4C566A",
                  color: "#ECEFF4",
                }}
                onClick={restartGame}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        <div
          style={{
            marginTop: "2rem",
            color: NORD.secondary,
            fontSize: "0.98rem",
            opacity: 0.76,
            textAlign: "center",
          }}
        >
          <span>
            &copy; {new Date().getFullYear()} Nord 2048 &mdash; Built with React
          </span>
        </div>
      </div>
      {/* Responsive styles for small screens */}
      <style>{`
        @media (max-width: 599px) {
          .nord-2048-app > div { max-width: calc(100vw - 2vw); padding: 12px 3vw 24px 3vw; }
          .game-board { padding: 6px 6px 14px 6px; }
          .score-panel { flex-direction: column; gap: 4px; }
        }
        .nord-tile {
          transition: background 0.18s, color 0.12s, transform 0.14s;
        }
      `}</style>
    </div>
  );
}

export default App;
