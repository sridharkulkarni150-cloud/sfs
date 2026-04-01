import { GRID_SIZE } from './buildSystem.js';

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
      stars.push({
        x: Math.random() * 5000 - 2500,
        y: Math.random() * 2400 - 2200,
        r: Math.random() * 1.8 + 0.2,
        p: Math.random() * 0.6 + 0.2,
      });
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

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
    const cols = Math.ceil(this.canvas.width / GRID_SIZE);
    const rows = Math.ceil(this.canvas.height / GRID_SIZE);

    for (let c = 0; c <= cols; c += 1) {
      const x = c * GRID_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let r = 0; r <= rows; r += 1) {
      const y = r * GRID_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawPartRect(part, x, y) {
    if (part.type === 'commandPod') {
      this.ctx.fillStyle = '#ffca3a';
      this.ctx.beginPath();
      this.ctx.moveTo(x + part.width / 2, y);
      this.ctx.lineTo(x + part.width, y + part.height);
      this.ctx.lineTo(x, y + part.height);
      this.ctx.closePath();
      this.ctx.fill();
      return;
    }

    if (part.type === 'engine') {
      this.ctx.fillStyle = '#adb5bd';
      this.ctx.fillRect(x, y, part.width, part.height - 8);
      this.ctx.fillStyle = '#6c757d';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + part.height - 8);
      this.ctx.lineTo(x + part.width, y + part.height - 8);
      this.ctx.lineTo(x + part.width / 2, y + part.height);
      this.ctx.closePath();
      this.ctx.fill();
      return;
    }

    if (part.type === 'separator') {
      this.ctx.fillStyle = '#f94144';
      this.ctx.fillRect(x, y, part.width, part.height);
      return;
    }

    this.ctx.fillStyle = '#90be6d';
    this.ctx.fillRect(x, y, part.width, part.height);
    if (part.fuelCapacity > 0) {
      const ratio = part.fuelCapacity > 0 ? part.fuel / part.fuelCapacity : 0;
      this.ctx.fillStyle = '#43aa8b';
      this.ctx.fillRect(x + 4, y + 4, (part.width - 8) * ratio, part.height - 8);
    }
  }

  drawBuild(parts, ghostCell, selectedDef) {
    this.updateCamera({ x: this.canvas.width / 2, y: this.canvas.height / 2 });
    this.drawBackground();
    this.drawBuildGrid();
    this.drawGround();

    for (const part of parts) {
      this.drawPartRect(part, part.x, part.y);
    }

    if (selectedDef) {
      const gx = ghostCell.x * GRID_SIZE;
      const gy = ghostCell.y * GRID_SIZE;
      this.ctx.globalAlpha = 0.45;
      this.drawPartRect(selectedDef, gx, gy);
      this.ctx.globalAlpha = 1;
    }
  }

  drawFlight(craft, centerOfMass) {
    this.updateCamera(craft.position);
    this.drawBackground();
    this.drawGround();

    for (const part of craft.parts) {
      const localX = part.x + part.width / 2 - centerOfMass.x;
      const localY = part.y + part.height / 2 - centerOfMass.y;
      const worldX = craft.position.x + localX;
      const worldY = craft.position.y + localY;
      this.drawPartRect(part, worldX - part.width / 2 - this.camera.x, worldY - part.height / 2 - this.camera.y);
    }

    if (craft.throttle > 0) {
      const engines = craft.parts.filter((p) => p.thrust > 0);
      this.ctx.fillStyle = 'rgba(255, 142, 43, 0.95)';
      engines.forEach((engine) => {
        const localX = engine.x + engine.width / 2 - centerOfMass.x;
        const localY = engine.y + engine.height / 2 - centerOfMass.y;
        const worldX = craft.position.x + localX - this.camera.x;
        const worldY = craft.position.y + localY - this.camera.y;
        const flameLength = 22 + 30 * craft.throttle;
        this.ctx.beginPath();
        this.ctx.moveTo(worldX - 8, worldY + engine.height / 2 - 2);
        this.ctx.lineTo(worldX + 8, worldY + engine.height / 2 - 2);
        this.ctx.lineTo(worldX, worldY + engine.height / 2 + flameLength);
        this.ctx.closePath();
        this.ctx.fill();
      });
    }
  }
}
