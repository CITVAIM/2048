(function () {
  "use strict";

  const SIZE = 4;
  const BEST_KEY = "2048-best";
  const WIN_VALUE = 2048;

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlayEl = document.getElementById("overlay");
  const overlayTextEl = document.getElementById("overlay-text");
  const overlayBtnEl = document.getElementById("overlay-btn");
  const keepGoingEl = document.getElementById("keep-going");
  const newGameEl = document.getElementById("new-game");

  let grid = [];
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY)) || 0;
  let won = false;
  let keepPlaying = false;
  let gameOver = false;

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function emptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function addRandomTile() {
    const cells = emptyCells();
    if (cells.length === 0) return;
    const { r, c } = cells[Math.floor(Math.random() * cells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render(mergedCells) {
    boardEl.innerHTML = "";
    const merged = new Set((mergedCells || []).map(([r, c]) => r * SIZE + c));

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cellEl = document.createElement("div");
        cellEl.className = "cell";
        const value = grid[r][c];
        if (value !== 0) {
          const tileEl = document.createElement("div");
          tileEl.className = "tile" + (merged.has(r * SIZE + c) ? " new" : "");
          tileEl.dataset.value = value;
          tileEl.textContent = value;
          cellEl.appendChild(tileEl);
        }
        boardEl.appendChild(cellEl);
      }
    }
  }

  function updateScores() {
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    bestEl.textContent = best;
  }

  function slideLine(line) {
    const filtered = line.filter((v) => v !== 0);
    const result = [];
    const merged = [];
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] === filtered[i + 1]) {
        const value = filtered[i] * 2;
        result.push(value);
        merged.push(value);
        score += value;
        if (value === WIN_VALUE && !won) won = true;
        i++;
      } else {
        result.push(filtered[i]);
      }
    }
    while (result.length < SIZE) result.push(0);
    return { result, merged };
  }

  function move(direction) {
    if (gameOver) return;
    const before = JSON.stringify(grid);
    const mergedValues = [];

    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      const line = [];
      for (let j = 0; j < SIZE; j++) {
        if (direction === "left") line.push(grid[i][j]);
        else if (direction === "right") line.push(grid[i][SIZE - 1 - j]);
        else if (direction === "up") line.push(grid[j][i]);
        else line.push(grid[SIZE - 1 - j][i]);
      }
      lines.push(line);
    }

    lines.forEach((line, i) => {
      const { result, merged } = slideLine(line);
      for (let j = 0; j < SIZE; j++) {
        if (direction === "left") grid[i][j] = result[j];
        else if (direction === "right") grid[i][SIZE - 1 - j] = result[j];
        else if (direction === "up") grid[j][i] = result[j];
        else grid[SIZE - 1 - j][i] = result[j];
      }
      merged.forEach((val) => mergedValues.push([i, val]));
    });

    if (JSON.stringify(grid) === before) return;

    addRandomTile();
    updateScores();
    render();
    checkState();
  }

  function movesAvailable() {
    if (emptyCells().length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function checkState() {
    if (won && !keepPlaying) {
      showOverlay("你赢了！", "再来一局", true);
      return;
    }
    if (!movesAvailable()) {
      gameOver = true;
      showOverlay("游戏结束", "再来一局", false);
    }
  }

  function showOverlay(text, btnText, canKeep) {
    overlayTextEl.textContent = text;
    overlayBtnEl.textContent = btnText;
    keepGoingEl.classList.toggle("hidden", !canKeep);
    overlayEl.classList.remove("hidden");
  }

  function hideOverlay() {
    overlayEl.classList.add("hidden");
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    won = false;
    keepPlaying = false;
    gameOver = false;
    addRandomTile();
    addRandomTile();
    hideOverlay();
    updateScores();
    render();
  }

  function handleOverlayNext() {
    if (won && !keepPlaying) {
      keepPlaying = true;
      won = true;
      hideOverlay();
    } else {
      newGame();
    }
  }

  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    d: "right",
    w: "up",
    s: "down",
    A: "left",
    D: "right",
    W: "up",
    S: "down",
  };

  document.addEventListener("keydown", (e) => {
    const dir = keyMap[e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  });

  overlayBtnEl.addEventListener("click", handleOverlayNext);
  keepGoingEl.addEventListener("click", () => {
    keepPlaying = true;
    hideOverlay();
  });
  newGameEl.addEventListener("click", newGame);

  let touchStart = null;
  boardEl.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  boardEl.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 24) return;
    if (absX > absY) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
    touchStart = null;
  }, { passive: true });

  bestEl.textContent = best;
  newGame();
})();
