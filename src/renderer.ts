import { getTransform, getSphereCollider, Entity } from "./ecs";

export function initRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const entityColors = new Map<Entity, string>();
  const groundPattern = createSnowPattern(ctx);

  /** Creates a repeating snow-like pattern. */
  function createSnowPattern(context: CanvasRenderingContext2D) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 20;
    patternCanvas.height = 20;
    const patternCtx = patternCanvas.getContext('2d')!;

    // Base
    patternCtx.fillStyle = '#f0f8ff';
    patternCtx.fillRect(0, 0, 20, 20);

    // Random white dots
    patternCtx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      patternCtx.beginPath();
      patternCtx.arc(
        Math.random() * 20,
        Math.random() * 20,
        Math.random() * 2,
        0,
        Math.PI * 2
      );
      patternCtx.fill();
    }
    return context.createPattern(patternCanvas, 'repeat')!;
  }

  return {
    render: (entities: Entity[], gameOver: boolean) => {
      // Clear sky
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw snowy ground
      ctx.save();
      ctx.fillStyle = groundPattern;
      ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
      ctx.restore();

      // Draw each entity
      for (const e of entities) {
        const transform = getTransform(e);
        const collider = getSphereCollider(e);
        if (!transform || !collider) continue;

        // Decide color: player = red, worm = dark gray, else random.
        let color = entityColors.get(e);
        if (!color) {
          const { player, worm } = window as any;
          if (e === player) {
            color = '#ff0000';
          } else if (e === worm) {
            color = '#333333';
          } else {
            color = `hsl(${Math.random() * 360}, 70%, 50%)`;
          }
          entityColors.set(e, color);
        }

        // Position in 2D
        const x = canvas.width / 2 + transform.position[0];
        const y = canvas.height / 2 + transform.position[1];
        const radius = collider.radius;

        // Draw simple shadow on the ground
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(
          x,
          canvas.height / 2 + 10,
          radius * 1.2,
          radius * 0.5,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Draw entity sphere
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw game-over overlay if needed
      if (gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }
    },
  };
}

