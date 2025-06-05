let world = [];
let model;
let shootSound;
let score = 0; // Initialize the score

window.bindings = Object.assign({}, PRESETS["qwerty"]); // Default bindings

function loadBindings() {
  for (let key in window.bindings) {
    const input = document.getElementById(`key-${key}`);
    if (input) input.value = window.bindings[key];
  }
}

function preload() {
  shootSound = loadSound("shoot.mp3"); // Load the sound file
}

function setup() {
  // create a full-window WEBGL canvas behind the UI
  const cnv = createCanvas(windowWidth, windowHeight, WEBGL);
  cnv.position(0, 0);
  cnv.style("z-index", "-1");

  noStroke();
  model = identityMatrix(5);
  generateWorld(100);

  // Initialize the score display
  updateScore();

  // Load key bindings from the settings
  loadBindings();
}

function draw() {
  background(220);
  handleInput();
  setupLighting();
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

function randomSphere() {
  return {
    center: Array.from({ length: 4 }, () => random(-100, 100)),
    radius: 10,
    color: [random(0, 200), random(0, 200), random(100, 255)],
  };
}

// ——— Drawing Functions ———
function drawWorld() {
  world.forEach(({ center, radius, color }) => {
    drawSphere(center, radius, color);
  });
}

function drawSphere(center, radius, color, transform = true) {
  const [x, y, z, w] = transform ? matVecMult(model, [...center, 1]) : center;
  const validRadius = Math.sqrt(radius * radius - w * w);

  if (!isNaN(validRadius) && validRadius >= 0) {
    push();
    translate(x, y, z);
    ambientMaterial(...color);
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

  const step = 3;
  const rotationSpeed = 0.02;

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
      const angle = keyIsDown(SHIFT) ? -rotationSpeed : rotationSpeed;
      const r = rotationAboutPoint([0, 0, 0, 0], axes[0], axes[1], angle);
      model = matMatMult(r, model);
    }
  });
}

// ——— Shooting Logic ———
function shoot() {
  if (isSettingsOpen()) return; // Ignore shooting if settings are open
  shootSound.play();
  let hits = 0;

  world = world.filter(({ center, radius }) => {
    const [x, y, z, w] = matVecMult(model, [...center, 1]);
    const d = Math.sqrt(radius * radius - w * w);
    const visible = !isNaN(d) && d >= 0;

    if (!visible) return true;
    const dist = Math.sqrt(x * x + y * y);
    if (dist <= d) {
      hits++;
      return false;
    }
    return true;
  });

  if (hits > 0) {
    score += hits;
    updateScore();
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
