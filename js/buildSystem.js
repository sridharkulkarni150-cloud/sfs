const GRID_SIZE = 40;

const PART_DEFS = {
  commandPod: { type: 'commandPod', width: 40, height: 40, dryMass: 100, fuelCapacity: 0, thrust: 0 },
  fuelTank: { type: 'fuelTank', width: 40, height: 80, dryMass: 50, fuelCapacity: 250, thrust: 0 },
  engine: { type: 'engine', width: 40, height: 40, dryMass: 75, fuelCapacity: 0, thrust: 3200 },
  separator: { type: 'separator', width: 40, height: 20, dryMass: 20, fuelCapacity: 0, thrust: 0 },
};

function createAttachmentPoints() {
  return { top: true, bottom: true, left: true, right: true };
}

function drawPartPrimitive(ctx, part, x, y, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (part.invalidFloating) {
    ctx.fillStyle = 'rgba(255, 64, 64, 0.85)';
    ctx.fillRect(x, y, part.width, part.height);
    ctx.restore();
    return;
  }

  if (part.type === 'commandPod') {
    ctx.fillStyle = '#ffca3a';
    ctx.beginPath();
    ctx.moveTo(x + part.width / 2, y);
    ctx.lineTo(x + part.width, y + part.height);
    ctx.lineTo(x, y + part.height);
    ctx.closePath();
    ctx.fill();
  } else if (part.type === 'engine') {
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(x, y, part.width, part.height - 8);
    ctx.fillStyle = '#6c757d';
    ctx.beginPath();
    ctx.moveTo(x, y + part.height - 8);
    ctx.lineTo(x + part.width, y + part.height - 8);
    ctx.lineTo(x + part.width / 2, y + part.height);
    ctx.closePath();
    ctx.fill();
  } else if (part.type === 'separator') {
    ctx.fillStyle = '#f94144';
    ctx.fillRect(x, y, part.width, part.height);
  } else {
    ctx.fillStyle = '#90be6d';
    ctx.fillRect(x, y, part.width, part.height);
    if (part.fuelCapacity > 0) {
      const ratio = part.fuelCapacity > 0 ? part.fuel / part.fuelCapacity : 0;
      ctx.fillStyle = '#43aa8b';
      ctx.fillRect(x + 4, y + 4, (part.width - 8) * ratio, part.height - 8);
    }
  }
  ctx.restore();
}

function createPart(def, x, y, id, localOffset = { x: 0, y: 0 }) {
  return {
    id,
    type: def.type,
    x,
    y,
    gridX: Math.floor(x / GRID_SIZE),
    gridY: Math.floor(y / GRID_SIZE),
    width: def.width,
    height: def.height,
    dryMass: def.dryMass,
    mass: def.dryMass,
    fuelCapacity: def.fuelCapacity,
    fuel: def.fuelCapacity,
    thrust: def.thrust,
    invalidFloating: false,
    attachmentPoints: createAttachmentPoints(),
    localOffset,
    draw(ctx, drawX = this.x, drawY = this.y, alpha = 1) {
      drawPartPrimitive(ctx, this, drawX, drawY, alpha);
    },
  };
}

export class BuildSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gridSize = GRID_SIZE;
    this.rocketParts = [];
    this.partIdCounter = 1;
    this.surfaceHeight = canvas.height - 100;
    this.placeInitialPod();
  }

  get commandPod() {
    return this.rocketParts.find((p) => p.type === 'commandPod') || null;
  }

  placeInitialPod() {
    this.rocketParts = [];
    this.partIdCounter = 1;
    const x = Math.floor(this.canvas.width / 2 / GRID_SIZE) * GRID_SIZE;
    const y = Math.floor((this.surfaceHeight - 120) / GRID_SIZE) * GRID_SIZE;
    const pod = createPart(PART_DEFS.commandPod, x, y, this.partIdCounter++);
    this.rocketParts.push(pod);
    this.updateLocalOffsets();
  }

  snap(value) {
    return Math.floor(value / GRID_SIZE) * GRID_SIZE;
  }

  snapPoint(x, y) {
    return { x: this.snap(x), y: this.snap(y) };
  }

  isAdjacent(newPart, existingPart) {
    const dx = newPart.gridX - existingPart.gridX;
    const dy = newPart.gridY - existingPart.gridY;
    return (Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0);
  }

  checkOverlap(newPart) {
    for (const existing of this.rocketParts) {
      if (newPart.gridX === existing.gridX && newPart.gridY === existing.gridY) {
        return true;
      }
    }
    return false;
  }

  updateLocalOffsets() {
    const pod = this.commandPod;
    if (!pod) {
      return;
    }
    this.rocketParts.forEach((part) => {
      part.localOffset = { x: part.x - pod.x, y: part.y - pod.y };
      part.invalidFloating = false;
    });
  }

  placeHeldPart(partType, mouseX, mouseY) {
    const def = PART_DEFS[partType];
    if (!def) {
      return false;
    }
    const snapped = this.snapPoint(mouseX, mouseY);
    const newPart = createPart(def, snapped.x, snapped.y, this.partIdCounter++);

    if (this.checkOverlap(newPart)) {
      return false;
    }

    const hasAdjacent = this.rocketParts.some((existing) => this.isAdjacent(newPart, existing));
    if (partType !== 'commandPod' && !hasAdjacent) {
      return false;
    }

    this.rocketParts.push(newPart);
    this.updateLocalOffsets();
    return true;
  }

  removeAt(mouseX, mouseY) {
    const snapped = this.snapPoint(mouseX, mouseY);
    const gridX = Math.floor(snapped.x / GRID_SIZE);
    const gridY = Math.floor(snapped.y / GRID_SIZE);
    const idx = this.rocketParts.findIndex((p) => p.gridX === gridX && p.gridY === gridY);
    if (idx < 0 || this.rocketParts[idx].type === 'commandPod') {
      return false;
    }
    this.rocketParts.splice(idx, 1);
    this.updateLocalOffsets();
    return true;
  }

  connectivityPass(deleteFloating = false) {
    const pod = this.commandPod;
    if (!pod) {
      return { removed: 0, floating: [] };
    }

    const visited = new Set([pod.id]);
    const queue = [pod];

    while (queue.length > 0) {
      const current = queue.shift();
      this.rocketParts.forEach((candidate) => {
        if (!visited.has(candidate.id) && this.isAdjacent(current, candidate)) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      });
    }

    const floating = this.rocketParts.filter((p) => !visited.has(p.id));
    this.rocketParts.forEach((p) => {
      p.invalidFloating = !visited.has(p.id);
    });

    if (deleteFloating && floating.length > 0) {
      const floatingIds = new Set(floating.map((p) => p.id));
      this.rocketParts = this.rocketParts.filter((p) => !floatingIds.has(p.id));
      this.updateLocalOffsets();
      return { removed: floating.length, floating };
    }

    return { removed: 0, floating };
  }

  getCraftBlueprint() {
    return this.rocketParts.map((p) => createPart(PART_DEFS[p.type], p.x, p.y, p.id, { ...p.localOffset }));
  }
}

export { GRID_SIZE, PART_DEFS, drawPartPrimitive };
