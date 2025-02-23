// src/systems.ts

import {
  Entity,
  activeEntities,
  getTransform,
  getNoiseEmitter,
  getWormAI,
  getSphereCollider,
} from "./ecs";

// 1. Noise System with Distance Attenuation
export function noiseSystem(delta: number, wormEntity: Entity): void {
  const wormTransform = getTransform(wormEntity);
  const wormAi = getWormAI(wormEntity);
  if (!wormTransform || !wormAi) return;

  let maxNoise = 0;
  let loudestPosition: [number, number, number] | null = null;

  // Proper Set iteration with type conversion
  activeEntities.forEach((e: Entity) => {
    const emitter = getNoiseEmitter(e);
    const emitterTransform = getTransform(e);
    if (!emitter || !emitter.isEmitting || !emitterTransform) return;

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
  });

  // Threshold check remains the same
  if (wormAi.alertLevel >= wormAi.threshold) {
    console.log("Worm attacking noise source!");
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
    wormAi.alertLevel = Math.max(0, wormAi.alertLevel - delta * 0.5);
  }
}

// 2. Collision System (Fixed)
export function collisionSystem(delta: number): void {
  // Convert Set to Array with proper typing
  const colliders = Array.from(activeEntities).filter((e: Entity) => 
    getSphereCollider(e) && getTransform(e)
  );

  // Spatial grid implementation
  const grid = new Map<string, Entity[]>();
  const CELL_SIZE = 5;

  colliders.forEach((e: Entity) => {
    const t = getTransform(e)!;
    const cellX = Math.floor(t.position[0] / CELL_SIZE);
    const cellZ = Math.floor(t.position[2] / CELL_SIZE);
    const key = `${cellX},${cellZ}`;
    
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(e);
  });

  grid.forEach((entities: Entity[], key: string) => {
    const [x, z] = key.split(',').map(Number);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighborKey = `${x + dx},${z + dz}`;
        const neighbors = grid.get(neighborKey) || [];
        
        entities.forEach((eA: Entity) => {
          neighbors.forEach((eB: Entity) => {
            if (eA >= eB) return;

            const tA = getTransform(eA)!;
            const tB = getTransform(eB)!;
            const cA = getSphereCollider(eA)!;
            const cB = getSphereCollider(eB)!;

            // Collision detection logic remains the same
            const dx = tA.position[0] - tB.position[0];
            const dy = tA.position[1] - tB.position[1];
            const dz = tA.position[2] - tB.position[2];
            const distSq = dx * dx + dy * dy + dz * dz;
            const rSum = cA.radius + cB.radius;

            if (distSq <= rSum * rSum) {
              // Collision resolution logic remains the same
              const dist = Math.sqrt(distSq) || 1;
              const overlap = (rSum - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;

              tA.position[0] += nx * overlap;
              tA.position[1] += ny * overlap;
              tA.position[2] += nz * overlap;
              tB.position[0] -= nx * overlap;
              tB.position[1] -= ny * overlap;
              tB.position[2] -= nz * overlap;

              const vA = tA.velocity;
              const vB = tB.velocity;
              const relVx = vA[0] - vB[0];
              const relVy = vA[1] - vB[1];
              const relVz = vA[2] - vB[2];
              const dot = relVx * nx + relVy * ny + relVz * nz;
              
              if (dot > 0) return;
              
              const impulse = 2 * dot;
              vA[0] -= impulse * nx;
              vA[1] -= impulse * ny;
              vA[2] -= impulse * nz;
              vB[0] += impulse * nx;
              vB[1] += impulse * ny;
              vB[2] += impulse * nz;
            }
          });
        });
      }
    }
  });
}

// 3. AI System (No changes needed)
export function aiSystem(wormEntity: Entity, delta: number): void {
  const wormAI = getWormAI(wormEntity);
  const transform = getTransform(wormEntity);
  if (!wormAI || !transform) return;

  if (wormAI.alertLevel < wormAI.threshold * 0.5) {
    transform.velocity[0] = Math.sin(performance.now() * 0.002) * 2;
    transform.velocity[2] = Math.cos(performance.now() * 0.002) * 2;
  }
}
