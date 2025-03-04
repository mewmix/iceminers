// systems.ts

import {
  Entity,
  activeEntities,
  getTransform,
  getNoiseEmitter,
  getWormAI,
  getSphereCollider,
  getWormSegment,
  getThumper,
  getIceDeposit,
  removeEntity,
} from "./ecs";

export function noiseSystem(delta: number, wormEntity: Entity): void {
  const wormT = getTransform(wormEntity);
  const wormAI = getWormAI(wormEntity);
  if (!wormT || !wormAI) return;

  let maxNoise = 0;
  let loudestPos: [number, number, number] | null = null;

  for (const e of activeEntities) {
    const emitter = getNoiseEmitter(e);
    const thumper = getThumper(e);
    const et = getTransform(e);
    if ((!emitter || !emitter.isEmitting) && !thumper) continue;
    if (!et) continue;

    let noise = emitter ? emitter.baseNoise : 0;
    if (thumper && thumper.active) {
      noise = thumper.noiseLevel;
      thumper.duration -= delta;
      if (thumper.duration <= 0) thumper.active = false;
    }

    const dx = et.position[0] - wormT.position[0];
    const dy = et.position[1] - wormT.position[1];
    const dz = et.position[2] - wormT.position[2];
    const distSq = dx * dx + dy * dy + dz * dz + 1e-5;
    const effectiveNoise = (noise * 100) / distSq; // Amplify noise impact

    if (effectiveNoise > maxNoise) {
      maxNoise = effectiveNoise;
      loudestPos = [...et.position];
    }
    wormAI.alertLevel += effectiveNoise * delta;
    console.log(`Entity ${e}: noise=${noise}, effectiveNoise=${effectiveNoise.toFixed(5)}, alertLevel=${wormAI.alertLevel.toFixed(2)}`); // Debug
  }

  if (wormAI.alertLevel >= wormAI.threshold && loudestPos) {
    const dx = loudestPos[0] - wormT.position[0];
    const dy = loudestPos[1] - wormT.position[1];
    const dz = loudestPos[2] - wormT.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const speed = 5;
    wormT.velocity[0] = (dx / dist) * speed;
    wormT.velocity[1] = (dy / dist) * speed;
    wormT.velocity[2] = (dz / dist) * speed;
    console.log(`Worm chasing: pos=${loudestPos}, vel=[${wormT.velocity[0]}, ${wormT.velocity[1]}, ${wormT.velocity[2]}]`); // Debug
  } else {
    wormAI.alertLevel = Math.max(0, wormAI.alertLevel - delta * 0.5);
  }
}
/** Collision system with a simple spatial grid. */
export function collisionSystem(delta: number): void {
  // Grab entities with both transform and collider
  const colliders = Array.from(activeEntities).filter(
    (e) => getTransform(e) && getSphereCollider(e)
  );

  const grid = new Map<string, Entity[]>();
  const CELL_SIZE = 5;

  // Populate grid
  for (const e of colliders) {
    const t = getTransform(e)!;
    const cellX = Math.floor(t.position[0] / CELL_SIZE);
    const cellZ = Math.floor(t.position[2] / CELL_SIZE);
    const key = `${cellX},${cellZ}`;
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(e);
  }

  // Check collisions in each cell & neighbors
  grid.forEach((cellEntities, key) => {
    const [cx, cz] = key.split(",").map(Number);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighborKey = `${cx + dx},${cz + dz}`;
        const neighbors = grid.get(neighborKey) || [];

        for (const eA of cellEntities) {
          for (const eB of neighbors) {
            if (eA >= eB) continue; // avoid double checks

            const tA = getTransform(eA)!;
            const tB = getTransform(eB)!;
            const cA = getSphereCollider(eA)!;
            const cB = getSphereCollider(eB)!;

            // Skip collisions for worm body segments with each other
            const { wormSegments, player, wormHead } = window as any;
            if (wormSegments?.includes(eA) && wormSegments?.includes(eB)) {
              continue;
            }
            // Skip direct collision resolution for worm head / player,
            // main.ts checks it for gameOver
            if (
              (eA === wormHead && eB === player) ||
              (eA === player && eB === wormHead)
            ) {
              continue;
            }

            // Sphere-sphere intersection
            const distX = tA.position[0] - tB.position[0];
            const distY = tA.position[1] - tB.position[1];
            const distZ = tA.position[2] - tB.position[2];
            const distSq = distX * distX + distY * distY + distZ * distZ;
            const rSum = cA.radius + cB.radius;

            if (distSq <= rSum * rSum) {
              const dist = Math.sqrt(distSq) || 1;
              const overlap = (rSum - dist) / 2;
              const nx = distX / dist;
              const ny = distY / dist;
              const nz = distZ / dist;

              // Push them apart
              tA.position[0] += nx * overlap;
              tA.position[1] += ny * overlap;
              tA.position[2] += nz * overlap;
              tB.position[0] -= nx * overlap;
              tB.position[1] -= ny * overlap;
              tB.position[2] -= nz * overlap;

              // Elastic collision impulse
              const rvx = tA.velocity[0] - tB.velocity[0];
              const rvy = tA.velocity[1] - tB.velocity[1];
              const rvz = tA.velocity[2] - tB.velocity[2];
              const dot = rvx * nx + rvy * ny + rvz * nz;
              if (dot > 0) continue;

              const impulse = 2 * dot;
              tA.velocity[0] -= impulse * nx;
              tA.velocity[1] -= impulse * ny;
              tA.velocity[2] -= impulse * nz;
              tB.velocity[0] += impulse * nx;
              tB.velocity[1] += impulse * ny;
              tB.velocity[2] += impulse * nz;
            }
          }
        }
      }
    }
  });
}

