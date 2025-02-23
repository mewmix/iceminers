import {
  createEntity,
  addTransform,
  addNoiseEmitter,
  addWormAI,
  addSphereCollider,
  getTransform,
  getNoiseEmitter,
  activeEntities,
  Entity,
} from "./ecs";

import { collisionSystem, noiseSystem, aiSystem } from "./system";
import { initRenderer } from "./renderer";

/** Simple physics update for movement. */
function physicsSystem(delta: number) {
  for (const entity of activeEntities) {
    const transform = getTransform(entity);
    if (transform) {
      transform.position[0] += transform.velocity[0] * delta;
      transform.position[1] += transform.velocity[1] * delta;
      transform.position[2] += transform.velocity[2] * delta;
    }
  }
}

// Input handling
type ControlState = { moveX: number; moveZ: number; mining: boolean };
const controls: ControlState = { moveX: 0, moveZ: 0, mining: false };

function setupInput() {
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":  controls.moveX = -1; break;
      case "ArrowRight": controls.moveX =  1; break;
      case "ArrowUp":    controls.moveZ = -1; break;
      case "ArrowDown":  controls.moveZ =  1; break;
      case " ":          controls.mining = true; break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight": controls.moveX = 0; break;
      case "ArrowUp":
      case "ArrowDown":  controls.moveZ = 0; break;
      case " ":          controls.mining = false; break;
    }
  });
}

function updatePlayer(player: Entity) {
  const transform = getTransform(player);
  const noise = getNoiseEmitter(player);
  if (!transform || !noise) return;

  const speed = 5;
  transform.velocity[0] = controls.moveX * speed;
  transform.velocity[2] = controls.moveZ * speed;

  noise.isEmitting = controls.mining;
  noise.baseNoise = controls.mining ? 0.2 : 0;
}

// Global references
let worm: Entity;
let player: Entity;
let renderer: ReturnType<typeof initRenderer>;
let gameOver = false;

/** Check direct collision between the player and worm for game over. */
function checkCollisions() {
  const pTransform = getTransform(player);
  const wTransform = getTransform(worm);
  if (!pTransform || !wTransform) return;

  const dx = pTransform.position[0] - wTransform.position[0];
  const dy = pTransform.position[1] - wTransform.position[1];
  const dz = pTransform.position[2] - wTransform.position[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Radii: 1 for player, 2 for worm (below).
  if (dist < 1 + 2) {
    gameOver = true;
  }
}

function setupGame() {
  worm = createEntity();
  addTransform(worm, { position: [0, -5, 0], velocity: [0, 0, 0] });
  addWormAI(worm, { alertLevel: 0, threshold: 5 });
  addSphereCollider(worm, { radius: 2 });

  player = createEntity();
  addTransform(player, { position: [0, 0, 0], velocity: [0, 0, 0] });
  addNoiseEmitter(player, { baseNoise: 0, isEmitting: false });
  addSphereCollider(player, { radius: 1 });

  // Expose globally for the renderer or collision checks if needed.
  (window as any).player = player;
  (window as any).worm = worm;
}

async function main() {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  renderer = initRenderer(canvas);

  setupInput();
  setupGame();

  let previousTime = performance.now();

  function gameLoop() {
    const now = performance.now();
    const deltaSec = (now - previousTime) / 1000;
    previousTime = now;

    if (gameOver) {
      renderer.render([...activeEntities], true);
      requestAnimationFrame(gameLoop);
      return;
    }

    updatePlayer(player);
    physicsSystem(deltaSec);
    collisionSystem(deltaSec);
    noiseSystem(deltaSec, worm);
    aiSystem(worm, deltaSec);
    checkCollisions();

    renderer.render([...activeEntities], false);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main();

