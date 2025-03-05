// ecs.ts
export type Entity = number;

let nextEntityId = 0;
export const activeEntities = new Set<Entity>();

// Basic ECS Components
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

// Worm segment component for a multisegment worm
export interface WormSegment {
  followDelay: number;
  targetSegment?: Entity;
}

// Thumper component to distract the worm
export interface Thumper {
  noiseLevel: number;
  active: boolean;
  duration: number; // seconds before deactivation
}

// Ice deposit component resource to mine
export interface IceDeposit {
  amount: number;
}

// Crack component for ground sinking effect
export interface Crack {
  lifespan: number; // Time in seconds until the crack disappears
}

// Internal storage arrays
const transforms: Array<Transform | null> = [];
const noiseEmitters: Array<NoiseEmitter | null> = [];
const wormAIs: Array<WormAI | null> = [];
const sphereColliders: Array<SphereCollider | null> = [];
const wormSegments: Array<WormSegment | null> = [];
const thumpers: Array<Thumper | null> = [];
const iceDeposits: Array<IceDeposit | null> = [];
const cracks: Array<Crack | null> = []; // Added for Crack component

/** Create a new entity and reserve component slots. */
export function createEntity(): Entity {
  const e = nextEntityId++;
  activeEntities.add(e);
  transforms[e] = null;
  noiseEmitters[e] = null;
  wormAIs[e] = null;
  sphereColliders[e] = null;
  wormSegments[e] = null;
  thumpers[e] = null;
  iceDeposits[e] = null;
  cracks[e] = null; // Initialize Crack component slot
  return e;
}

/** Remove an entity and clear its components. */
export function removeEntity(e: Entity) {
  activeEntities.delete(e);
  transforms[e] = null;
  noiseEmitters[e] = null;
  wormAIs[e] = null;
  sphereColliders[e] = null;
  wormSegments[e] = null;
  thumpers[e] = null;
  iceDeposits[e] = null;
  cracks[e] = null; // Clear Crack component slot
}

/** Attach components. */
export function addTransform(e: Entity, c: Transform) { transforms[e] = c; }
export function addNoiseEmitter(e: Entity, c: NoiseEmitter) { noiseEmitters[e] = c; }
export function addWormAI(e: Entity, c: WormAI) { wormAIs[e] = c; }
export function addSphereCollider(e: Entity, c: SphereCollider) { sphereColliders[e] = c; }
export function addWormSegment(e: Entity, c: WormSegment) { wormSegments[e] = c; }
export function addThumper(e: Entity, c: Thumper) { thumpers[e] = c; }
export function addIceDeposit(e: Entity, c: IceDeposit) { iceDeposits[e] = c; }
export function addCrack(e: Entity, c: Crack) { cracks[e] = c; } // Added to attach Crack component

/** Component getters. */
export function getTransform(e: Entity) { return transforms[e]; }
export function getNoiseEmitter(e: Entity) { return noiseEmitters[e]; }
export function getWormAI(e: Entity) { return wormAIs[e]; }
export function getSphereCollider(e: Entity) { return sphereColliders[e]; }
export function getWormSegment(e: Entity) { return wormSegments[e]; }
export function getThumper(e: Entity) { return thumpers[e]; }
export function getIceDeposit(e: Entity) { return iceDeposits[e]; }
export function getCrack(e: Entity) { return cracks[e]; } // Added to retrieve Crack component