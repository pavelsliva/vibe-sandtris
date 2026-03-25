const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const piecesPlacedNode = document.getElementById("piecesPlaced");
const sandCellsNode = document.getElementById("sandCells");
const surfaceLevelNode = document.getElementById("surfaceLevel");
const resetButton = document.getElementById("resetButton");

const COLS = 14;
const ROWS = 24;
const CELL = canvas.width / COLS;

const EMPTY = 0;
const SOLID = 1;
const SAND = 2;

const COLORS = [
  "#ef8354",
  "#f6bd60",
  "#84a59d",
  "#f28482",
  "#8ecae6",
  "#b8c0ff",
  "#90be6d",
];

const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
];

let board;
let current;
let piecesPlaced;
let dropAccumulator;
let sandAccumulator;
let lastTime = 0;

function createCell() {
  return { state: EMPTY, color: null, age: 0 };
}

function createBoard() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => createCell()),
  );
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function randomShape() {
  return cloneMatrix(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
}

function spawnPiece() {
  const shape = randomShape();
  current = {
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: -1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };

  // Если верх слишком плотный, даем песку мгновенно немного осесть.
  if (collides(current.shape, current.x, current.y)) {
    settleSand(8);
  }
}

function collides(shape, offsetX, offsetY) {
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) {
        continue;
      }

      const boardX = offsetX + x;
      const boardY = offsetY + y;

      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        return true;
      }

      if (boardY >= 0 && board[boardY][boardX].state !== EMPTY) {
        return true;
      }
    }
  }

  return false;
}

function mergeCurrentPiece() {
  for (let y = 0; y < current.shape.length; y += 1) {
    for (let x = 0; x < current.shape[y].length; x += 1) {
      if (!current.shape[y][x]) {
        continue;
      }

      const boardX = current.x + x;
      const boardY = current.y + y;
      if (boardY < 0 || boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        continue;
      }

      board[boardY][boardX] = {
        state: SOLID,
        color: current.color,
        age: 0,
      };
    }
  }

  piecesPlaced += 1;
  spawnPiece();
}

function movePiece(deltaX) {
  if (!collides(current.shape, current.x + deltaX, current.y)) {
    current.x += deltaX;
  }
}

function rotatePiece() {
  const rotated = rotateMatrix(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function dropPiece() {
  if (!collides(current.shape, current.x, current.y + 1)) {
    current.y += 1;
    return true;
  }

  mergeCurrentPiece();
  return false;
}

function hardDrop() {
  while (dropPiece()) {
    // Пусто: падаем до упора.
  }
}

function updateSolids() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell.state !== SOLID) {
        continue;
      }

      cell.age += 1;
      if (cell.age > 24) {
        cell.state = SAND;
        cell.age = 0;
      }
    }
  }
}

function attemptMoveSand(fromX, fromY, toX, toY) {
  if (toX < 0 || toX >= COLS || toY < 0 || toY >= ROWS) {
    return false;
  }

  if (board[toY][toX].state !== EMPTY) {
    return false;
  }

  board[toY][toX] = board[fromY][fromX];
  board[fromY][fromX] = createCell();
  return true;
}

function settleSand(iterations = 1) {
  for (let step = 0; step < iterations; step += 1) {
    for (let y = ROWS - 2; y >= 0; y -= 1) {
      const leftFirst = Math.random() > 0.5;
      const xRange = leftFirst
        ? [...Array(COLS).keys()]
        : [...Array(COLS).keys()].reverse();

      for (const x of xRange) {
        if (board[y][x].state !== SAND) {
          continue;
        }

        if (attemptMoveSand(x, y, x, y + 1)) {
          continue;
        }

        const dirs = leftFirst ? [-1, 1] : [1, -1];
        for (const dir of dirs) {
          if (attemptMoveSand(x, y, x + dir, y + 1)) {
            break;
          }
        }
      }
    }
  }
}

function getSurfaceLevel() {
  let filled = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y][x].state !== EMPTY) {
        filled += 1;
      }
    }
  }

  return (filled / COLS).toFixed(1);
}

function updateStats() {
  let sandCells = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y][x].state === SAND) {
        sandCells += 1;
      }
    }
  }

  piecesPlacedNode.textContent = String(piecesPlaced);
  sandCellsNode.textContent = String(sandCells);
  surfaceLevelNode.textContent = getSurfaceLevel();
}

function drawCell(x, y, color, inset = 2) {
  const px = x * CELL;
  const py = y * CELL;

  ctx.fillStyle = color;
  ctx.fillRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell.state === EMPTY) {
        continue;
      }

      if (cell.state === SOLID) {
        drawCell(x, y, cell.color, 2);
        continue;
      }

      const grains = [
        [0.2, 0.22],
        [0.52, 0.18],
        [0.25, 0.58],
        [0.61, 0.54],
      ];

      ctx.fillStyle = cell.color;
      for (const [gx, gy] of grains) {
        ctx.fillRect(
          x * CELL + CELL * gx,
          y * CELL + CELL * gy,
          CELL * 0.18,
          CELL * 0.18,
        );
      }
    }
  }
}

function drawCurrentPiece() {
  for (let y = 0; y < current.shape.length; y += 1) {
    for (let x = 0; x < current.shape[y].length; x += 1) {
      if (!current.shape[y][x]) {
        continue;
      }

      const boardY = current.y + y;
      if (boardY < 0) {
        continue;
      }

      drawCell(current.x + x, boardY, current.color, 2);
    }
  }
}

function update(delta) {
  dropAccumulator += delta;
  sandAccumulator += delta;

  const dropDelay = keysDown.has("ArrowDown") ? 70 : 380;
  if (dropAccumulator >= dropDelay) {
    dropPiece();
    dropAccumulator = 0;
  }

  if (sandAccumulator >= 45) {
    updateSolids();
    settleSand(1);
    sandAccumulator = 0;
  }

  updateStats();
}

function frame(time) {
  const delta = time - lastTime;
  lastTime = time;

  update(delta);
  drawBoard();
  drawCurrentPiece();

  requestAnimationFrame(frame);
}

const keysDown = new Set();

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
    event.preventDefault();
  }

  if (event.repeat && event.key !== "ArrowDown") {
    return;
  }

  keysDown.add(event.key);

  if (event.key === "ArrowLeft") {
    movePiece(-1);
  } else if (event.key === "ArrowRight") {
    movePiece(1);
  } else if (event.key === "ArrowUp") {
    rotatePiece();
  } else if (event.key === " ") {
    hardDrop();
  }
});

window.addEventListener("keyup", (event) => {
  keysDown.delete(event.key);
});

function resetGame() {
  board = createBoard();
  piecesPlaced = 0;
  dropAccumulator = 0;
  sandAccumulator = 0;
  spawnPiece();
  updateStats();
}

resetButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(frame);
