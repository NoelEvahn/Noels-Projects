// Static colliders + spatial hash + ground queries (MASTER_SPEC 5.5). Pure.
const CELL = 32;
const key = (i, j) => i * 8209 + j;

export function createColliderSet() {
  const cells = new Map();
  const all = [];
  let stamp = 0;

  function bounds(c) {
    if (c.shape === 'box') {
      const cs = Math.abs(Math.cos(c.rotY)), sn = Math.abs(Math.sin(c.rotY));
      const ex = c.half[0] * cs + c.half[2] * sn, ez = c.half[0] * sn + c.half[2] * cs;
      return [c.pos[0] - ex, c.pos[0] + ex, c.pos[2] - ez, c.pos[2] + ez];
    }
    if (c.shape === 'cyl') return [c.pos[0] - c.radius, c.pos[0] + c.radius, c.pos[2] - c.radius, c.pos[2] + c.radius];
    // deck: segment with half-width
    const x0 = Math.min(c.ax, c.bx) - c.hw, x1 = Math.max(c.ax, c.bx) + c.hw, z0 = Math.min(c.az, c.bz) - c.hw, z1 = Math.max(c.az, c.bz) + c.hw;
    return [x0, x1, z0, z1];
  }
  function add(c) {
    c.cos = Math.cos(c.rotY || 0); c.sin = Math.sin(c.rotY || 0);
    c.qid = 0;
    c.index = all.length;
    all.push(c);
    const [x0, x1, z0, z1] = bounds(c);
    c.aabb = [x0, x1, z0, z1];
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = key(i, j);
      let a = cells.get(k);
      if (!a) { a = []; cells.set(k, a); }
      a.push(c);
    }
    return c;
  }
  function box(cx, cy, cz, hx, hy, hz, yaw, o = {}) {
    return add({ shape: 'box', pos: [cx, cy, cz], half: [hx, hy, hz], rotY: yaw, yMin: cy - hy, yMax: cy + hy, walkable: !!o.walkable, surface: o.surface, id: o.id, tag: o.tag });
  }
  function cyl(cx, cz, r, yMin, yMax, o = {}) {
    return add({ shape: 'cyl', pos: [cx, (yMin + yMax) / 2, cz], radius: r, height: yMax - yMin, rotY: 0, yMin, yMax, walkable: !!o.walkable, surface: o.surface, id: o.id, tag: o.tag });
  }
  function deck(ax, ay, az, bx, by, bz, hw, thick, o = {}) {
    return add({ shape: 'deck', ax, ay, az, bx, by, bz, hw, thick, pos: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], rotY: 0, yMin: Math.min(ay, by) - thick, yMax: Math.max(ay, by), walkable: true, surface: o.surface, id: o.id, tag: o.tag });
  }

  function near(x, z, r, out = []) {
    out.length = 0;
    stamp++;
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
      const a = cells.get(key(i, j));
      if (!a) continue;
      for (let k = 0; k < a.length; k++) { const c = a[k]; if (c.qid !== stamp) { c.qid = stamp; out.push(c); } }
    }
    return out;
  }

  /** top surface height of a walkable collider at (x,z), or NaN when outside its footprint. */
  function topAt(c, x, z) {
    if (c.shape === 'box') {
      const dx = x - c.pos[0], dz = z - c.pos[2];
      const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
      return Math.abs(lx) <= c.half[0] && Math.abs(lz) <= c.half[2] ? c.yMax : NaN;
    }
    if (c.shape === 'cyl') { const dx = x - c.pos[0], dz = z - c.pos[2]; return dx * dx + dz * dz <= c.radius * c.radius ? c.yMax : NaN; }
    const dx = c.bx - c.ax, dz = c.bz - c.az, l2 = dx * dx + dz * dz;
    const t = ((x - c.ax) * dx + (z - c.az) * dz) / l2;
    if (t < -0.001 || t > 1.001) return NaN;
    const px = c.ax + dx * t, pz = c.az + dz * t;
    if ((x - px) * (x - px) + (z - pz) * (z - pz) > c.hw * c.hw) return NaN;
    return c.ay + (c.by - c.ay) * Math.min(1, Math.max(0, t));
  }

  /** true when a vertical capsule/circle of radius r at (x,z) spanning [y0,y1] penetrates a blocking collider; writes push-out into out. */
  function penetration(c, x, z, r, y0, y1, out) {
    if (c.shape === 'deck') return false; // decks are surfaces, not walls
    if (y1 <= c.yMin + 0.01 || y0 >= c.yMax - 0.01) return false;
    if (c.shape === 'cyl') {
      const dx = x - c.pos[0], dz = z - c.pos[2], d = Math.sqrt(dx * dx + dz * dz), pen = c.radius + r - d;
      if (pen <= 0) return false;
      out.nx = d > 1e-6 ? dx / d : 1; out.nz = d > 1e-6 ? dz / d : 0; out.pen = pen; return true;
    }
    const dx = x - c.pos[0], dz = z - c.pos[2];
    const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
    const qx = Math.max(-c.half[0], Math.min(c.half[0], lx)), qz = Math.max(-c.half[2], Math.min(c.half[2], lz));
    const ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
    let nlx, nlz, pen;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2); pen = r - d; if (pen <= 0) return false; nlx = ex / d; nlz = ez / d;
    } else { // centre inside the box: push out along the nearest face
      const px = c.half[0] - Math.abs(lx), pz = c.half[2] - Math.abs(lz);
      if (px < pz) { nlx = lx >= 0 ? 1 : -1; nlz = 0; pen = px + r; } else { nlx = 0; nlz = lz >= 0 ? 1 : -1; pen = pz + r; }
    }
    out.nx = nlx * c.cos - nlz * c.sin; out.nz = nlx * c.sin + nlz * c.cos; out.pen = pen;
    return true;
  }

  /** ray vs collider (boxes, cylinders and decks approximated by their oriented box). returns distance or -1 */
  function rayHit(c, ox, oy, oz, dx, dy, dz, maxD) {
    if (c.shape === 'cyl') {
      const fx = ox - c.pos[0], fz = oz - c.pos[2];
      const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - c.radius * c.radius;
      if (a < 1e-9) return -1;
      const disc = b * b - 4 * a * cc; if (disc < 0) return -1;
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t < 0 || t > maxD) return -1;
      const y = oy + dy * t; return y >= c.yMin && y <= c.yMax ? t : -1;
    }
    let cx, cz, hx, hy, hz, co, si, cy;
    if (c.shape === 'box') { cx = c.pos[0]; cz = c.pos[2]; cy = c.pos[1]; hx = c.half[0]; hy = c.half[1]; hz = c.half[2]; co = c.cos; si = c.sin; }
    else {
      cx = c.pos[0]; cz = c.pos[2]; cy = (c.yMin + c.yMax) / 2; hx = c.hw; hz = Math.hypot(c.bx - c.ax, c.bz - c.az) / 2; hy = (c.yMax - c.yMin) / 2;
      const yaw = Math.atan2(c.bx - c.ax, -(c.bz - c.az)); co = Math.cos(yaw); si = Math.sin(yaw);
    }
    const rx = ox - cx, rz = oz - cz;
    const lox = rx * co + rz * si, loz = -rx * si + rz * co, ldx = dx * co + dz * si, ldz = -dx * si + dz * co;
    let t0 = 0, t1 = maxD;
    const slab = (o, d, h) => {
      if (Math.abs(d) < 1e-9) return o >= -h && o <= h;
      let a = (-h - o) / d, b = (h - o) / d; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; return t0 <= t1;
    };
    if (!slab(lox, ldx, hx) || !slab(loz, ldz, hz) || !slab(oy - cy, dy, hy)) return -1;
    return t0;
  }

  return { add, box, cyl, deck, near, topAt, penetration, rayHit, all, get count() { return all.length; } };
}
