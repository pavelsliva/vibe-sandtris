const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const startPauseButton = document.getElementById("startPauseButton");
const resetButton = document.getElementById("resetButton");
const musicToggleButton = document.getElementById("musicToggleButton");
const themeSelect = document.getElementById("themeSelect");
const bitcoinCountNode = document.getElementById("bitcoinCount");
const sessionTimeNode = document.getElementById("sessionTime");
const totalTimeNode = document.getElementById("totalTime");
const statusTextNode = document.getElementById("statusText");
const flowTextNode = document.getElementById("flowText");
const breathTextNode = document.getElementById("breathText");
const breathOrbNode = document.getElementById("breathOrb");
const mobileButtons = document.querySelectorAll("[data-action]");

const COLS = 10;
const ROWS = 20;
const CELL = canvas.width / COLS;
const EMPTY = 0;
const SOLID = 1;
const SAND = 2;

const DROP_DELAY = 680;
const FAST_DROP_DELAY = 110;
const SOLID_TO_SAND_MS = 700;
const SAND_STEP_MS = 42;
const DRAIN_STEP_MS = 90;
const DRAIN_TRIGGER_ROW = 8;
const SAVE_INTERVAL_MS = 2000;
const STORAGE_KEY = "sandtris-flow-total-ms";

const PALETTE = [
  "#d98d6a",
  "#d8b06a",
  "#8ba69b",
  "#90a7c7",
  "#bf9dc7",
  "#df7c79",
  "#87b8ad",
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

const THEMES = {
  lofi: {
    notes: [57, 60, 64, 67, 64, 60, 55, 59, 62, 65, 62, 59],
    duration: 0.78,
    wave: "triangle",
    gain: 0.042,
    bassOffset: -12,
  },
  piano: {
    notes: [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65],
    duration: 0.92,
    wave: "sine",
    gain: 0.038,
    bassOffset: -24,
  },
};

let board = createBoard();
let currentPiece = null;
let dropAccumulator = 0;
let sandAccumulator = 0;
let drainAccumulator = 0;
let saveAccumulator = 0;
let lastFrameTime = 0;
let sessionMs = 0;
let totalMs = Number(localStorage.getItem(STORAGE_KEY) || 0);
let bitcoins = 0;
let isRunning = false;
let hasStarted = false;
let firstInteractionDone = false;
let breathAccumulator = 0;
let breathIndex = 0;
let isBreathExpanded = false;
let audioContext = null;
let masterGain = null;
let musicEnabled = false;
let nextNoteAt = 0;
let noteIndex = 0;
const keysHeld = new Set();

function createCell() {
  return {
    state: EMPTY,
    color: null,
    ageMs: 0,
  };
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
  return matrix[0].map((_, column) => matrix.map((row) => row[column]).reverse());
}

function midiToFrequency(note) {
  return 440 * (2 ** ((note - 69) / 12));
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function spawnPiece() {
  const shape = cloneMatrix(randomChoice(SHAPES));
  currentPiece = {
    shape,
    color: randomChoice(PALETTE),
    x: Math.floor((COLS - shape[0].length) / 2),
    y: -1,
  };

  if (collides(shape, currentPiece.x, currentPiece.y)) {
    settleSand(10);
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

function mergePiece() {
  for (let y = 0; y < currentPiece.shape.length; y += 1) {
    for (let x = 0; x < currentPiece.shape[y].length; x += 1) {
      if (!currentPiece.shape[y][x]) {
        continue;
      }

      const boardX = currentPiece.x + x;
      const boardY = currentPiece.y + y;

      if (boardX < 0 || boardX >= COLS || boardY < 0 || boardY >= ROWS) {
        continue;
      }

      board[boardY][boardX] = {
        state: SOLID,
        color: currentPiece.color,
        ageMs: 0,
      };
    }
  }

  spawnPiece();
}

function movePiece(deltaX) {
  if (!currentPiece || !isRunning) {
    return;
  }

  if (!collides(currentPiece.shape, currentPiece.x + deltaX, currentPiece.y)) {
    currentPiece.x += deltaX;
    acknowledgeInteraction();
  }
}

function rotatePiece() {
  if (!currentPiece || !isRunning) {
    return;
  }

  const rotated = rotateMatrix(currentPiece.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(rotated, currentPiece.x + kick, currentPiece.y)) {
      currentPiece.shape = rotated;
      currentPiece.x += kick;
      acknowledgeInteraction();
      return;
    }
  }
}

function softDrop() {
  if (!currentPiece || !isRunning) {
    return;
  }

  if (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
  } else {
    mergePiece();
  }
}

function updateSolidToSand(delta) {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell.state !== SOLID) {
        continue;
      }

      cell.ageMs += delta;
      if (cell.ageMs >= SOLID_TO_SAND_MS) {
        cell.state = SAND;
        cell.ageMs = 0;
      }
    }
  }
}

