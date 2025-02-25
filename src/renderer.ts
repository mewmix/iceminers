// src/renderer.ts
import * as THREE from "three";
import { Entity, getTransform, getSphereCollider, getNoiseEmitter } from "./ecs";

// HUD Elements
let hudContainer: HTMLDivElement;
let noiseMeter: HTMLDivElement;
let alertMeter: HTMLDivElement;
let radarCanvas: HTMLCanvasElement;

function createHUD() {
  // Container for all HUD elements
  hudContainer = document.createElement("div");
  hudContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    font-family: Arial, sans-serif;
  `;

  // Noise Level Meter
  noiseMeter = document.createElement("div");
  noiseMeter.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0,0,0,0.7);
    padding: 10px;
    color: white;
    border-radius: 5px;
  `;
  noiseMeter.innerHTML = `<div>Noise Level: <span id="noise-value">0%</span></div>
                          <div style="background: #333; height: 10px; margin-top: 5px;">
                            <div id="noise-bar" style="background: #4CAF50; height: 100%; width: 0%"></div>
                          </div>`;

  // Worm Alert Meter
  alertMeter = document.createElement("div");
  alertMeter.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.7);
    padding: 10px;
    color: white;
    border-radius: 5px;
  `;
  alertMeter.innerHTML = `<div>Worm Alert: <span id="alert-value">0%</span></div>
                          <div style="background: #333; height: 10px; margin-top: 5px;">
                            <div id="alert-bar" style="background: #F44336; height: 100%; width: 0%"></div>
                          </div>`;

  // Radar Display
  radarCanvas = document.createElement("canvas");
  radarCanvas.width = 150;
  radarCanvas.height = 150;
  radarCanvas.style.cssText = `
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(0,0,0,0.7);
    border-radius: 50%;
  `;

  hudContainer.appendChild(noiseMeter);
  hudContainer.appendChild(alertMeter);
  hudContainer.appendChild(radarCanvas);
  document.body.appendChild(hudContainer);
}

function updateHUD(
  noiseLevel: number,
  alertLevel: number,
  alertThreshold: number,
  playerPos: THREE.Vector3,
  wormPos: THREE.Vector3
) {
  // Update noise meter
  const noiseBar = noiseMeter.querySelector("#noise-bar") as HTMLElement;
  const noiseValue = noiseMeter.querySelector("#noise-value") as HTMLElement;
  const noisePercent = Math.min(100, Math.round(noiseLevel * 500));
  noiseBar.style.width = `${noisePercent}%`;
  noiseValue.textContent = `${noisePercent}%`;

  // Update alert meter
  const alertBar = alertMeter.querySelector("#alert-bar") as HTMLElement;
  const alertValue = alertMeter.querySelector("#alert-value") as HTMLElement;
  const alertPercent = Math.min(100, Math.round((alertLevel / alertThreshold) * 100));
  alertBar.style.width = `${alertPercent}%`;
  alertValue.textContent = `${alertPercent}%`;

  // Update radar
  const ctx = radarCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
  
  // Draw radar background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(75, 75, 75, 0, Math.PI * 2);
  ctx.fill();

  // Draw player
  ctx.fillStyle = "#4CAF50";
  ctx.beginPath();
  ctx.arc(75, 75, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw worm
  const direction = new THREE.Vector3()
    .subVectors(wormPos, playerPos)
    .normalize();
  const angle = Math.atan2(direction.z, direction.x);
  const distance = Math.min(1, playerPos.distanceTo(wormPos) / 100);
  
  ctx.fillStyle = "#F44336";
  ctx.beginPath();
  ctx.arc(
    75 + Math.cos(angle) * 65 * distance,
    75 + Math.sin(angle) * 65 * distance,
    8, 0, Math.PI * 2
  );
  ctx.fill();
}

export function initRenderer(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 100, 50);
  scene.add(directionalLight);

  // Fog
  scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

  // Icy terrain
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f8ff,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Camera follow
  const cameraOffset = new THREE.Vector3(0, 15, 20);
  const cameraTarget = new THREE.Vector3();

  // Entity management
  const entityMeshes = new Map<Entity, THREE.Mesh>();
  createHUD();
  
  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    scene,
    camera,
    renderer,
    entityMeshes,
    render: (entities: Entity[], gameOver: boolean) => {
      const player = (window as any).player;
      const worm = (window as any).wormHead;
      
      // Update camera
      const playerT = getTransform(player);
      if (playerT) {
        const playerPos = new THREE.Vector3(...playerT.position);
        camera.position.copy(playerPos).add(cameraOffset);
        cameraTarget.set(...playerT.position);
        camera.lookAt(cameraTarget);
      }

      // Update HUD
      const noiseEmitter = getNoiseEmitter(player);
      const wormAI = (window as any).wormAI;
      if (playerT && noiseEmitter && wormAI) {
        const wormPos = new THREE.Vector3(...getTransform(worm)?.position || [0, 0, 0]);
        updateHUD(
          noiseEmitter.baseNoise,
          wormAI.alertLevel,
          wormAI.threshold,
          new THREE.Vector3(...playerT.position),
          wormPos
        );
        
      }

      // Update entities
      entities.forEach(e => {
        const t = getTransform(e);
        const s = getSphereCollider(e);
        if (!t || !s) return;

        let mesh = entityMeshes.get(e);
        if (!mesh) {
          const geometry = new THREE.SphereGeometry(s.radius, 16, 16);
          const material = new THREE.MeshStandardMaterial({
            color: e === player ? 0xff0000 : 0x333333,
            metalness: 0.3,
            roughness: 0.8
          });
          mesh = new THREE.Mesh(geometry, material);
          entityMeshes.set(e, mesh);
          scene.add(mesh);
        }
        mesh.position.set(...t.position);
      });

      renderer.render(scene, camera);

      // Game over handling
      const gameOverEl = document.getElementById("game-over-overlay");
      if (gameOver) {
        if (!gameOverEl) {
          const overlay = document.createElement("div");
          overlay.id = "game-over-overlay";
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3em;
            pointer-events: none;
          `;
          overlay.textContent = "GAME OVER - WORM BREACH";
          document.body.appendChild(overlay);
        }
      } else if (gameOverEl) {
        gameOverEl.remove();
      }
    }
  };
}