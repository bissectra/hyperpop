let world = [];
let model;
let shootSound;
let score = 0; // Initialize the score

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
  if (key === " ") shoot();
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

// ——— Input Handling ———
function handleInput() {
  const step = 3;
  const rotationSpeed = 0.02;

  // translation keys
  ["Y", "H", "U", "J", "I", "K", "O", "L"].forEach((k) => {
    if (keyIsDown(k.charCodeAt(0))) {
      handleTranslation(k, step);
    }
  });

  // rotation keys
  ["Q", "W", "E", "A", "S", "D"].forEach((k) => {
    if (keyIsDown(k.charCodeAt(0))) {
      handleRotation(k, rotationSpeed);
    }
  });
}

function handleTranslation(key, step) {
  const map = {
    Y: [step, 0, 0, 0],
    H: [-step, 0, 0, 0],
    U: [0, step, 0, 0],
    J: [0, -step, 0, 0],
    I: [0, 0, step, 0],
    K: [0, 0, -step, 0],
    O: [0, 0, 0, step],
    L: [0, 0, 0, -step],
  };
  const t = translationMatrix(...map[key]);
  model = matMatMult(t, model);
}

function handleRotation(key, speed) {
  const angle = keyIsDown(SHIFT) ? -speed : speed;
  const map = {
    Q: [0, 1],
    W: [0, 2],
    E: [1, 2],
    A: [0, 3],
    S: [1, 3],
    D: [2, 3],
  };
  const [i, j] = map[key];
  const r = rotationAboutPoint([0, 0, 0, 0], i, j, angle);
  model = matMatMult(r, model);
}

// ——— Shooting Logic ———
function shoot() {
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
