//renderer.ts
import * as THREE from "three";
import { Entity, getTransform, getSphereCollider } from "./ecs";

export function initRenderer(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height);

  // Create an icy terrain (a large plane)
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f8ff,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 100, 50);
  scene.add(directionalLight);

  // Set up the camera
  camera.position.set(0, 50, 100);
  camera.lookAt(0, 0, 0);

  // Map of entity meshes
  const entityMeshes = new Map<Entity, THREE.Mesh>();

  return {
    scene,
    camera,
    renderer,
    entityMeshes,
    render: (entities: Entity[], gameOver: boolean) => {
      // Update entity meshes based on ECS positions
      for (const e of entities) {
        const t = getTransform(e);
        const s = getSphereCollider(e);
        if (!t || !s) continue;

        let mesh = entityMeshes.get(e);
        if (!mesh) {
          const geometry = new THREE.SphereGeometry(s.radius, 16, 16);
          // Use red for the player; use a gray tone for worm segments; default otherwise.
          let color = 0x333333;
          if ((window as any).player === e) color = 0xff0000;
          else if ((window as any).wormSegments && (window as any).wormSegments.includes(e))
            color = 0x888888;
          mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({ color })
          );
          entityMeshes.set(e, mesh);
          scene.add(mesh);
        }
        mesh.position.set(t.position[0], t.position[1], t.position[2]);
      }

      renderer.render(scene, camera);

      // Display a simple DOM overlay for game over
      if (gameOver) {
        let overlay = document.getElementById("game-over-overlay");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "game-over-overlay";
          overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; color: white; font-size: 48px;
          `;
          overlay.textContent = "GAME OVER";
          document.body.appendChild(overlay);
        }
      } else {
        const overlay = document.getElementById("game-over-overlay");
        if (overlay) overlay.remove();
      }
    },
  };
}