/**
 * AI system: makes the worm emerge from below and wander when not alerted.
 * When alertLevel > 0 and the worm is below ground (y > 0), force it to ascend.
 */
export function aiSystem(wormEntity: Entity, delta: number): void {
  const wormAI = getWormAI(wormEntity);
  const t = getTransform(wormEntity);
  if (!wormAI || !t) return;

  if (wormAI.alertLevel < wormAI.threshold) {
    t.velocity[0] = Math.sin(performance.now() * 0.002) * 10;
    t.velocity[2] = Math.cos(performance.now() * 0.002) * 10;
    // Move toward y=0
    const targetY = 0;
    const dy = targetY - t.position[1];
    t.velocity[1] = dy * 5; // Smoothly adjust to surface level
  }
}

/** Worm body system: each segment follows the previous with a springy motion. */
export function wormBodySystem(delta: number): void {
  const { wormSegments } = window as any;
  if (!wormSegments || wormSegments.length < 2) return;

  for (let i = 1; i < wormSegments.length; i++) {
    const seg = wormSegments[i];
    const segComp = getWormSegment(seg);
    if (!segComp?.targetSegment) continue;

    const tSeg = getTransform(seg);
    const tTarget = getTransform(segComp.targetSegment);
    if (!tSeg || !tTarget) continue;

    // Spring approach from seg to segComp.targetSegment
    const dx = tTarget.position[0] - tSeg.position[0];
    const dy = tTarget.position[1] - tSeg.position[1];
    const dz = tTarget.position[2] - tSeg.position[2];

    // Tweak these values to tune the "springiness"
    const springStrength = 10;
    const damping = 5;

    // Distance factor
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const forceX = (dx / dist) * springStrength;
    const forceY = (dy / dist) * springStrength;
    const forceZ = (dz / dist) * springStrength;

    // Apply "spring - damping" to velocity
    tSeg.velocity[0] += (forceX - tSeg.velocity[0] * damping) * delta;
    tSeg.velocity[1] += (forceY - tSeg.velocity[1] * damping) * delta;
    tSeg.velocity[2] += (forceZ - tSeg.velocity[2] * damping) * delta;
  }
}

/** Mining system: allows the player to mine ice deposits within range. */
export function miningSystem(delta: number, player: Entity): void {
  // We assume a 'controls' object is globally accessible, or adapt as needed
  const { controls } = window as any;
  if (!controls?.mining) return;

  const playerT = getTransform(player);
  const noise = getNoiseEmitter(player);
  if (!playerT || !noise) return;

  for (const e of activeEntities) {
    const deposit = getIceDeposit(e);
    const depositT = getTransform(e);
    if (!deposit || !depositT) continue;

    // Check distance in XZ plane or fully 3D as you prefer
    const dx = depositT.position[0] - playerT.position[0];
    const dz = depositT.position[2] - playerT.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Mine if close enough
    if (dist < 5) {
      deposit.amount -= delta * 10;
      if (deposit.amount <= 0) {
        removeEntity(e);
      }
      console.log(`Mined ice! Remaining: ${deposit.amount.toFixed(2)}`);
    }
  }
}

