import { GameMode, GameState } from './stateManager.js';
import { BuildSystem, PART_DEFS, GRID_SIZE } from './buildSystem.js';
import { PhysicsEngine, PIXELS_PER_METER } from './physicsEngine.js';
import { Renderer } from './renderer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const altitudeEl = document.getElementById('altitude');
const velocityEl = document.getElementById('velocity');
const fuelEl = document.getElementById('fuel');
const massEl = document.getElementById('mass');
const throttleEl = document.getElementById('throttle');
const modeLabelEl = document.getElementById('mode-label');
const launchBtn = document.getElementById('launch-btn');
const backToBuildBtn = document.getElementById('back-to-build-btn');
const partButtons = [...document.querySelectorAll('.part-btn')];

const GROUND_OFFSET = 100;
const gameState = new GameState();
const buildSystem = new BuildSystem(canvas);
const physicsEngine = new PhysicsEngine(window.innerHeight, GROUND_OFFSET);
const renderer = new Renderer(canvas, ctx, window.innerHeight - GROUND_OFFSET);

let heldPart = null;
let mouseX = 0;
let mouseY = 0;
let craft = null;
let physicsSnapshot = {
  mass: 0,
  fuel: 0,
  fuelCapacity: 0,
  centerOfMass: { x: 0, y: 0 },
  bounds: { maxY: 0 },
  ground: window.innerHeight - GROUND_OFFSET,
};

function getMousePos(targetCanvas, evt) {
  const rect = targetCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (targetCanvas.width / rect.width),
    y: (evt.clientY - rect.top) * (targetCanvas.height / rect.height),
  };
}

function setCanvasSize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  buildSystem.surfaceHeight = window.innerHeight - GROUND_OFFSET;
  physicsEngine.setCanvasHeight(window.innerHeight);
  renderer.surfaceHeight = window.innerHeight - GROUND_OFFSET;
}

function setActivePartButton(partType) {
  partButtons.forEach((button) => button.classList.toggle('selected', button.dataset.part === partType));
}

function snappedMousePoint() {
  return {
    x: Math.floor(mouseX / GRID_SIZE) * GRID_SIZE,
    y: Math.floor(mouseY / GRID_SIZE) * GRID_SIZE,
  };
}

function enterBuildMode() {
  gameState.transitionTo(GameMode.BUILD);
  modeLabelEl.textContent = GameMode.BUILD;
  launchBtn.disabled = false;
  backToBuildBtn.disabled = true;
  craft = null;
}

function enterFlightMode() {
  buildSystem.connectivityPass(true);
  const blueprint = buildSystem.getCraftBlueprint();
  if (blueprint.length === 0) {
    return;
  }
  gameState.transitionTo(GameMode.FLIGHT);
  modeLabelEl.textContent = GameMode.FLIGHT;
  launchBtn.disabled = true;
  backToBuildBtn.disabled = false;
  heldPart = null;
  setActivePartButton(null);
  craft = physicsEngine.initializeCraft(blueprint);
  physicsSnapshot = physicsEngine.update(craft, 0);
}

partButtons.forEach((button) => {
  button.addEventListener('click', () => {
    heldPart = button.dataset.part;
    setActivePartButton(heldPart);
  });
});

canvas.addEventListener('mousemove', (event) => {
  if (!gameState.isBuildMode()) {
    return;
  }
  const mouse = getMousePos(canvas, event);
  mouseX = mouse.x;
  mouseY = mouse.y;
});

canvas.addEventListener('mousedown', (event) => {
  if (!gameState.isBuildMode()) {
    return;
  }
  const mouse = getMousePos(canvas, event);
  mouseX = mouse.x;
  mouseY = mouse.y;

  if (event.button === 0 && heldPart) {
    buildSystem.placeHeldPart(heldPart, mouseX, mouseY);
  }
  if (event.button === 2) {
    buildSystem.removeAt(mouseX, mouseY);
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (!gameState.isFlightMode() || !craft) {
    return;
  }
  if (event.key === 'Shift') {
    craft.throttle = Math.min(1, craft.throttle + 0.05);
  }
  if (event.key === 'Control') {
    craft.throttle = Math.max(0, craft.throttle - 0.05);
  }
});

launchBtn.addEventListener('click', enterFlightMode);
backToBuildBtn.addEventListener('click', () => {
  buildSystem.placeInitialPod();
  enterBuildMode();
});

window.addEventListener('resize', setCanvasSize);
setCanvasSize();
enterBuildMode();

let lastTime = performance.now();

function updateTelemetry() {
  if (gameState.isBuildMode()) {
    const parts = buildSystem.rocketParts;
    const mass = parts.reduce((acc, p) => acc + p.dryMass + p.fuel, 0);
    const fuel = parts.reduce((acc, p) => acc + p.fuel, 0);
    const cap = parts.reduce((acc, p) => acc + p.fuelCapacity, 0);
    altitudeEl.textContent = '0.0';
    velocityEl.textContent = '0.0';
    fuelEl.textContent = cap > 0 ? ((fuel / cap) * 100).toFixed(1) : '100.0';
    massEl.textContent = mass.toFixed(1);
    throttleEl.textContent = '0';
    return;
  }

  if (craft) {
    altitudeEl.textContent = Math.max(0, (physicsSnapshot.ground - physicsSnapshot.bounds.maxY) / PIXELS_PER_METER).toFixed(1);
    velocityEl.textContent = (craft.velocity.y / PIXELS_PER_METER).toFixed(1);
    fuelEl.textContent = (physicsSnapshot.fuelCapacity > 0 ? (physicsSnapshot.fuel / physicsSnapshot.fuelCapacity) * 100 : 0).toFixed(1);
    massEl.textContent = physicsSnapshot.mass.toFixed(1);
    throttleEl.textContent = Math.round(craft.throttle * 100).toString();
  }
}

function loop(now) {
  const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  if (gameState.isFlightMode() && craft) {
    physicsSnapshot = physicsEngine.update(craft, dt);
    renderer.drawFlight(craft, physicsSnapshot.centerOfMass);
  } else {
    renderer.drawBuild(buildSystem.rocketParts, heldPart ? PART_DEFS[heldPart] : null, heldPart ? snappedMousePoint() : null);
  }

  updateTelemetry();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
