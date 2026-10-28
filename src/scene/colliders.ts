/**
 * World-space circles published by floating objects each frame. PlayerControls
 * reads them so the walker can never pass through a drifting frame.
 */
type CircleCollider = {
  id: string;
  x: number;
  z: number;
  radius: number;
};

const circles = new Map<string, CircleCollider>();

export function setCircleCollider(
  id: string,
  x: number,
  z: number,
  radius: number,
) {
  circles.set(id, { id, x, z, radius });
}

export function clearCircleCollider(id: string) {
  circles.delete(id);
}

export function getCircleColliders() {
  return circles.values();
}
