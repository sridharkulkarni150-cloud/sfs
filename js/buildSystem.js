const GRID_SIZE = 20;

const PART_DEFS = {
  commandPod: {
    type: 'commandPod',
    width: 40,
    height: 40,
    dryMass: 100,
    fuelCapacity: 0,
    thrust: 0,
  },
  fuelTank: {
    type: 'fuelTank',
    width: 40,
    height: 60,
    dryMass: 50,
    fuelCapacity: 250,
    thrust: 0,
  },
  engine: {
    type: 'engine',
    width: 40,
    height: 40,
    dryMass: 75,
    fuelCapacity: 0,
    thrust: 3200,
  },
  separator: {
    type: 'separator',
    width: 40,
    height: 20,
    dryMass: 20,
    fuelCapacity: 0,
    thrust: 0,
  },
};

function createAttachmentPoints() {
  return {
    top: true,
    bottom: true,
    left: true,
    right: true,
  };
}

export class BuildSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gridSize = GRID_SIZE;
    this.parts = [];
    this.partIdCounter = 1;
    this.selectedPartType = 'fuelTank';
    this.ghostCell = { x: 0, y: 0 };
    this.surfaceHeight = canvas.height - 100;
    this.defaultRootCell = {
      x: Math.floor(canvas.width / 2 / GRID_SIZE),
      y: Math.floor((this.surfaceHeight - 120) / GRID_SIZE),
    };
    this.placeInitialPod();
  }

  placeInitialPod() {
    this.parts = [];
    this.partIdCounter = 1;
    this.placePartAtCell('commandPod', this.defaultRootCell.x, this.defaultRootCell.y);
  }

  setSelectedPartType(partType) {
    if (PART_DEFS[partType]) {
      this.selectedPartType = partType;
    }
  }

  toGrid(x, y) {
    return {
      x: Math.floor(x / this.gridSize),
      y: Math.floor(y / this.gridSize),
    };
  }

  toWorld(cellX, cellY) {
    return {
      x: cellX * this.gridSize,
      y: cellY * this.gridSize,
    };
  }

  updateGhostFromMouse(mouseX, mouseY) {
    const cell = this.toGrid(mouseX, mouseY);
    this.ghostCell.x = cell.x;
    this.ghostCell.y = cell.y;
  }

  getPartAtCell(cellX, cellY) {
    return this.parts.find((part) => part.cellX === cellX && part.cellY === cellY) || null;
  }

  getNeighbors(cellX, cellY) {
    return {
      top: this.getPartAtCell(cellX, cellY - 1),
      bottom: this.getPartAtCell(cellX, cellY + 1),
      left: this.getPartAtCell(cellX - 1, cellY),
      right: this.getPartAtCell(cellX + 1, cellY),
    };
  }

  isAdjacentToExisting(cellX, cellY) {
    if (this.parts.length === 0) {
      return true;
    }
    const n = this.getNeighbors(cellX, cellY);
    return Boolean(n.top || n.bottom || n.left || n.right);
  }

  placePartAtCell(partType, cellX, cellY) {
    const def = PART_DEFS[partType];
    if (!def) {
      return false;
    }
    if (this.getPartAtCell(cellX, cellY)) {
      return false;
    }
    if (partType !== 'commandPod' && !this.isAdjacentToExisting(cellX, cellY)) {
      return false;
    }

    const world = this.toWorld(cellX, cellY);
    const part = {
      id: this.partIdCounter++,
      type: def.type,
      cellX,
      cellY,
      x: world.x,
      y: world.y,
      width: def.width,
      height: def.height,
      dryMass: def.dryMass,
      fuelCapacity: def.fuelCapacity,
      fuel: def.fuelCapacity,
      thrust: def.thrust,
      attachmentPoints: createAttachmentPoints(),
    };

    this.parts.push(part);

    if (!this.validateConnectivity()) {
      this.parts.pop();
      return false;
    }

    return true;
  }

  removePartAtCell(cellX, cellY) {
    const part = this.getPartAtCell(cellX, cellY);
    if (!part || part.type === 'commandPod') {
      return false;
    }

    const idx = this.parts.findIndex((p) => p.id === part.id);
    if (idx === -1) {
      return false;
    }

    const removed = this.parts.splice(idx, 1);
    if (!this.validateConnectivity()) {
      this.parts.push(removed[0]);
      return false;
    }

    return true;
  }

  validateConnectivity() {
    const root = this.parts.find((p) => p.type === 'commandPod');
    if (!root) {
      return false;
    }

    const visited = new Set();
    const queue = [root];
    visited.add(root.id);

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getNeighbors(current.cellX, current.cellY);
      Object.values(neighbors).forEach((n) => {
        if (n && !visited.has(n.id)) {
          visited.add(n.id);
          queue.push(n);
        }
      });
    }

    return visited.size === this.parts.length;
  }

  addPartAtMouse(mouseX, mouseY) {
    const cell = this.toGrid(mouseX, mouseY);
    return this.placePartAtCell(this.selectedPartType, cell.x, cell.y);
  }

  removePartAtMouse(mouseX, mouseY) {
    const cell = this.toGrid(mouseX, mouseY);
    return this.removePartAtCell(cell.x, cell.y);
  }

  getCraftBlueprint() {
    return this.parts.map((part) => ({ ...part }));
  }

  resetToBuildFromFlight() {
    this.placeInitialPod();
  }
}

export { GRID_SIZE, PART_DEFS };
