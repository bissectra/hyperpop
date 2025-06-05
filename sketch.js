let stars = [];
let model;
let failSound;
let shotSounds = {};
let score = 0; // Initialize the score

const CHUNK_SIZE = 600;
const CHUNK_RADIUS = 2; // Load chunks within this radius in 4D
let chunkContents = {}; // key → list of objects

const RAINBOW_COLORS = [
  { color: [255, 0, 0], score: 1 }, // Red
  { color: [255, 127, 0], score: 2 }, // Orange
  { color: [255, 255, 0], score: 3 }, // Yellow
  { color: [0, 255, 0], score: 4 }, // Green
  { color: [0, 0, 255], score: 5 }, // Blue
  { color: [75, 0, 130], score: 6 }, // Indigo
  { color: [148, 0, 211], score: 7 }, // Violet
];

window.bindings = Object.assign({}, PRESETS["qwerty"]); // Default bindings

function loadBindings() {
  for (let key in window.bindings) {
    const input = document.getElementById(`key-${key}`);
    if (input) input.value = window.bindings[key];
  }
}

function preload() {
  failSound = loadSound("assets/fail.mp3");
  shotSounds = {
    1: loadSound("assets/shot_red.wav"),
    2: loadSound("assets/shot_orange.wav"),
    3: loadSound("assets/shot_yellow.wav"),
    4: loadSound("assets/shot_green.wav"),
    5: loadSound("assets/shot_blue.wav"),
    6: loadSound("assets/shot_indigo.wav"),
    7: loadSound("assets/shot_violet.wav"),
  };
}

function setup() {
  // create a full-window WEBGL canvas behind the UI
  const cnv = createCanvas(windowWidth, windowHeight, WEBGL);
  cnv.position(0, 0);
  cnv.style("z-index", "-1");

  noStroke();
  model = identityMatrix(5);
  generateStars(1000);

  // Initialize the score display
  updateScore();

  // Load key bindings from the settings
  loadBindings();
}

function draw() {
  background(16, 20, 40);
  handleInput();
  updateChunks();
  setupLighting();
  drawStars();
  drawWorld();
  drawTarget();
}

function windowResized() {
  // resize the canvas to fill the new window dimensions
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  // handle shooting
  const shootBinding = getKeyCode(window.bindings.shoot);
  const pressedKey = getKeyCode(key);
  if (pressedKey === shootBinding) shoot();
}

// ——— World Management ———
function getChunkKey(i, j, k, l) {
  return `${i},${j},${k},${l}`;
}

function loadChunk(i, j, k, l) {
  const key = getChunkKey(i, j, k, l);
  if (chunkContents[key]) {
    // Already loaded
    return;
  }

  const chunkOrigin = [
    i * CHUNK_SIZE,
    j * CHUNK_SIZE,
    k * CHUNK_SIZE,
    l * CHUNK_SIZE,
  ];
  const sphereCount = Math.max(0, Math.round(randomGaussian(10, 5)));
  const chunkObjects = [];

  for (let n = 0; n < sphereCount; n++) {
    const localPos = [
      random(0, CHUNK_SIZE),
      random(0, CHUNK_SIZE),
      random(0, CHUNK_SIZE),
      random(0, CHUNK_SIZE),
    ];
    const center = chunkOrigin.map((base, idx) => base + localPos[idx]);

    const idxColor = Math.floor(random(0, RAINBOW_COLORS.length));
    const { color, score } = RAINBOW_COLORS[idxColor];

    chunkObjects.push({
      center,
      radius: 15,
      color,
      score,
      chunk: key,
    });
  }

  chunkContents[key] = chunkObjects;
}

function getCamera4DPosition() {
  // Extract inverse translation from the model matrix
  // Assuming model is an affine transform matrix: column 4 is position
  const invModel = math.inv(model);
  const [x, y, z, w] = matVecMult(invModel, [0, 0, 0, 0, 1]); // origin in model space
  return [x, y, z, w];
}

