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

// Helper to create empty grid with unique IDs per cell
function getInitialGrid() {
  const emptyGrid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE)
      .fill(0)
      .map(() => ({
        value: 0,
        key: Math.random().toString(36).slice(2),
        merging: false
      }))
  );
  let placed = 0;
  while (placed < START_TILES) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (emptyGrid[x][y].value === 0) {
      emptyGrid[x][y].value = Math.random() < 0.9 ? 2 : 4;
      placed++;
    }
  }
  return emptyGrid;
}

function deepCopyGrid(grid) {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

// Returns true if any moves are possible on grid
function canMove(grid) {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j].value === 0) return true;
      if (
        (i < GRID_SIZE - 1 && grid[i][j].value === grid[i + 1][j].value) ||
        (j < GRID_SIZE - 1 && grid[i][j].value === grid[i][j + 1].value)
      )
        return true;
    }
  }
  return false;
}

function getRandomEmptyCell(grid) {
  const empties = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) if (grid[r][c].value === 0) empties.push([r, c]);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}
function addRandomTile(grid) {
  const cell = getRandomEmptyCell(grid);
  if (!cell) return grid;
  const [r, c] = cell;
  grid[r][c] = {
    value: Math.random() < 0.9 ? 2 : 4,
    key: Math.random().toString(36).slice(2),
    merging: false
  };
  return grid;
}

// The next 4 move methods will annotate tiles with their animation actions
function moveGrid(grid, direction) {
  // For each move, record for each tile: startPos, endPos, isMerging
  let moved = false;
  let score = 0;

  // Prepare animation tracking
  const gridCopy = deepCopyGrid(grid);
  let newGrid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
  let mergedFlags = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );

  function getTileKey() {
    return Math.random().toString(36).slice(2);
  }

  let traversals;
  if (direction === "left")
    traversals = { x: Array.from({ length: GRID_SIZE }, (_, i) => i), y: Array.from({ length: GRID_SIZE }, (_, i) => i) };
  if (direction === "right")
    traversals = { x: Array.from({ length: GRID_SIZE }, (_, i) => i), y: Array.from({ length: GRID_SIZE }, (_, i) => GRID_SIZE - 1 - i) };
  if (direction === "up")
    traversals = { x: Array.from({ length: GRID_SIZE }, (_, i) => i), y: Array.from({ length: GRID_SIZE }, (_, i) => i) };
  if (direction === "down")
    traversals = { x: Array.from({ length: GRID_SIZE }, (_, i) => GRID_SIZE - 1 - i), y: Array.from({ length: GRID_SIZE }, (_, i) => i) };

  if (direction === "left" || direction === "right") {
    for (let i = 0; i < GRID_SIZE; i++) {
      // Get the non-empty tiles
      const row = traversals.y.map(j => {
        const cell = gridCopy[i][j];
        return {
          value: cell.value,
          key: cell.key,
          merging: false,
          from: j
        }
      }).filter(cell => cell.value !== 0);

      // Merge
      for (let j = 0; j < row.length; j++) {
        if (row[j + 1] && row[j].value === row[j + 1].value && !row[j].merging && !row[j + 1].merging) {
          row[j] = {
            value: row[j].value * 2,
            key: getTileKey(), // New merged tile gets new key
            merging: true,
            from: row[j].from,
            justMerged: true
          };
          score += row[j].value;
          row[j + 1] = { ...row[j + 1], value: 0, merging: false };
          moved = true;
        }
      }
      // Remove 0s again, fill to size
      const newRow = row.filter(cell => cell.value !== 0);
      while (newRow.length < GRID_SIZE) {
        newRow.push({ value: 0, key: getTileKey(), merging: false });
      }
      traversals.y.forEach((j, k) => {
        const cell = newRow[k];
        if (cell.value !== gridCopy[i][j].value) moved = true;
        newGrid[i][j] = {
          value: cell.value,
          key: cell.value ? cell.key : gridCopy[i][j].key,
          merging: !!cell.merging,
          justMerged: !!cell.justMerged,
          prevPos: cell.from !== undefined ? { r: i, c: traversals.y[cell.from] } : undefined
        };
      });
    }
  }
  else {
    for (let j = 0; j < GRID_SIZE; j++) {
      const col = traversals.x.map(i => {
        const cell = gridCopy[i][j];
        return {
          value: cell.value,
          key: cell.key,
          merging: false,
          from: i
        }
      }).filter(cell => cell.value !== 0);

      // Merge
      for (let i = 0; i < col.length; i++) {
        if (col[i + 1] && col[i].value === col[i + 1].value && !col[i].merging && !col[i + 1].merging) {
          col[i] = {
            value: col[i].value * 2,
            key: getTileKey(),
            merging: true,
            from: col[i].from,
            justMerged: true
          };
          score += col[i].value;
          col[i + 1] = { ...col[i + 1], value: 0, merging: false };
          moved = true;
        }
      }
      // Remove 0s again, fill to size
      const newCol = col.filter(cell => cell.value !== 0);
      while (newCol.length < GRID_SIZE) {
        newCol.push({ value: 0, key: getTileKey(), merging: false });
      }
      traversals.x.forEach((i, k) => {
        const cell = newCol[k];
        if (cell.value !== gridCopy[i][j].value) moved = true;
        newGrid[i][j] = {
          value: cell.value,
          key: cell.value ? cell.key : gridCopy[i][j].key,
          merging: !!cell.merging,
          justMerged: !!cell.justMerged,
          prevPos: cell.from !== undefined ? { r: traversals.x[cell.from], c: j } : undefined
        };
      });
    }
  }

  return { grid: newGrid, score, moved };
}
function moveLeft(grid) { return moveGrid(grid, "left"); }
function moveRight(grid) { return moveGrid(grid, "right"); }
function moveUp(grid) { return moveGrid(grid, "up"); }
function moveDown(grid) { return moveGrid(grid, "down"); }

