import { GRID_SIZE, drawPartPrimitive } from './buildSystem.js';

export class Renderer {
  constructor(canvas, ctx, surfaceHeight) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.surfaceHeight = surfaceHeight;
    this.camera = { x: 0, y: 0 };
    this.stars = this.createStars(140);
  }

  createStars(count) {
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({ x: Math.random() * 5000 - 2500, y: Math.random() * 2400 - 2200, r: Math.random() * 1.8 + 0.2, p: Math.random() * 0.6 + 0.2 });
    }
    return stars;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  updateCamera(target) {
    this.camera.x = target.x - this.canvas.width / 2;
    this.camera.y = target.y - this.canvas.height / 2;
  }

  drawBackground() {
    const g = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    g.addColorStop(0, '#10172a');
    g.addColorStop(1, '#1a2f57');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const star of this.stars) {
      const sx = (star.x - this.camera.x * star.p) % (this.canvas.width + 400);
      const sy = (star.y - this.camera.y * star.p) % (this.canvas.height + 400);
      const x = sx < 0 ? sx + this.canvas.width + 400 : sx;
      const y = sy < 0 ? sy + this.canvas.height + 400 : sy;
      this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
      this.ctx.beginPath();
      this.ctx.arc(x - 200, y - 200, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawGround() {
    const y = this.surfaceHeight - this.camera.y;
    this.ctx.fillStyle = '#3b4b2f';
    this.ctx.fillRect(0, y, this.canvas.width, this.canvas.height - y);
    this.ctx.fillStyle = '#4f6638';
    this.ctx.fillRect(0, y, this.canvas.width, 6);
  }

  drawBuildGrid() {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawBuild(rocketParts, heldPartDef, snappedMouse) {
    this.updateCamera({ x: this.canvas.width / 2, y: this.canvas.height / 2 });
    this.drawBackground();
    this.drawBuildGrid();
    this.drawGround();

    rocketParts.forEach((part) => part.draw(this.ctx, part.x, part.y, 1));

    if (heldPartDef && snappedMouse) {
      drawPartPrimitive(this.ctx, heldPartDef, snappedMouse.x, snappedMouse.y, 0.45);
    }
  }

  drawFlight(craft, centerOfMass) {
    this.updateCamera(craft.position);
    this.drawBackground();
    this.drawGround();

    craft.parts.forEach((part) => {
      const worldX = craft.position.x + part.localOffset.x - this.camera.x;
      const worldY = craft.position.y + part.localOffset.y - this.camera.y;
      part.draw(this.ctx, worldX, worldY, 1);
    });

    if (craft.throttle > 0) {
      this.ctx.fillStyle = 'rgba(255, 142, 43, 0.95)';
      craft.parts.filter((p) => p.thrust > 0).forEach((engine) => {
        const worldX = craft.position.x + engine.localOffset.x - this.camera.x + engine.width / 2;
        const worldY = craft.position.y + engine.localOffset.y - this.camera.y + engine.height;
        const flameLength = 22 + 30 * craft.throttle;
        this.ctx.beginPath();
        this.ctx.moveTo(worldX - 8, worldY - 2);
        this.ctx.lineTo(worldX + 8, worldY - 2);
        this.ctx.lineTo(worldX, worldY + flameLength);
        this.ctx.closePath();
        this.ctx.fill();
      });
    }
  }
}