function moveSand(fromX, fromY, toX, toY) {
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
      const traverseRight = Math.random() > 0.5;
      const start = traverseRight ? COLS - 1 : 0;
      const end = traverseRight ? -1 : COLS;
      const increment = traverseRight ? -1 : 1;

      for (let x = start; x !== end; x += increment) {
        if (board[y][x].state !== SAND) {
          continue;
        }

        if (moveSand(x, y, x, y + 1)) {
          continue;
        }

        const lateral = traverseRight ? [1, -1] : [-1, 1];
        for (const dir of lateral) {
          if (moveSand(x, y, x + dir, y + 1)) {
            break;
          }
        }
      }
    }
  }
}

function getAverageFilledRow() {
  let filled = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y][x].state !== EMPTY) {
        filled += 1;
      }
    }
  }

  return filled / COLS;
}

function shouldDrain() {
  return getAverageFilledRow() >= DRAIN_TRIGGER_ROW;
}

function drainSand() {
  if (!shouldDrain()) {
    return;
  }

  const apertureColumns = [4, 5, 3, 6];
  let removed = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (const column of apertureColumns) {
      const cell = board[y][column];
      if (cell.state === SAND) {
        board[y][column] = createCell();
        removed += 1;
      }
    }

    if (removed > 0) {
      break;
    }
  }

  if (removed > 0) {
    bitcoins += removed;
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#111720");
  gradient.addColorStop(0.58, "#18202a");
  gradient.addColorStop(1, "#231912");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.fillRect(0, y * CELL, canvas.width, 1);
  }

  const glow = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height - 10,
    10,
    canvas.width / 2,
    canvas.height - 10,
    120,
  );
  glow.addColorStop(0, "rgba(242, 207, 150, 0.2)");
  glow.addColorStop(1, "rgba(242, 207, 150, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

  ctx.fillStyle = "rgba(242, 207, 150, 0.18)";
  roundRect(canvas.width / 2 - CELL * 1.1, canvas.height - 10, CELL * 2.2, 12, 6);
  ctx.fill();
}

function drawBlock(x, y, color) {
  const px = x * CELL + 3;
  const py = y * CELL + 3;
  const size = CELL - 6;

  ctx.fillStyle = color;
  roundRect(px, py, size, size, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(px + 3, py + 3, size - 6, size * 0.28, 6);
  ctx.fill();
}

function drawSand(x, y, color) {
  const px = x * CELL;
  const py = y * CELL;
  const grains = [
    [0.12, 0.24, 0.22],
    [0.44, 0.16, 0.18],
    [0.26, 0.52, 0.2],
    [0.58, 0.5, 0.18],
    [0.44, 0.68, 0.14],
  ];

  for (const [gx, gy, size] of grains) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px + CELL * gx, py + CELL * gy, CELL * size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoard() {
  drawBackground();

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell.state === EMPTY) {
        continue;
      }

      if (cell.state === SOLID) {
        drawBlock(x, y, cell.color);
      } else {
        drawSand(x, y, cell.color);
      }
    }
  }
}

