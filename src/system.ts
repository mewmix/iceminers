import {
  Entity,
  activeEntities,
  getTransform,
  getNoiseEmitter,
  getWormAI,
  getSphereCollider,
} from "./ecs";

/** Noise System: increments worms alertLevel based on nearby noise emitters. */
export function noiseSystem(delta: number, wormEntity: Entity): void {
  const wormTransform = getTransform(wormEntity);
  const wormAi = getWormAI(wormEntity);
  if (!wormTransform || !wormAi) return;

  let maxNoise = 0;
  let loudestPosition: [number, number, number] | null = null;

  for (const e of activeEntities) {
    const emitter = getNoiseEmitter(e);
    const emitterTransform = getTransform(e);
    if (!emitter || !emitter.isEmitting || !emitterTransform) continue;

    const dx = emitterTransform.position[0] - wormTransform.position[0];
    const dy = emitterTransform.position[1] - wormTransform.position[1];
    const dz = emitterTransform.position[2] - wormTransform.position[2];
    const distSq = dx * dx + dy * dy + dz * dz + 1e-5;

    const effectiveNoise = emitter.baseNoise / distSq;
    if (effectiveNoise > maxNoise) {
      maxNoise = effectiveNoise;
      loudestPosition = [...emitterTransform.position];
    }
    wormAi.alertLevel += effectiveNoise * delta;
  }

  // Attack the loudest position when threshold is reached
  if (wormAi.alertLevel >= wormAi.threshold) {
    if (loudestPosition) {
      const dx = loudestPosition[0] - wormTransform.position[0];
      const dy = loudestPosition[1] - wormTransform.position[1];
      const dz = loudestPosition[2] - wormTransform.position[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      const speed = 5;
      wormTransform.velocity[0] = (dx / distance) * speed;
      wormTransform.velocity[1] = (dy / distance) * speed;
      wormTransform.velocity[2] = (dz / distance) * speed;
    }
    wormAi.alertLevel = 0;
  } else {
    // Gradually decay alert level
    wormAi.alertLevel = Math.max(0, wormAi.alertLevel - delta * 0.5);
  }
}

/** Collision System using a simple spatial grid. */
export function collisionSystem(delta: number): void {
  // Gather entities that have both Transform & SphereCollider
  const colliders = Array.from(activeEntities).filter((e) => {
    return getSphereCollider(e) && getTransform(e);
  });

  // Build grid
  const grid = new Map<string, Entity[]>();
  const CELL_SIZE = 5;

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

  // Check collisions in each cell and neighbors
  grid.forEach((entities, key) => {
    const [cx, cz] = key.split(",").map(Number);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighborKey = `${cx + dx},${cz + dz}`;
        const neighbors = grid.get(neighborKey) || [];

        for (const eA of entities) {
          for (const eB of neighbors) {
            // Avoid double-checks
            if (eA >= eB) continue;

            const tA = getTransform(eA)!;
            const tB = getTransform(eB)!;
            const cA = getSphereCollider(eA)!;
            const cB = getSphereCollider(eB)!;

            const distX = tA.position[0] - tB.position[0];
            const distY = tA.position[1] - tB.position[1];
            const distZ = tA.position[2] - tB.position[2];
            const distSq = distX * distX + distY * distY + distZ * distZ;
            const rSum = cA.radius + cB.radius;

            if (distSq <= rSum * rSum) {
              // Skip direct resolution for worm/player collision in this system;
              // the main loop handles the "gameOver" check.
              if (typeof window !== 'undefined') {
                const { player, worm } = window as any;
                if (
                  (eA === player && eB === worm) ||
                  (eA === worm && eB === player)
                ) {
                  // Let main.ts handle gameOver
                  continue;
                }
              }

              // Basic sphere collision resolution
              const dist = Math.sqrt(distSq) || 1;
              const overlap = (rSum - dist) / 2;
              const nx = distX / dist;
              const ny = distY / dist;
              const nz = distZ / dist;

              tA.position[0] += nx * overlap;
              tA.position[1] += ny * overlap;
              tA.position[2] += nz * overlap;
              tB.position[0] -= nx * overlap;
              tB.position[1] -= ny * overlap;
              tB.position[2] -= nz * overlap;

              // Elastic collision impulse
              const relVx = tA.velocity[0] - tB.velocity[0];
              const relVy = tA.velocity[1] - tB.velocity[1];
              const relVz = tA.velocity[2] - tB.velocity[2];
              const dot = relVx * nx + relVy * ny + relVz * nz;
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

/** AI System for worm wandering when not on alert. */
export function aiSystem(wormEntity: Entity, delta: number): void {
  const wormAI = getWormAI(wormEntity);
  const transform = getTransform(wormEntity);
  if (!wormAI || !transform) return;

  // Simple wandering if below half threshold
  if (wormAI.alertLevel < wormAI.threshold * 0.5) {
    transform.velocity[0] = Math.sin(performance.now() * 0.002) * 2;
    transform.velocity[2] = Math.cos(performance.now() * 0.002) * 2;
  }
}

