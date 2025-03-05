// main.ts
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
  getSphereCollider,
  getThumper,
  getIceDeposit,
  getWormSegment,
  addCrack,
  getCrack,
  removeEntity,
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

      // Prevent the player from sinking below the map
      if (entity === player && t.position[1] < 0) {
        t.position[1] = 0;
        t.velocity[1] = 0; // Stop downward movement
      }
    }
  }
}

// Input state
type ControlState = { moveX: number; moveZ: number; mining: boolean };
const controls: ControlState = { moveX: 0, moveZ: 0, mining: false };

// Game state
let thumperCount = 3; // Finite thumpers
let totalIceMined = 0; // Resource tracking
let roundTimeLeft = 60; // 60-second rounds
let roundNumber = 1;
let supplyDropTimer = 10; // Seconds until next supply drop
let wasUnderground = true; // Tracks if worm was underground last frame

// Detect Mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Decide which input to set up
function setupInput() {
  if (isMobileDevice()) {
    setupMobileControls();
  } else {
    setupDesktopControls();
  }
}

// Desktop controls
function setupDesktopControls() {
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
        controls.moveX = -1;
        break;
      case "ArrowRight":
        controls.moveX = 1;
        break;
      case "ArrowUp":
        controls.moveZ = -1;
        break;
      case "ArrowDown":
        controls.moveZ = 1;
        break;
      case " ":
        controls.mining = true;
        break;
      case "t":
        if (thumperCount > 0) {
          const playerT = getTransform(player);
          if (playerT) {
            const thumper = createEntity();
            addTransform(thumper, {
              position: [...playerT.position],
              velocity: [0, 0, 0],
            });
            addThumper(thumper, { noiseLevel: 1.0, active: true, duration: 5 });
            addSphereCollider(thumper, { radius: 0.5 });
            thumperCount--;
            console.log(`Thumper deployed! Remaining: ${thumperCount}`);
          }
        } else {
          console.log("No thumpers left!");
        }
        break;
    }
  });
  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
        controls.moveX = 0;
        break;
      case "ArrowUp":
      case "ArrowDown":
        controls.moveZ = 0;
        break;
      case " ":
        controls.mining = false;
        break;
    }
  });
}

// Minimal mobile controls example
function setupMobileControls() {
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      controls.mining = false;
    } else if (e.touches.length === 2) {
      controls.mining = true;
    }
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      controls.moveX = dx > 20 ? 1 : dx < -20 ? -1 : 0;
      controls.moveZ = dy > 20 ? 1 : dy < -20 ? -1 : 0;
    }
  });

  window.addEventListener("touchend", () => {
    controls.moveX = 0;
    controls.moveZ = 0;
    controls.mining = false;
  });
}

// Update player velocity and noise
function updatePlayer(player: Entity) {
  const t = getTransform(player);
  const noise = getNoiseEmitter(player);
  if (!t || !noise) return;

  const speed = 5;
  t.velocity[0] = controls.moveX * speed;
  t.velocity[2] = controls.moveZ * speed;

  const isMoving = controls.moveX !== 0 || controls.moveZ !== 0;
  if (isMoving && controls.mining) {
    noise.baseNoise = 0.5;
  } else if (isMoving) {
    noise.baseNoise = 0.2;
  } else if (controls.mining) {
    noise.baseNoise = 0.3;
  } else {
    noise.baseNoise = 0;
  }
  noise.isEmitting = noise.baseNoise > 0;
  console.log(`isMoving: ${isMoving}, baseNoise: ${noise.baseNoise}`);
}

// Handle supply drops
function supplyDropSystem(delta: number) {
  supplyDropTimer -= delta;
  if (supplyDropTimer <= 0) {
    const drop = createEntity();
    const x = (Math.random() - 0.5) * 50; // Random x within ±25
    const z = (Math.random() - 0.5) * 50; // Random z within ±25
    addTransform(drop, { position: [x, 0, z], velocity: [0, 0, 0] });
    addSphereCollider(drop, { radius: 1 });
    console.log(`Supply drop spawned at [${x.toFixed(2)}, 0, ${z.toFixed(2)}]`);
    supplyDropTimer = 15 + Math.random() * 10; // Reset timer (15-25s)
  }

  // Check player collision with supply drops
  const playerT = getTransform(player);
  if (!playerT) return;

  for (const e of activeEntities) {
    const t = getTransform(e);
    const c = getSphereCollider(e);
    if (!t || !c || e === player || getThumper(e) || getIceDeposit(e) || getWormSegment(e)) continue;

    const dx = t.position[0] - playerT.position[0];
    const dy = t.position[1] - playerT.position[1];
    const dz = t.position[2] - playerT.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < c.radius + 1) { // Player radius = 1
      thumperCount += 2;
      activeEntities.delete(e);
      console.log(`Collected supply drop! Thumpers: ${thumperCount}`);
    }
  }
}

// Main ship mining
function mainShipSystem(delta: number, mainShip: Entity) {
  const t = getTransform(mainShip);
  const noise = getNoiseEmitter(mainShip);
  if (!t || !noise) return;

  noise.baseNoise = 0.4; // Constant noise from mining
  noise.isEmitting = true;

  // Auto-mine nearby ice deposits
  for (const e of activeEntities) {
    const deposit = getIceDeposit(e);
    const depositT = getTransform(e);
    if (!deposit || !depositT) continue;

    const dx = depositT.position[0] - t.position[0];
    const dz = depositT.position[2] - t.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 10) { // Mining range
      const mineRate = 5 * delta;
      deposit.amount -= mineRate;
      totalIceMined += mineRate;
      if (deposit.amount <= 0) {
        activeEntities.delete(e);
      }
      console.log(`Main ship mined ice! Total: ${totalIceMined.toFixed(2)}`);
    }
  }
}