function drawCurrentPiece() {
  if (!currentPiece) {
    return;
  }

  for (let y = 0; y < currentPiece.shape.length; y += 1) {
    for (let x = 0; x < currentPiece.shape[y].length; x += 1) {
      if (!currentPiece.shape[y][x]) {
        continue;
      }

      const boardY = currentPiece.y + y;
      if (boardY < 0) {
        continue;
      }

      drawBlock(currentPiece.x + x, boardY, currentPiece.color);
    }
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateStats() {
  bitcoinCountNode.textContent = String(bitcoins);
  sessionTimeNode.textContent = formatTime(sessionMs);
  totalTimeNode.textContent = formatTime(totalMs + sessionMs);
  statusTextNode.textContent = isRunning ? "В потоке" : "Пауза";

  const height = getAverageFilledRow();
  if (height < 4) {
    flowTextNode.textContent = "едва шуршит";
  } else if (height < 8) {
    flowTextNode.textContent = "спокойный";
  } else if (height < 12) {
    flowTextNode.textContent = "собирает слои";
  } else {
    flowTextNode.textContent = "песочные часы";
  }
}

function updateOverlay() {
  overlay.classList.toggle("hidden", hasStarted);
  startPauseButton.textContent = isRunning ? "Пауза" : hasStarted ? "Продолжить" : "Старт";
}

function persistTime() {
  localStorage.setItem(STORAGE_KEY, String(totalMs + sessionMs));
}

function updateBreath(delta) {
  breathAccumulator += delta;
  const phases = ["вдох", "выдох", "пауза"];
  if (breathAccumulator >= 3200) {
    breathAccumulator = 0;
    breathIndex = (breathIndex + 1) % phases.length;
    breathTextNode.textContent = phases[breathIndex];
    isBreathExpanded = phases[breathIndex] === "вдох";
    breathOrbNode.classList.toggle("expand", isBreathExpanded);
  }
}

function ensureAudio() {
  if (audioContext) {
    return;
  }

  audioContext = new window.AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);
}

function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  musicToggleButton.textContent = enabled ? "Музыка: вкл" : "Музыка: выкл";

  if (!audioContext || !masterGain) {
    return;
  }

  const when = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(when);
  masterGain.gain.linearRampToValueAtTime(enabled ? 0.12 : 0, when + 0.35);
}

function scheduleNote(theme, note, startTime) {
  const duration = theme.duration;

  const mainOsc = audioContext.createOscillator();
  const mainGain = audioContext.createGain();
  mainOsc.type = theme.wave;
  mainOsc.frequency.value = midiToFrequency(note);
  mainGain.gain.setValueAtTime(0, startTime);
  mainGain.gain.linearRampToValueAtTime(theme.gain, startTime + 0.03);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  mainOsc.connect(mainGain).connect(masterGain);
  mainOsc.start(startTime);
  mainOsc.stop(startTime + duration + 0.04);

  const bassOsc = audioContext.createOscillator();
  const bassGain = audioContext.createGain();
  bassOsc.type = "sine";
  bassOsc.frequency.value = midiToFrequency(note + theme.bassOffset);
  bassGain.gain.setValueAtTime(0, startTime);
  bassGain.gain.linearRampToValueAtTime(theme.gain * 0.62, startTime + 0.05);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.15);
  bassOsc.connect(bassGain).connect(masterGain);
  bassOsc.start(startTime);
  bassOsc.stop(startTime + duration + 0.18);
}

function tickMusicScheduler() {
  if (!audioContext || !musicEnabled || !isRunning) {
    return;
  }

  const theme = THEMES[themeSelect.value];
  while (nextNoteAt < audioContext.currentTime + 0.25) {
    scheduleNote(theme, theme.notes[noteIndex % theme.notes.length], nextNoteAt);
    nextNoteAt += theme.duration;
    noteIndex += 1;
  }
}

function acknowledgeInteraction() {
  if (firstInteractionDone) {
    return;
  }

  firstInteractionDone = true;
  ensureAudio();
}

