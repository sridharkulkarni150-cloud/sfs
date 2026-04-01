const GRAVITY = 9.81;
const PIXELS_PER_METER = 20;
const FUEL_BURN_RATE = 0.18;

export class PhysicsEngine {
  constructor(canvasHeight, groundOffset) {
    this.canvasHeight = canvasHeight;
    this.groundOffset = groundOffset;
  }

  setCanvasHeight(height) {
    this.canvasHeight = height;
  }

  getGroundY() {
    return this.canvasHeight - this.groundOffset;
  }

  initializeCraft(parts) {
    const commandPod = parts.find((p) => p.type === 'commandPod') || parts[0];
    return {
      parts: parts.map((part) => ({ ...part, localOffset: { ...part.localOffset } })),
      position: { x: commandPod.x, y: commandPod.y },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
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

  calculateCenterOfMass(parts, position) {
    let weightedX = 0;
    let weightedY = 0;
    let totalMass = 0;
    parts.forEach((part) => {
      const partMass = part.dryMass + (part.fuel || 0);
      const worldX = position.x + part.localOffset.x + part.width / 2;
      const worldY = position.y + part.localOffset.y + part.height / 2;
      weightedX += partMass * worldX;
      weightedY += partMass * worldY;
      totalMass += partMass;
    });
    if (!Number.isFinite(totalMass) || totalMass <= 0) {
      return { x: position.x, y: position.y };
    }
    return { x: weightedX / totalMass, y: weightedY / totalMass };
  }

  consumeFuel(parts, dt, throttle) {
    const engines = parts.filter((p) => p.thrust > 0);
    if (!engines.length || throttle <= 0) {
      return 0;
    }
    const requested = engines.length * FUEL_BURN_RATE * throttle * dt * 60;
    const consumed = Math.min(this.calculateTotalFuel(parts), requested);
    let remaining = consumed;
    parts.filter((p) => p.fuelCapacity > 0).forEach((tank) => {
      if (remaining <= 0) {
        return;
      }
      const delta = Math.min(tank.fuel, remaining);
      tank.fuel -= delta;
      remaining -= delta;
    });
    return consumed;
  }

  getBounds(parts, position) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    parts.forEach((part) => {
      const left = position.x + part.localOffset.x;
      const top = position.y + part.localOffset.y;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + part.width);
      maxY = Math.max(maxY, top + part.height);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(maxY)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return { minX, minY, maxX, maxY };
  }

  update(craft, dt) {
    const mass = this.calculateTotalMass(craft.parts);
    const thrust = this.calculateTotalThrust(craft.parts);
    const consumedFuel = this.consumeFuel(craft.parts, dt, craft.throttle);
    const activeThrust = consumedFuel > 0 ? thrust * craft.throttle : 0;

    craft.acceleration.x = 0;
    craft.acceleration.y = Number.isFinite(mass) && mass > 0 ? GRAVITY * PIXELS_PER_METER - activeThrust / mass : 0;

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
      craft.position.y = 0;
    }

    const ground = this.getGroundY();
    if (craft.position.y > ground) {
      craft.position.y = ground;
      craft.velocity.y = 0;
    }

    const bounds = this.getBounds(craft.parts, craft.position);
    if (bounds.maxY > ground) {
      craft.position.y -= bounds.maxY - ground;
      craft.velocity.y = 0;
      craft.grounded = true;
    } else {
      craft.grounded = false;
    }

    const centerOfMass = this.calculateCenterOfMass(craft.parts, craft.position);

    return {
      mass: this.calculateTotalMass(craft.parts),
      fuel: this.calculateTotalFuel(craft.parts),
      fuelCapacity: this.calculateFuelCapacity(craft.parts),
      centerOfMass,
      bounds: this.getBounds(craft.parts, craft.position),
      ground,
    };
  }
}

export { GRAVITY, PIXELS_PER_METER };