function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef();
  useEffect(() => { savedHandler.current = handler; }, [handler]);
  useEffect(() => {
    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}

// Tile coordinate to left/top (for animation)
function getCellPosition(r, c) {
  return {
    left: `${c * 66}px`,
    top: `${r * 66}px`
  };
}

// PUBLIC_INTERFACE
function NordTile({
  value,
  style,
  className = "",
  onAnimationEnd,
  animType
}) {
  let tileStyle = {
    background: value > 0 ? NORD.tile : NORD.tileEmpty,
    color: value > 4 ? "#ECEFF4" : NORD.tileText,
    fontWeight: "800",
    fontSize: value < 1024 ? "2rem" : "1.4rem",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    width: "60px",
    height: "60px",
    margin: "3px",
    boxShadow: value ? "0 2px 5px rgba(94,129,172,0.07)" : "none",
    userSelect: "none",
    letterSpacing: "0.03em",
    transition: "background 0.13s, color 0.12s"
  };
  if (value === 2) tileStyle.background = "#E0E3F3";
  else if (value === 4) tileStyle.background = "#D3DADF";
  else if (value === 8) tileStyle.background = NORD.primary;
  else if (value === 16) tileStyle.background = "#81A1C1";
  else if (value === 32) tileStyle.background = NORD.accent;
  else if (value === 64) tileStyle.background = "#B48EAD";
  else if (value === 128) tileStyle.background = "#A3BE8C";
  else if (value === 256) tileStyle.background = "#88C0D0";
  else if (value === 512) tileStyle.background = "#EBCB8B";
  else if (value === 1024) tileStyle.background = "#A3A3BE";
  else if (value === 2048) tileStyle.background = "#FFD700";
  else if (value > 2048) tileStyle.background = "#FFB830";

  tileStyle = { ...tileStyle, ...style };

  let classes = "nord-tile";
  if (className) classes += " " + className;
  if (animType === "merge") classes += " tile-merged";
  else if (animType === "new") classes += " tile-new";
  else if (animType === "move") classes += " tile-move";

  return (
    <div
      style={tileStyle}
      className={classes}
      data-testid="tile"
      onAnimationEnd={onAnimationEnd}
    >
      {value > 0 ? value : ""}
    </div>
  );
}

// Animated GameBoard
// PUBLIC_INTERFACE
function GameBoard({ tiles }) {
  // tiles: Array of {value, from: {r, c}, to: {r, c}, key, animType}
  return (
    <div
      style={{
        background: NORD.gridBorder,
        display: "inline-block",
        borderRadius: "12px",
        padding: "13px 13px 17px 13px",
        boxShadow: "0 6px 28px -5px rgba(76,86,106,0.08)",
        position: "relative",
        width: `${66 * GRID_SIZE}px`,
        height: `${66 * GRID_SIZE}px`
      }}
      className="game-board"
    >
      {/* Board background: for empty cells */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0
        }}
      >
        {Array(GRID_SIZE * GRID_SIZE)
          .fill(null)
          .map((_, idx) => (
            <div
              key={idx}
              className="nord-tile tile-bg"
              style={{
                background: NORD.tileEmpty,
                position: "absolute",
                left: `${(idx % GRID_SIZE) * 66}px`,
                top: `${Math.floor(idx / GRID_SIZE) * 66}px`,
                width: "60px",
                height: "60px",
                margin: "3px",
                borderRadius: "8px"
              }}
            />
          ))}
      </div>
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          left: 0,
          top: 0
        }}
      >
        {tiles.map(tile => (
          <NordTile
            value={tile.value}
            key={tile.key}
            style={getCellPosition(tile.r, tile.c)}
            animType={tile.animType}
            onAnimationEnd={tile.onAnimationEnd}
          />
        ))}
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
  // Storage: use custom format
  function loadGridFromLS() {
    let raw = window.localStorage.getItem(LOCALSTORAGE_GRID_KEY);
    if (!raw) return null;
    try {
      let arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return null;
      // Convert to object cell format
      return arr.map(row =>
        row.map(val =>
          typeof val === "object" && val !== null && "value" in val ? val
            : { value: val, key: Math.random().toString(36).slice(2), merging: false }
        )
      );
    } catch (e) {
      return null;
    }
  }
  const [grid, setGrid] = useState(() =>
    loadGridFromLS() || getInitialGrid()
  );
  const [tiles, setTiles] = useState(() => getTilesFromGrid(grid));
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
  const [animLock, setAnimLock] = useState(false);

  // Keyboard controls
  useEventListener("keydown", (e) => {
    if (gameOver || won || animLock) return;
    let moveFn;
    if (e.key === "ArrowLeft") moveFn = moveLeft;
    else if (e.key === "ArrowRight") moveFn = moveRight;
    else if (e.key === "ArrowUp") moveFn = moveUp;
    else if (e.key === "ArrowDown") moveFn = moveDown;
    if (moveFn) {
      e.preventDefault();
      handleMove(moveFn);
    }
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
      if (moveFn && !(gameOver || won || animLock)) handleMove(moveFn);
    }
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line
  }, [grid, gameOver, won, animLock]);

  // Save to localStorage on state change
  useEffect(() => {
    window.localStorage.setItem(
      LOCALSTORAGE_GRID_KEY,
      JSON.stringify(grid.map(row => row.map(cell => ({ value: cell.value }))))
    );
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
      for (let cell of row) if (cell.value === 2048) has2048 = true;
    setWon(has2048);
    setGameOver(!canMove(grid) && !has2048);
  }, [grid]);

  // Convert grid to animated tiles for GameBoard
  function getTilesFromGrid(grid) {
    let tileArr = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = grid[r][c];
        if (cell.value > 0) {
          tileArr.push({
            r, c,
            value: cell.value,
            key: cell.key,
            animType: cell.justMerged ? "merge" : (cell.animType ? cell.animType : undefined),
          });
        }
      }
    }
    return tileArr;
  }

  // PUBLIC_INTERFACE
  function handleMove(moveFn) {
    if (animLock) return;
    setHistory((prev) => [
      { grid: deepCopyGrid(grid), score, moves },
      ...prev.slice(0, 19)
    ]);
    const { grid: newGrid, score: gained, moved } = moveFn(grid);
    if (!moved) {
      setHistory((prev) => prev.slice(1));
      return;
    }
    // Animate: Show tile movement and merging, then add random tile
    setAnimLock(true);

    // Find tile move animations and merging
    let movingTiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = grid[r][c];
        if (cell.value > 0) {
          // Find where this value moved to (if anywhere)
          for (let rr = 0; rr < GRID_SIZE; rr++)
            for (let cc = 0; cc < GRID_SIZE; cc++)
              if (newGrid[rr][cc].key === cell.key) {
                if (r !== rr || c !== cc) {
                  movingTiles.push({
                    r: rr,
                    c: cc,
                    value: cell.value,
                    key: cell.key,
                    prevR: r,
                    prevC: c,
                  });
                }
              }
        }
      }
    }

    // Pass anim info so GameBoard renders moving class
    let animationTiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = newGrid[r][c];
        if (cell.value > 0) {
          let animType = undefined;
          if (cell.justMerged) animType = "merge";
          else if (
            movingTiles.find(
              t => t.key === cell.key && (t.r !== t.prevR || t.c !== t.prevC)
            )
          )
            animType = "move";
          else if (!grid.some(row => row.some(cel => cel.key === cell.key))) animType = "new";
          animationTiles.push({
            r,
            c,
            value: cell.value,
            key: cell.key,
            animType,
            onAnimationEnd:
              animType === "merge"
                ? () => {
                  // Remove merge flag after animation
                  setGrid(g => {
                    const updated = deepCopyGrid(g);
                    updated[r][c].justMerged = false;
                    return updated;
                  });
                }
                : undefined
          });
        }
      }
    }
    setTiles(animationTiles);

    // Wait for animations then update for real (240ms covers >transitions)
    setTimeout(() => {
      let gridPostMove = deepCopyGrid(newGrid);
      addRandomTile(gridPostMove);
      setGrid(gridPostMove);
      setTiles(getTilesFromGrid(gridPostMove));
      setScore(score + gained);
      setMoves(moves + 1);
      setAnimLock(false);
    }, 230);
  }

  // PUBLIC_INTERFACE
  function restartGame() {
    const initial = getInitialGrid();
    setGrid(initial);
    setTiles(getTilesFromGrid(initial));
    setScore(0);
    setMoves(0);
    setHistory([]);
    setGameOver(false);
    setWon(false);
    setAnimLock(false);
  }

  // PUBLIC_INTERFACE
  function undoMove() {
    if (history.length === 0) return;
    const prevState = history[0];
    setGrid(deepCopyGrid(prevState.grid));
    setTiles(getTilesFromGrid(prevState.grid));
    setScore(prevState.score);
    setMoves(prevState.moves);
    setHistory(history.slice(1));
    setGameOver(false);
    setWon(false);
    setAnimLock(false);
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
        <GameBoard tiles={tiles} />

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
      {/* Responsive styles & transitions */}
      <style>{`
        @media (max-width: 599px) {
          .nord-2048-app > div { max-width: calc(100vw - 2vw); padding: 12px 3vw 24px 3vw; }
          .game-board { padding: 6px 6px 14px 6px; }
          .score-panel { flex-direction: column; gap: 4px; }
        }
      `}</style>
    </div>
  );
}

export default App;