function unloadFarChunks(cameraCoords, maxDistance = CHUNK_RADIUS + 3) {
  for (const key in chunkContents) {
    const [i, j, k, l] = key.split(",").map(Number);
    const dist = Math.max(
      Math.abs(i - cameraCoords[0]),
      Math.abs(j - cameraCoords[1]),
      Math.abs(k - cameraCoords[2]),
      Math.abs(l - cameraCoords[3])
    );
    if (dist > maxDistance) {
      delete chunkContents[key];
    }
  }
}

function updateChunks() {
  const pos = getCamera4DPosition(); // returns [x, y, z, w] from the model matrix
  const chunkCoords = pos.map((p) => Math.floor(p / CHUNK_SIZE));

  for (let di = -CHUNK_RADIUS; di <= CHUNK_RADIUS; di++) {
    for (let dj = -CHUNK_RADIUS; dj <= CHUNK_RADIUS; dj++) {
      for (let dk = -CHUNK_RADIUS; dk <= CHUNK_RADIUS; dk++) {
        for (let dl = -CHUNK_RADIUS; dl <= CHUNK_RADIUS; dl++) {
          const ci = chunkCoords[0] + di;
          const cj = chunkCoords[1] + dj;
          const ck = chunkCoords[2] + dk;
          const cl = chunkCoords[3] + dl;

          loadChunk(ci, cj, ck, cl);
        }
      }
    }
  }

  unloadFarChunks(chunkCoords);
}

function generateStars(count) {
  stars = [];
  for (let i = 0; i < count; i++) {
    const dir = Array.from({ length: 4 }, () => random(-1, 1));
    const norm = Math.sqrt(dir.reduce((s, v) => s + v * v, 0));
    const unit = dir.map((v) => v / norm);
    const dist = 2000;
    stars.push({
      center: unit.map((v) => v * dist),
      radius: random(8, 18),
      color: [255, 255, 255], // white color
    });
  }
}

// ——— Drawing Functions ———
function drawWorld() {
  const pos = getCamera4DPosition();
  const chunkCoords = pos.map((p) => Math.floor(p / CHUNK_SIZE));
  const DRAW_RADIUS = CHUNK_RADIUS + 1;

  for (let di = -DRAW_RADIUS; di <= DRAW_RADIUS; di++) {
    for (let dj = -DRAW_RADIUS; dj <= DRAW_RADIUS; dj++) {
      for (let dk = -DRAW_RADIUS; dk <= DRAW_RADIUS; dk++) {
        for (let dl = -DRAW_RADIUS; dl <= DRAW_RADIUS; dl++) {
          const ci = chunkCoords[0] + di;
          const cj = chunkCoords[1] + dj;
          const ck = chunkCoords[2] + dk;
          const cl = chunkCoords[3] + dl;
          const key = getChunkKey(ci, cj, ck, cl);
          if (chunkContents[key]) {
            chunkContents[key].forEach(({ center, radius, color }) => {
              drawSphere(center, radius, color);
            });
          }
        }
      }
    }
  }
}

function drawStars() {
  // Remove translação do modelo: só rotação
  let rotOnly = model.map((row) => row.slice());
  // Zera a coluna de translação
  for (let i = 0; i < 4; i++) rotOnly[i][4] = 0;

  stars.forEach(({ center, radius, color }) => {
    drawSphere(center, radius, color, rotOnly, () => {
      emissiveMaterial(...color);
    });
  });
}

function drawSphere(
  center,
  radius,
  color,
  customModel = null,
  material = null
) {
  const mat = customModel || model;
  const [x, y, z, w] = matVecMult(mat, [...center, 1]);
  const validRadius = Math.sqrt(radius * radius - w * w);

  if (!isNaN(validRadius) && validRadius >= 0) {
    push();
    translate(x, y, z);
    if (material) {
      material();
    } else if (color) {
      ambientMaterial(...color);
    }
    sphere(validRadius);
    pop();
  }
}

