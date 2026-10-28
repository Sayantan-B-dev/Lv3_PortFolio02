/**
 * Pushed furniture lives here rather than in React state: the walk loop updates
 * it every frame and the room's visual wrapper reads the same offsets.
 */
type PushableState = {
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
};

const states = new Map<string, PushableState>();

/** A soft spring pulls a displaced object back to its authored spot. */
const STIFFNESS = 7.5;
const DAMPING = 4.2;
/** Objects can be shoved this far at most, so they stay on the island. */
const MAX_OFFSET = 2.2;

export function ensurePushable(id: string, homeX: number, homeZ: number) {
  let state = states.get(id);
  if (!state) {
    state = { homeX, homeZ, x: homeX, z: homeZ, vx: 0, vz: 0 };
    states.set(id, state);
  }
  return state;
}

export function pushPushable(
  id: string,
  homeX: number,
  homeZ: number,
  dx: number,
  dz: number,
) {
  const state = ensurePushable(id, homeX, homeZ);
  state.x += dx;
  state.z += dz;

  const offsetX = state.x - state.homeX;
  const offsetZ = state.z - state.homeZ;
  const distance = Math.hypot(offsetX, offsetZ);
  if (distance > MAX_OFFSET) {
    const scale = MAX_OFFSET / distance;
    state.x = state.homeX + offsetX * scale;
    state.z = state.homeZ + offsetZ * scale;
  }
}

export function stepPushables(dt: number) {
  for (const state of states.values()) {
    const ax = -STIFFNESS * (state.x - state.homeX) - DAMPING * state.vx;
    const az = -STIFFNESS * (state.z - state.homeZ) - DAMPING * state.vz;

    state.vx += ax * dt;
    state.vz += az * dt;
    state.x += state.vx * dt;
    state.z += state.vz * dt;

    if (
      Math.abs(state.x - state.homeX) < 0.0004 &&
      Math.abs(state.z - state.homeZ) < 0.0004 &&
      Math.hypot(state.vx, state.vz) < 0.002
    ) {
      state.x = state.homeX;
      state.z = state.homeZ;
      state.vx = 0;
      state.vz = 0;
    }
  }
}

/** Offset from the authored position, or null while nothing has touched it. */
export function getPushOffset(id: string): [number, number] | null {
  const state = states.get(id);
  if (!state) return null;
  return [state.x - state.homeX, state.z - state.homeZ];
}

export function resetPushables() {
  states.clear();
}