// Global entity references
let player: Entity;
let wormHead: Entity;
let mainShip: Entity;
let renderer: ReturnType<typeof initRenderer>;
let gameOver = false;

function setupGame() {
  // Spawn the worm
  wormHead = createEntity();
  addTransform(wormHead, { position: [0, -100, 0], velocity: [0, 0, 0] });
  addWormAI(wormHead, { alertLevel: 0, threshold: 1 });
  addSphereCollider(wormHead, { radius: 2 });
  addWormSegment(wormHead, { followDelay: 0 });
  const wormSegments: Entity[] = [wormHead];
  for (let i = 1; i < 3; i++) {
    const seg = createEntity();
    addTransform(seg, {
      position: [0, -100 - i * 1.5, 0],
      velocity: [0, 0, 0],
    });
    addSphereCollider(seg, { radius: 2 - i * 0.3 });
    addWormSegment(seg, {
      followDelay: i * 0.1,
      targetSegment: wormSegments[i - 1],
    });
    wormSegments.push(seg);
  }
  (window as any).wormSegments = wormSegments;
  (window as any).wormHead = wormHead;

  // Create the player at a safer distance from the worm
  player = createEntity();
  addTransform(player, { position: [50, 0, 50], velocity: [0, 0, 0] }); // Moved farther away
  addNoiseEmitter(player, { baseNoise: 0, isEmitting: false });
  addSphereCollider(player, { radius: 1 });
  (window as any).player = player;

  // Create the main ship (miner)
  mainShip = createEntity();
  addTransform(mainShip, { position: [0, 0, 0], velocity: [0, 0, 0] });
  addNoiseEmitter(mainShip, { baseNoise: 0.4, isEmitting: true });
  addSphereCollider(mainShip, { radius: 3 });
  (window as any).mainShip = mainShip;

  // Create initial ice deposits
  for (let i = 0; i < 3; i++) {
    const deposit = createEntity();
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    addTransform(deposit, { position: [x, 0, z], velocity: [0, 0, 0] });
    addIceDeposit(deposit, { amount: 100 });
    addSphereCollider(deposit, { radius: 2 });
  }
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

    // Update game state
    roundTimeLeft -= deltaSec;
    if (roundTimeLeft <= 0) {
      console.log(`Round ${roundNumber} Over! Ice Mined: ${totalIceMined.toFixed(2)}`);
      roundNumber++;
      roundTimeLeft = 60;
      const wormT = getTransform(wormHead);
      if (wormT) wormT.position = [0, -100, 0];
      thumperCount = Math.min(thumperCount + 1, 5);
    }

    updatePlayer(player);
    physicsSystem(deltaSec);
    collisionSystem(deltaSec);
    noiseSystem(deltaSec, wormHead);
    aiSystem(wormHead, deltaSec);
    wormBodySystem(deltaSec);
    miningSystem(deltaSec, player);
    supplyDropSystem(deltaSec);
    mainShipSystem(deltaSec, mainShip);

    // Detect worm emergence and spawn cracks
    const wT = getTransform(wormHead);
    if (wT) {
      if (wasUnderground && wT.position[1] >= 0) {
        // Worm has emerged! Spawn crack objects
        for (let i = 0; i < 5; i++) {
          const crack = createEntity();
          const offsetX = (Math.random() - 0.5) * 10; // Random spread within ±5 units
          const offsetZ = (Math.random() - 0.5) * 10;
          addTransform(crack, {
            position: [wT.position[0] + offsetX, 0, wT.position[2] + offsetZ],
            velocity: [0, 0, 0],
          });
          addCrack(crack, { lifespan: 2 }); // Cracks last 2 seconds
          addSphereCollider(crack, { radius: 0.5 }); // Small size
        }
        wasUnderground = false;
      } else if (wT.position[1] < 0) {
        wasUnderground = true;
      }
    }

    // Update cracks
    for (const e of activeEntities) {
      const crack = getCrack(e);
      if (crack) {
        crack.lifespan -= deltaSec;
        if (crack.lifespan <= 0) {
          removeEntity(e);
        }
      }
    }

    // Check if worm head is close to main ship or player
    const pT = getTransform(player);
    const mT = getTransform(mainShip);
    if (pT && wT) {
      const dxP = pT.position[0] - wT.position[0];
      const dyP = pT.position[1] - wT.position[1];
      const dzP = pT.position[2] - wT.position[2];
      if (Math.sqrt(dxP * dxP + dyP * dyP + dzP * dzP) < 3) gameOver = true;
    }
    if (mT && wT) {
      const dxM = mT.position[0] - wT.position[0];
      const dyM = mT.position[1] - wT.position[1];
      const dzM = mT.position[2] - wT.position[2];
      if (Math.sqrt(dxM * dxM + dyM * dyM + dzM * dzM) < 5) gameOver = true;
    }

    renderer.render([...activeEntities], false);
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
}

main();