function startGame() {
  acknowledgeInteraction();
  hasStarted = true;
  isRunning = true;
  if (!currentPiece) {
    spawnPiece();
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (musicEnabled) {
    nextNoteAt = audioContext.currentTime + 0.05;
  }

  updateOverlay();
  updateStats();
}

function pauseGame() {
  isRunning = false;
  updateOverlay();
  updateStats();
}

function toggleStartPause() {
  if (isRunning) {
    pauseGame();
  } else {
    startGame();
  }
}

function resetGame() {
  board = createBoard();
  currentPiece = null;
  dropAccumulator = 0;
  sandAccumulator = 0;
  drainAccumulator = 0;
  saveAccumulator = 0;
  sessionMs = 0;
  bitcoins = 0;
  hasStarted = false;
  isRunning = false;
  breathAccumulator = 0;
  breathIndex = 0;
  breathTextNode.textContent = "вдох";
  breathOrbNode.classList.remove("expand");
  spawnPiece();
  updateOverlay();
  updateStats();
}

function updateGame(delta) {
  updateBreath(delta);

  if (!isRunning) {
    return;
  }

  sessionMs += delta;
  dropAccumulator += delta;
  sandAccumulator += delta;
  drainAccumulator += delta;
  saveAccumulator += delta;

  if (saveAccumulator >= SAVE_INTERVAL_MS) {
    saveAccumulator = 0;
    persistTime();
  }

  const dropDelay = keysHeld.has("down") ? FAST_DROP_DELAY : DROP_DELAY;
  if (dropAccumulator >= dropDelay) {
    softDrop();
    dropAccumulator = 0;
  }

  if (sandAccumulator >= SAND_STEP_MS) {
    updateSolidToSand(sandAccumulator);
    settleSand(2);
    sandAccumulator = 0;
  }

  if (drainAccumulator >= DRAIN_STEP_MS) {
    drainSand();
    drainAccumulator = 0;
  }

  tickMusicScheduler();
  updateStats();
}

function frame(time) {
  const delta = Math.min(time - lastFrameTime || 16, 34);
  lastFrameTime = time;

  updateGame(delta);
  drawBoard();
  drawCurrentPiece();
  requestAnimationFrame(frame);
}

function handleAction(action, active = true) {
  acknowledgeInteraction();

  if (action === "left" && active) {
    movePiece(-1);
  } else if (action === "right" && active) {
    movePiece(1);
  } else if (action === "rotate" && active) {
    rotatePiece();
  } else if (action === "down") {
    if (active) {
      keysHeld.add("down");
    } else {
      keysHeld.delete("down");
    }
  }
}

function mapKey(eventKey) {
  const key = eventKey.toLowerCase();
  if (key === "arrowleft" || key === "a") {
    return "left";
  }
  if (key === "arrowright" || key === "d") {
    return "right";
  }
  if (key === "arrowup" || key === "w" || key === "x") {
    return "rotate";
  }
  if (key === "arrowdown" || key === "s") {
    return "down";
  }
  return null;
}

window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key.startsWith("Arrow")) {
    event.preventDefault();
  }

  if (event.repeat && event.key !== "ArrowDown" && event.key.toLowerCase() !== "s") {
    return;
  }

  const action = mapKey(event.key);
  if (action) {
    if (!hasStarted) {
      startGame();
    }
    handleAction(action, true);
  }
});

window.addEventListener("keyup", (event) => {
  const action = mapKey(event.key);
  if (action === "down") {
    handleAction(action, false);
  }
});

for (const button of mobileButtons) {
  const { action } = button.dataset;
  const onPress = (event) => {
    event.preventDefault();
    if (!hasStarted) {
      startGame();
    }
    handleAction(action, true);
  };

  const onRelease = (event) => {
    event.preventDefault();
    if (action === "down") {
      handleAction(action, false);
    }
  };

  button.addEventListener("pointerdown", onPress);
  button.addEventListener("pointerup", onRelease);
  button.addEventListener("pointercancel", onRelease);
  button.addEventListener("pointerleave", onRelease);
}

startPauseButton.addEventListener("click", toggleStartPause);
resetButton.addEventListener("click", resetGame);
musicToggleButton.addEventListener("click", () => {
  acknowledgeInteraction();
  ensureAudio();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  setMusicEnabled(!musicEnabled);
  nextNoteAt = audioContext.currentTime + 0.05;
});

themeSelect.addEventListener("change", () => {
  if (!audioContext) {
    return;
  }
  nextNoteAt = audioContext.currentTime + 0.05;
});

document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden && isRunning) {
      pauseGame();
    }
  },
);

window.addEventListener("beforeunload", persistTime);

resetGame();
setMusicEnabled(false);
requestAnimationFrame(frame);
