// src/renderer.ts

import { getTransform, getSphereCollider, Entity } from "./ecs";

export function initRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const entityColors = new Map<Entity, string>();

  return {
    render: (entities: Entity[]) => {
      ctx.fillStyle = '#000000'; // Clear background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      entities.forEach(e => {
        const transform = getTransform(e);
        const collider = getSphereCollider(e);
        
        if (!transform || !collider) return;

        if (!entityColors.has(e)) {
          entityColors.set(e, `hsl(${Math.random() * 360}, 70%, 50%)`);
        }

        const x = canvas.width / 2 + transform.position[0];
        const y = canvas.height / 2 + transform.position[1];
        const radius = collider.radius;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = entityColors.get(e)!;
        ctx.fill();
      });
    }
  };
}

