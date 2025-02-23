export type Entity = number;

let nextEntityId = 0;
export const activeEntities = new Set<Entity>();

// Basic Components
export interface Transform {
  position: [number, number, number];
  velocity: [number, number, number];
}

export interface NoiseEmitter {
  baseNoise: number;
  isEmitting: boolean;
}

export interface WormAI {
  alertLevel: number;
  threshold: number;
}

export interface SphereCollider {
  radius: number;
}

// Storage arrays indexed by entity ID
const transforms: Array<Transform | null> = [];
const noiseEmitters: Array<NoiseEmitter | null> = [];
const wormAIs: Array<WormAI | null> = [];
const sphereColliders: Array<SphereCollider | null> = [];

/** Create a new entity and reserve component slots. */
export function createEntity(): Entity {
  const e = nextEntityId++;
  activeEntities.add(e);
  transforms[e] = null;
  noiseEmitters[e] = null;
  wormAIs[e] = null;
  sphereColliders[e] = null;
  return e;
}

/** Remove entity and clear its components. */
export function removeEntity(e: Entity) {
  activeEntities.delete(e);
  transforms[e] = null;
  noiseEmitters[e] = null;
  wormAIs[e] = null;
  sphereColliders[e] = null;
}

/** Add components. */
export function addTransform(e: Entity, c: Transform) { transforms[e] = c; }
export function addNoiseEmitter(e: Entity, c: NoiseEmitter) { noiseEmitters[e] = c; }
export function addWormAI(e: Entity, c: WormAI) { wormAIs[e] = c; }
export function addSphereCollider(e: Entity, c: SphereCollider) { sphereColliders[e] = c; }

/** Getters. */
export function getTransform(e: Entity) { return transforms[e]; }
export function getNoiseEmitter(e: Entity) { return noiseEmitters[e]; }
export function getWormAI(e: Entity) { return wormAIs[e]; }
export function getSphereCollider(e: Entity) { return sphereColliders[e]; }

