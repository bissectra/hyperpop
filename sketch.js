let world = [];
let stars = [];
let model;
let shootSounds = {};
let score = 0; // Initialize the score

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
  shootSounds = {
    1: loadSound("shoot_red.mp3"),
    2: loadSound("shoot_orange.mp3"),
    3: loadSound("shoot_yellow.mp3"),
    4: loadSound("shoot_green.mp3"),
    5: loadSound("shoot_blue.mp3"),
    6: loadSound("shoot_indigo.mp3"),
    7: loadSound("shoot_violet.mp3"),
  };
}

function setup() {
  // create a full-window WEBGL canvas behind the UI
  const cnv = createCanvas(windowWidth, windowHeight, WEBGL);
  cnv.position(0, 0);
  cnv.style("z-index", "-1");

  noStroke();
  model = identityMatrix(5);
  generateWorld(100);
  generateStars(1000);

  // Initialize the score display
  updateScore();

  // Load key bindings from the settings
  loadBindings();
}

function draw() {
  background(16, 20, 40);
  handleInput();
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
  console.log(`Key pressed: ${key} (code: ${pressedKey})`);
  console.log(`Shoot binding: ${shootBinding}`);
  if (pressedKey === shootBinding) {
    shoot();
  }
}

// ——— World Management ———
function generateWorld(count) {
  for (let i = 0; i < count; i++) {
    world.push(randomSphere());
  }
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

function randomSphere() {
  const idx = Math.floor(random(0, RAINBOW_COLORS.length));
  const { color, score } = RAINBOW_COLORS[idx];
  return {
    center: Array.from({ length: 4 }, () => random(-100, 100)),
    radius: 10,
    color,
    score,
  };
}

// ——— Drawing Functions ———
function drawWorld() {
  world.forEach(({ center, radius, color }) => {
    drawSphere(center, radius, color);
  });
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

  const step = 1;
  const rotationSpeed = 0.005;

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

  world = world.filter(({ center, radius, score: sphereScore }) => {
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
  });

  if (hits > 0) {
    score += gained;
    updateScore();
    if (lastScore && shootSounds[lastScore]) {
      shootSounds[lastScore].play();
    }
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
