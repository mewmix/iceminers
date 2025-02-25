//main.ts
import {
  createEntity,
  addTransform,
  addNoiseEmitter,
  addWormAI,
  addThumper,
  getNoiseEmitter,
  addSphereCollider,
  addWormSegment,
  addIceDeposit,
  getTransform,
  activeEntities,
  Entity,
} from "./ecs";
import {
  collisionSystem,
  noiseSystem,
  aiSystem,
  wormBodySystem,
  miningSystem,
} from "./systems";
import { initRenderer } from "./renderer";

// Simple physics update (applies velocity to position)
function physicsSystem(delta: number) {
  for (const entity of activeEntities) {
    const t = getTransform(entity);
    if (t) {
      t.position[0] += t.velocity[0] * delta;
      t.position[1] += t.velocity[1] * delta;
      t.position[2] += t.velocity[2] * delta;
    }
  }
}

// Input state
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
      case "t":
        // Deploy a thumper at player's current location
        const playerT = getTransform(player);
        if (playerT) {
          const thumper = createEntity();
          addTransform(thumper, { position: [...playerT.position], velocity: [0, 0, 0] });
          addThumper(thumper, { noiseLevel: 1.0, active: true, duration: 5 });
          addSphereCollider(thumper, { radius: 0.5 });
        }
        break;
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
  const t = getTransform(player);
  const noise = getNoiseEmitter(player);
  if (!t || !noise) return;
  const speed = 5;
  t.velocity[0] = controls.moveX * speed;
  t.velocity[2] = controls.moveZ * speed;
  const isMoving = (controls.moveX !== 0 || controls.moveZ !== 0);
  if (isMoving && controls.mining) {
    noise.baseNoise = 0.2;
  } else if (isMoving) {
    noise.baseNoise = 0.05;
  } else if (controls.mining) {
    noise.baseNoise = 0.15;
  } else {
    noise.baseNoise = 0;
  }
  noise.isEmitting = noise.baseNoise > 0;
}

// Global entity references
let player: Entity;
let wormHead: Entity;
let renderer: ReturnType<typeof initRenderer>;
let gameOver = false;

function setupGame() {
  // Spawn the worm well below the ground (y=100) so it "emerges" when alerted
  wormHead = createEntity();
  addTransform(wormHead, { position: [0, 10, 0], velocity: [0, 0, 0] });
  addWormAI(wormHead, { alertLevel: 0, threshold: 5 });
  addSphereCollider(wormHead, { radius: 2 });
  addWormSegment(wormHead, { followDelay: 0 });
  const wormSegments: Entity[] = [wormHead];
  // Add two body segments for a simple segmented worm
  for (let i = 1; i < 3; i++) {
    const seg = createEntity();
    addTransform(seg, { position: [0, 100 + i * 1.5, 0], velocity: [0, 0, 0] });
    addSphereCollider(seg, { radius: 2 - i * 0.3 });
    addWormSegment(seg, { followDelay: i * 0.1, targetSegment: wormSegments[i - 1] });
    wormSegments.push(seg);
  }
  (window as any).wormSegments = wormSegments;
  (window as any).wormHead = wormHead;

  // Create the player
  player = createEntity();
  addTransform(player, { position: [0, 0, 0], velocity: [0, 0, 0] });
  addNoiseEmitter(player, { baseNoise: 0, isEmitting: false });
  addSphereCollider(player, { radius: 1 });
  (window as any).player = player;

  // Create an ice deposit resource
  const deposit = createEntity();
  addTransform(deposit, { position: [10, 0, 10], velocity: [0, 0, 0] });
  addIceDeposit(deposit, { amount: 100 });
  addSphereCollider(deposit, { radius: 2 });
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
    noiseSystem(deltaSec, wormHead);
    aiSystem(wormHead, deltaSec);
    wormBodySystem(deltaSec);
    miningSystem(deltaSec, player);

    // Check if worm head is close enough to the player for game over
    const pT = getTransform(player);
    const wT = getTransform(wormHead);
    if (pT && wT) {
      const dx = pT.position[0] - wT.position[0];
      const dy = pT.position[1] - wT.position[1];
      const dz = pT.position[2] - wT.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 3) gameOver = true;
    }

    renderer.render([...activeEntities], false);
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
}

main();

