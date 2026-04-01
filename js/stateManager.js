export const GameMode = Object.freeze({
  BUILD: 'BUILD',
  FLIGHT: 'FLIGHT',
});

export class GameState {
  constructor() {
    this.mode = GameMode.BUILD;
  }

  isBuildMode() {
    return this.mode === GameMode.BUILD;
  }

  isFlightMode() {
    return this.mode === GameMode.FLIGHT;
  }

  transitionTo(nextMode) {
    if (nextMode !== GameMode.BUILD && nextMode !== GameMode.FLIGHT) {
      throw new Error(`Invalid game mode transition target: ${nextMode}`);
    }
    this.mode = nextMode;
  }
}
