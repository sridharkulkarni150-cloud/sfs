const GRAVITY = 9.81;
const PIXELS_PER_METER = 20;
const FUEL_BURN_RATE = 0.18;

export class PhysicsEngine {
  constructor(surfaceHeight) {
    this.surfaceHeight = surfaceHeight;
  }

  initializeCraft(parts) {
    const craftParts = parts.map((part) => ({ ...part }));
    const center = this.calculateCenterOfMass(craftParts);

    return {
      parts: craftParts,
      position: { x: center.x, y: center.y },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      rotation: 0,
      throttle: 0,
      grounded: false,
    };
  }

  calculateTotalMass(parts) {
    return parts.reduce((acc, part) => acc + part.dryMass + (part.fuel || 0), 0);
  }

  calculateTotalFuel(parts) {
    return parts.reduce((acc, part) => acc + (part.fuel || 0), 0);
  }

  calculateFuelCapacity(parts) {
    return parts.reduce((acc, part) => acc + (part.fuelCapacity || 0), 0);
  }

  calculateTotalThrust(parts) {
    return parts.reduce((acc, part) => acc + (part.thrust || 0), 0);
  }

  calculateCenterOfMass(parts) {
    let weightedX = 0;
    let weightedY = 0;
    let totalMass = 0;

    parts.forEach((part) => {
      const mass = part.dryMass + (part.fuel || 0);
      const px = part.x + part.width / 2;
      const py = part.y + part.height / 2;
      weightedX += px * mass;
      weightedY += py * mass;
      totalMass += mass;
    });

    if (!Number.isFinite(totalMass) || totalMass <= 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: weightedX / totalMass,
      y: weightedY / totalMass,
    };
  }

  consumeFuel(parts, dt, throttle) {
    const engines = parts.filter((p) => p.thrust > 0);
    if (engines.length === 0 || throttle <= 0) {
      return 0;
    }

    const totalRequested = engines.length * FUEL_BURN_RATE * throttle * dt * 60;
    let fuelPool = this.calculateTotalFuel(parts);
    const used = Math.min(fuelPool, totalRequested);
    fuelPool -= used;

    const tanks = parts.filter((p) => p.fuelCapacity > 0);
    let remainingToRemove = used;

    for (const tank of tanks) {
      if (remainingToRemove <= 0) {
        break;
      }
      const removable = Math.min(tank.fuel, remainingToRemove);
      tank.fuel -= removable;
      remainingToRemove -= removable;
    }

    return used;
  }

  getBounds(parts, craftPosition, centerOfMass) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const part of parts) {
      const localX = part.x + part.width / 2 - centerOfMass.x;
      const localY = part.y + part.height / 2 - centerOfMass.y;
      const worldX = craftPosition.x + localX;
      const worldY = craftPosition.y + localY;
      const left = worldX - part.width / 2;
      const top = worldY - part.height / 2;
      const right = left + part.width;
      const bottom = top + part.height;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxY)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return { minX, minY, maxX, maxY };
  }

  update(craft, dt) {
    const mass = this.calculateTotalMass(craft.parts);
    const maxThrust = this.calculateTotalThrust(craft.parts);

    const usedFuel = this.consumeFuel(craft.parts, dt, craft.throttle);
    const hasFuel = usedFuel > 0;
    const thrustForce = hasFuel ? maxThrust * craft.throttle : 0;

    const ax = 0;
    const ay = mass > 0 ? (GRAVITY * PIXELS_PER_METER - thrustForce / mass) : 0;

    craft.acceleration.x = Number.isFinite(ax) ? ax : 0;
    craft.acceleration.y = Number.isFinite(ay) ? ay : 0;

    craft.velocity.x += craft.acceleration.x * dt;
    craft.velocity.y += craft.acceleration.y * dt;

    if (!Number.isFinite(craft.velocity.x)) {
      craft.velocity.x = 0;
    }
    if (!Number.isFinite(craft.velocity.y)) {
      craft.velocity.y = 0;
    }

    craft.position.x += craft.velocity.x * dt;
    craft.position.y += craft.velocity.y * dt;

    if (!Number.isFinite(craft.position.x)) {
      craft.position.x = 0;
    }
    if (!Number.isFinite(craft.position.y)) {
      craft.position.y = this.surfaceHeight;
    }

    const com = this.calculateCenterOfMass(craft.parts);
    const bounds = this.getBounds(craft.parts, craft.position, com);

    if (bounds.maxY >= this.surfaceHeight) {
      const penetration = bounds.maxY - this.surfaceHeight;
      craft.position.y -= penetration;
      craft.velocity.y = 0;
      craft.grounded = true;
    } else {
      craft.grounded = false;
    }

    return {
      mass: this.calculateTotalMass(craft.parts),
      fuel: this.calculateTotalFuel(craft.parts),
      fuelCapacity: this.calculateFuelCapacity(craft.parts),
      thrust: maxThrust,
      centerOfMass: com,
      bounds,
    };
  }
}

export { GRAVITY, PIXELS_PER_METER };
