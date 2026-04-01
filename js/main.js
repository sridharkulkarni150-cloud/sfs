import { GameMode, GameState } from './stateManager.js';
import { BuildSystem, PART_DEFS } from './buildSystem.js';
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

const surfaceHeight = window.innerHeight - 100;
const gameState = new GameState();
const buildSystem = new BuildSystem(canvas);
const physicsEngine = new PhysicsEngine(surfaceHeight);
const renderer = new Renderer(canvas, ctx, surfaceHeight);

let craft = null;
let physicsSnapshot = {
  mass: 0,
  fuel: 0,
  fuelCapacity: 0,
  thrust: 0,
  centerOfMass: { x: 0, y: 0 },
  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
};

function setCanvasSize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  buildSystem.surfaceHeight = window.innerHeight - 100;
}

function setActivePartButton(selectedType) {
  partButtons.forEach((button) => {
    const active = button.dataset.part === selectedType;
    button.classList.toggle('selected', active);
  });
}

function enterBuildMode() {
  gameState.transitionTo(GameMode.BUILD);
  modeLabelEl.textContent = GameMode.BUILD;
  launchBtn.disabled = false;
  backToBuildBtn.disabled = true;
  craft = null;
  physicsSnapshot = {
    mass: 0,
    fuel: 0,
    fuelCapacity: 0,
    thrust: 0,
    centerOfMass: { x: 0, y: 0 },
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
}

function enterFlightMode() {
  const blueprint = buildSystem.getCraftBlueprint();
  if (blueprint.length === 0) {
    return;
  }
  gameState.transitionTo(GameMode.FLIGHT);
  modeLabelEl.textContent = GameMode.FLIGHT;
  launchBtn.disabled = true;
  backToBuildBtn.disabled = false;
  craft = physicsEngine.initializeCraft(blueprint);
  physicsSnapshot = physicsEngine.update(craft, 0);
}

partButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const partType = button.dataset.part;
    buildSystem.setSelectedPartType(partType);
    setActivePartButton(partType);
  });
});

setActivePartButton(buildSystem.selectedPartType);

canvas.addEventListener('mousemove', (event) => {
  if (!gameState.isBuildMode()) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  buildSystem.updateGhostFromMouse(event.clientX - rect.left, event.clientY - rect.top);
});

canvas.addEventListener('mousedown', (event) => {
  if (!gameState.isBuildMode()) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  if (event.button === 0) {
    buildSystem.addPartAtMouse(mx, my);
  }
  if (event.button === 2) {
    buildSystem.removePartAtMouse(mx, my);
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
  buildSystem.resetToBuildFromFlight();
  enterBuildMode();
});

window.addEventListener('resize', setCanvasSize);
setCanvasSize();
enterBuildMode();

let lastTime = performance.now();

function updateTelemetry() {
  if (gameState.isBuildMode()) {
    const parts = buildSystem.getCraftBlueprint();
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
    const altitudeMeters = Math.max(0, (surfaceHeight - physicsSnapshot.bounds.maxY) / PIXELS_PER_METER);
    const velMeters = craft.velocity.y / PIXELS_PER_METER;
    const fuelPct = physicsSnapshot.fuelCapacity > 0 ? (physicsSnapshot.fuel / physicsSnapshot.fuelCapacity) * 100 : 0;
    altitudeEl.textContent = altitudeMeters.toFixed(1);
    velocityEl.textContent = velMeters.toFixed(1);
    fuelEl.textContent = fuelPct.toFixed(1);
    massEl.textContent = physicsSnapshot.mass.toFixed(1);
    throttleEl.textContent = Math.round(craft.throttle * 100).toString();
  }
}

function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(0.033, Math.max(0.001, rawDt));
  lastTime = now;

  if (gameState.isFlightMode() && craft) {
    physicsSnapshot = physicsEngine.update(craft, dt);
    renderer.drawFlight(craft, physicsSnapshot.centerOfMass);
  } else {
    renderer.drawBuild(buildSystem.parts, buildSystem.ghostCell, PART_DEFS[buildSystem.selectedPartType]);
  }

  updateTelemetry();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
