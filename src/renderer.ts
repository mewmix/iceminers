import * as THREE from "three";
import {
  Entity,
  getTransform,
  getSphereCollider,
  getNoiseEmitter,
  getCrack,
  getWormAI,
} from "./ecs";

let hudContainer: HTMLDivElement;
let noiseMeter: HTMLDivElement;
let alertMeter: HTMLDivElement;
let radarCanvas: HTMLCanvasElement;
let iceMinedDisplay: HTMLDivElement;
let thumperCountDisplay: HTMLDivElement;

function createHUD() {
  hudContainer = document.createElement("div");
  hudContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    font-family: Arial, sans-serif;
  `;

  noiseMeter = document.createElement("div");
  noiseMeter.style.cssText = `
    position: absolute;
    top: 2%;
    left: 2%;
    background: rgba(0,0,0,0.7);
    padding: 10px;
    color: white;
    border-radius: 5px;
    font-size: min(2vw, 16px);
  `;
  noiseMeter.innerHTML = `<div>Noise Level: <span id="noise-value">0%</span></div>
                          <div style="background: #333; height: 10px; margin-top: 5px;">
                            <div id="noise-bar" style="background: #4CAF50; height: 100%; width: 0%"></div>
                          </div>`;

  alertMeter = document.createElement("div");
  alertMeter.style.cssText = `
    position: absolute;
    top: 2%;
    right: 2%;
    background: rgba(0,0,0,0.7);
    padding: 10px;
    color: white;
    border-radius: 5px;
    font-size: min(2vw, 16px);
  `;
  alertMeter.innerHTML = `<div>Worm Alert: <span id="alert-value">0%</span></div>
                          <div style="background: #333; height: 10px; margin-top: 5px;">
                            <div id="alert-bar" style="background: #F44336; height: 100%; width: 0%"></div>
                          </div>`;

  radarCanvas = document.createElement("canvas");
  radarCanvas.width = 150;
  radarCanvas.height = 150;
  radarCanvas.style.cssText = `
    position: absolute;
    bottom: 2%;
    right: 2%;
    background: rgba(0,0,0,0.7);
    border-radius: 50%;
    width: min(20vw, 150px);
    height: min(20vw, 150px);
  `;

  iceMinedDisplay = document.createElement("div");
  iceMinedDisplay.style.cssText = `
    position: absolute;
    top: 10%;
    left: 2%;
    background: rgba(0,0,0,0.7);
    padding: 5px;
    color: white;
    border-radius: 5px;
    font-size: min(2vw, 16px);
  `;
  iceMinedDisplay.innerHTML = `Ice Mined: <span id="ice-mined">0</span>`;

  thumperCountDisplay = document.createElement("div");
  thumperCountDisplay.style.cssText = `
    position: absolute;
    top: 15%;
    left: 2%;
    background: rgba(0,0,0,0.7);
    padding: 5px;
    color: white;
    border-radius: 5px;
    font-size: min(2vw, 16px);
  `;
  thumperCountDisplay.innerHTML = `Thumpers: <span id="thumper-count">3</span>`;

  hudContainer.appendChild(noiseMeter);
  hudContainer.appendChild(alertMeter);
  hudContainer.appendChild(radarCanvas);
  hudContainer.appendChild(iceMinedDisplay);
  hudContainer.appendChild(thumperCountDisplay);
  document.body.appendChild(hudContainer);
}

function updateHUD(
  noiseLevel: number,
  alertLevel: number,
  alertThreshold: number,
  playerPos: THREE.Vector3,
  wormPos: THREE.Vector3,
  mainShipPos: THREE.Vector3,
  iceMined: number,
  thumperCount: number
) {
  const noiseBar = noiseMeter.querySelector("#noise-bar") as HTMLElement;
  const noiseValue = noiseMeter.querySelector("#noise-value") as HTMLElement;
  const noisePercent = Math.min(100, Math.round(noiseLevel * 500));
  noiseBar.style.width = `${noisePercent}%`;
  noiseValue.textContent = `${noisePercent}%`;

  const alertBar = alertMeter.querySelector("#alert-bar") as HTMLElement;
  const alertValue = alertMeter.querySelector("#alert-value") as HTMLElement;
  const alertPercent = Math.min(100, Math.round((alertLevel / alertThreshold) * 100));
  alertBar.style.width = `${alertPercent}%`;
  alertValue.textContent = `${alertPercent}%`;

  const ctx = radarCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(75, 75, 75, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4CAF50";
  ctx.beginPath();
  ctx.arc(75, 75, 5, 0, Math.PI * 2);
  ctx.fill();

  const wormDirection = new THREE.Vector3().subVectors(wormPos, playerPos).normalize();
  const wormAngle = Math.atan2(wormDirection.z, wormDirection.x);
  const wormDistance = Math.min(1, playerPos.distanceTo(wormPos) / 100);
  ctx.fillStyle = "#F44336";
  ctx.beginPath();
  ctx.arc(
    75 + Math.cos(wormAngle) * 65 * wormDistance,
    75 + Math.sin(wormAngle) * 65 * wormDistance,
    8,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const shipDirection = new THREE.Vector3().subVectors(mainShipPos, playerPos).normalize();
  const shipAngle = Math.atan2(shipDirection.z, shipDirection.x);
  const shipDistance = Math.min(1, playerPos.distanceTo(mainShipPos) / 100);
  ctx.fillStyle = "#FFFF00";
  ctx.beginPath();
  ctx.arc(
    75 + Math.cos(shipAngle) * 65 * shipDistance,
    75 + Math.sin(shipAngle) * 65 * shipDistance,
    6,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const iceMinedSpan = iceMinedDisplay.querySelector("#ice-mined") as HTMLSpanElement;
  if (iceMinedSpan) iceMinedSpan.textContent = iceMined.toFixed(2);

  const thumperCountSpan = thumperCountDisplay.querySelector("#thumper-count") as HTMLSpanElement;
  if (thumperCountSpan) thumperCountSpan.textContent = thumperCount.toString();
}

export function initRenderer(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Initial camera position to see the intro
  camera.position.set(0, 30, 40);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 100, 50);
  scene.add(directionalLight);

  scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f8ff,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const cameraOffset = new THREE.Vector3(0, 15, 20);
  const cameraTarget = new THREE.Vector3();
  const entityMeshes = new Map<Entity, THREE.Mesh>();
  createHUD();

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
    render: (entities: Entity[], gameOver: boolean, iceMined: number, thumperCount: number) => {
      const player = (window as any).player;
      const worm = (window as any).wormHead;
      const mainShip = (window as any).mainShip;

      // Update camera
      const playerT = getTransform(player);
      const shipT = getTransform(mainShip);
      if (playerT) {
        const playerPos = new THREE.Vector3(...playerT.position);
        camera.position.copy(playerPos).add(cameraOffset);
        cameraTarget.set(...playerT.position);
        camera.lookAt(cameraTarget);
      } else if (shipT) {
        // During intro, track the main ship
        const shipPos = new THREE.Vector3(...shipT.position);
        camera.position.set(shipPos.x + 30, shipPos.y + 50, shipPos.z + 40);
        camera.lookAt(shipPos.x, 0, shipPos.z);
      }

      const noiseEmitter = getNoiseEmitter(player);
      const wormAI = getWormAI(worm);
      if (playerT && noiseEmitter && wormAI) {
        const wormPos = new THREE.Vector3(...(getTransform(worm)?.position || [0, 0, 0]));
        const mainShipPos = new THREE.Vector3(...(getTransform(mainShip)?.position || [0, 0, 0]));
        updateHUD(
          noiseEmitter.baseNoise,
          wormAI.alertLevel,
          wormAI.threshold,
          new THREE.Vector3(...playerT.position),
          wormPos,
          mainShipPos,
          iceMined,
          thumperCount
        );
      }

      entities.forEach((e) => {
        const t = getTransform(e);
        const s = getSphereCollider(e);
        if (!t || !s) return;

        let mesh = entityMeshes.get(e);
        if (!mesh) {
          const geometry = e === mainShip ? new THREE.BoxGeometry(3, 3, 3) : new THREE.SphereGeometry(s.radius, 16, 16);
          const material = new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.8,
          });
          if (getCrack(e)) {
            material.color.set(0x555555);
            material.opacity = 0.5;
            material.transparent = true;
          } else if (e === player) {
            material.color.set(0xff0000);
          } else if (e === mainShip) {
            material.color.set(0xffff00);
          } else {
            material.color.set(0x333333);
          }
          mesh = new THREE.Mesh(geometry, material);
          entityMeshes.set(e, mesh);
          scene.add(mesh);
        }
        mesh.position.set(...t.position);
      });

      entityMeshes.forEach((mesh, e) => {
        if (!entities.includes(e)) {
          scene.remove(mesh);
          entityMeshes.delete(e);
        }
      });

      renderer.render(scene, camera);

      const gameOverEl = document.getElementById("game-over-overlay");
      if (gameOver) {
        if (!gameOverEl) {
          const overlay = document.createElement("div");
          overlay.id = "game-over-overlay";
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
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
    },
  };
}