function drawTarget() {
  push();
  drawingContext.disable(drawingContext.DEPTH_TEST);
  translate(0, 0, 0);
  strokeWeight(2);
  stroke(255, 0, 0);
  noFill();
  line(-20, 0, 0, 20, 0, 0);
  line(0, -20, 0, 0, 20, 0);
  drawingContext.enable(drawingContext.DEPTH_TEST);
  pop();
}

function isSettingsOpen() {
  const settingsPanel = document.getElementById("settings-panel");
  return !settingsPanel.classList.contains("hidden");
}

// ——— Input Handling ———
function handleInput() {
  if (isSettingsOpen()) return; // Ignore input if settings are open

  const step = 1.5;
  const rotationSpeed = 0.008;

  // translation keys usando bindings
  const translationMap = {
    left: [step, 0, 0, 0],
    right: [-step, 0, 0, 0],
    forward: [0, step, 0, 0],
    backward: [0, -step, 0, 0],
    up: [0, 0, step, 0],
    down: [0, 0, -step, 0],
    ana: [0, 0, 0, step],
    kata: [0, 0, 0, -step],
  };

  Object.entries(translationMap).forEach(([dir, vec]) => {
    const key = window.bindings[dir];
    if (key && keyIsDown(getKeyCode(key))) {
      const t = translationMatrix(...vec);
      model = matMatMult(t, model);
    }
  });

  // rotation keys usando bindings
  const rotationMap = {
    rotateXY: [0, 1],
    rotateXZ: [0, 2],
    rotateYZ: [1, 2],
    rotateXW: [0, 3],
    rotateYW: [1, 3],
    rotateZW: [2, 3],
  };

  Object.entries(rotationMap).forEach(([rot, axes]) => {
    const key = window.bindings[rot];
    if (key && keyIsDown(getKeyCode(key))) {
      const r = rotationAboutPoint(
        [0, 0, 0, 0],
        axes[0],
        axes[1],
        rotationSpeed
      );
      model = matMatMult(r, model);
    }
  });
}

// ——— Shooting Logic ———
function shoot() {
  if (isSettingsOpen()) return;
  let hits = 0;
  let gained = 0;
  let lastScore = null;

  const pos = getCamera4DPosition();
  const chunkCoords = pos.map((p) => Math.floor(p / CHUNK_SIZE));
  const SHOOT_RADIUS = CHUNK_RADIUS + 1;

  for (let di = -SHOOT_RADIUS; di <= SHOOT_RADIUS; di++) {
    for (let dj = -SHOOT_RADIUS; dj <= SHOOT_RADIUS; dj++) {
      for (let dk = -SHOOT_RADIUS; dk <= SHOOT_RADIUS; dk++) {
        for (let dl = -SHOOT_RADIUS; dl <= SHOOT_RADIUS; dl++) {
          const ci = chunkCoords[0] + di;
          const cj = chunkCoords[1] + dj;
          const ck = chunkCoords[2] + dk;
          const cl = chunkCoords[3] + dl;
          const key = getChunkKey(ci, cj, ck, cl);
          if (!chunkContents[key]) continue;
          // Remove spheres hit by the shot
          chunkContents[key] = chunkContents[key].filter(
            ({ center, radius, score: sphereScore }) => {
              const [x, y, z, w] = matVecMult(model, [...center, 1]);
              const d = Math.sqrt(radius * radius - w * w);
              const visible = !isNaN(d) && d >= 0;
              if (!visible) return true;
              const dist = Math.sqrt(x * x + y * y);
              if (dist <= d) {
                hits++;
                gained += sphereScore || 1;
                lastScore = sphereScore || 1;
                return false;
              }
              return true;
            }
          );
        }
      }
    }
  }

  if (hits > 0) {
    score += gained;
    updateScore();
    if (lastScore && shotSounds[lastScore]) {
      shotSounds[lastScore].play();
    }
  } else {
    if (!failSound.isLoaded()) return;
    failSound.play();
  }
}

function updateScore() {
  const el = document.getElementById("score");
  if (el) el.textContent = score;
}

// ——— Lighting ———
function setupLighting() {
  ambientLight(150);
  directionalLight(255, 255, 255, 0, 1, -1);
}
