// ─── Pure math helpers ────────────────────────────────────────────

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16)
       | (Math.round(ag + (bg - ag) * t) << 8)
       |  Math.round(ab + (bb - ab) * t);
}

// ─── Terrain noise (deterministic, no randomness) ─────────────────
export function noise2(x, z) {
  return Math.sin(x * 0.12) * Math.cos(z * 0.09) * 2.5
       + Math.sin(x * 0.25 + 1) * Math.cos(z * 0.22 + 2) * 1.2
       + Math.sin(x * 0.05) * Math.cos(z * 0.07) * 4;
}

export function getTerrainY(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const flatten = Math.max(0, 1 - d / 18);
  return noise2(x, z) * (1 - flatten);
}