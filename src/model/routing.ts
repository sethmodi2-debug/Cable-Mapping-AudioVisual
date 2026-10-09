// Draws cables around devices rather than through them. Each cable leaves its
// port, travels along the open channels between devices with as few bends as
// possible, and cables that end up sharing a channel are spread apart so each
// one can still be followed by eye.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Side = "left" | "right" | "top" | "bottom";

export interface CableEnd extends Point {
  side: Side;
}

export interface RouteRequest {
  id: string;
  from: CableEnd;
  to: CableEnd;
}

export interface RouteOptions {
  // Put the bends on grid lines.
  grid?: number;
}

const CLEARANCE = 10; // how close a cable may pass to a device
const LANE = 24; // where the channels beside a device run
const STUB = 20; // straight run out of a port before the first bend
const BEND = 40; // a bend costs as much as this many pixels of cable
const SPREAD = 7; // gap between cables sharing a channel
const MIN_STUB = 20; // spreading never leaves less straight cable than this at a port

const STEP: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

function inflate(b: Box, by: number): Box {
  return { x: b.x - by, y: b.y - by, w: b.w + 2 * by, h: b.h + 2 * by };
}

function inside(p: Point, b: Box): boolean {
  return p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
}

// Whether a straight horizontal or vertical run cuts through a box.
function crosses(a: Point, b: Point, box: Box): boolean {
  if (a.y === b.y) {
    if (a.y <= box.y || a.y >= box.y + box.h) return false;
    return Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.w;
  }
  if (a.x <= box.x || a.x >= box.x + box.w) return false;
  return Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.h;
}

function unique(values: number[]): number[] {
  return [...new Set(values.map((v) => Math.round(v * 100) / 100))].sort((a, b) => a - b);
}

// Lines a cable may run along: either side of every device, halfway between
// neighbouring devices, and straight out of the two ports.
function channels(starts: number[], ends: number[], extra: number[], grid?: number): number[] {
  const snap = (v: number) => (grid ? Math.round(v / grid) * grid : v);
  const lines = [...starts.map((v) => snap(v - LANE)), ...ends.map((v) => snap(v + LANE))];
  const edges = unique([...starts, ...ends]);
  for (let i = 0; i + 1 < edges.length; i++) lines.push(snap((edges[i] + edges[i + 1]) / 2));
  return unique([...lines, ...extra]);
}

class Heap {
  private items: { key: number; cost: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(key: number, cost: number) {
    const items = this.items;
    items.push({ key, cost });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].cost <= items[i].cost) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }
  pop(): number {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l].cost < items[m].cost) m = l;
        if (r < items.length && items[r].cost < items[m].cost) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top.key;
  }
}

// Removes points in the middle of straight runs.
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (out.length > 0 && out[out.length - 1].x === p.x && out[out.length - 1].y === p.y) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      if ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) out.pop();
    }
    out.push(p);
  }
  return out;
}

// When the two ports face each other with nothing in between, the cable
// goes straight across, or steps once halfway, however close the devices are.
function directRoute(boxes: Box[], from: CableEnd, to: CableEnd, options: RouteOptions): Point[] | null {
  const facing =
    (from.side === "right" && to.side === "left" && to.x > from.x) || (from.side === "left" && to.side === "right" && to.x < from.x);
  if (!facing) return null;
  const a = { x: from.x, y: from.y };
  const b = { x: to.x, y: to.y };
  // Close devices leave a narrow gap, so the cable may pass nearer to them.
  const clearance = Math.min(CLEARANCE, Math.max(0, Math.abs(to.x - from.x) / 2 - 3));
  const blocks = boxes.map((box) => inflate(box, clearance));
  // The runs out of the ports start on a device's edge, so they only have to
  // stay out of the devices themselves; the step between keeps its distance.
  const clear = (points: Point[]) =>
    points.slice(1).every((q, k) => {
      const ends = k === 0 || k === points.length - 2;
      return !(ends ? boxes : blocks).some((box) => crosses(points[k], q, box));
    });
  if (Math.abs(from.y - to.y) < 0.5) {
    const straight = [a, { x: b.x, y: a.y }];
    return clear(straight) ? straight : null;
  }
  // Step halfway if that's clear, otherwise at the nearest clear spot
  // between the two ports.
  let mid = (from.x + to.x) / 2;
  if (options.grid && Math.abs(to.x - from.x) > 2 * options.grid) mid = Math.round(mid / options.grid) * options.grid;
  const lo = Math.min(from.x, to.x) + 4;
  const hi = Math.max(from.x, to.x) - 4;
  for (let k = 0; mid - k >= lo || mid + k <= hi; k += 2) {
    for (const x of k === 0 ? [mid] : [mid - k, mid + k]) {
      if (x < lo || x > hi) continue;
      const step = [a, { x, y: a.y }, { x, y: b.y }, b];
      if (clear(step)) return step;
    }
  }
  return null;
}

// Lines the search snaps to are rounded, so tidy the ends back onto the
// ports' own lines; otherwise a hair's difference shows up as a kink.
function alignEnds(points: Point[]): Point[] {
  const n = points.length;
  if (n < 3) return points;
  const out = points.map((p) => ({ ...p }));
  const fix = (end: number, next: number) => {
    const horizontal = Math.abs(out[next].y - out[end].y) < 0.5;
    if (horizontal) out[next].y = out[end].y;
    else if (Math.abs(out[next].x - out[end].x) < 0.5) out[next].x = out[end].x;
  };
  fix(0, 1);
  fix(n - 1, n - 2);
  return out;
}

function routeOne(boxes: Box[], request: RouteRequest, options: RouteOptions): Point[] | null {
  const { from, to } = request;
  const direct = directRoute(boxes, from, to, options);
  if (direct) return direct;
  const blocks = boxes.map((b) => inflate(b, CLEARANCE));
  const start = { x: from.x + STEP[from.side].x * STUB, y: from.y + STEP[from.side].y * STUB };
  const end = { x: to.x + STEP[to.side].x * STUB, y: to.y + STEP[to.side].y * STUB };
  // A port that's covered by another device has no way out.
  if (blocks.some((b) => inside(start, b) || inside(end, b))) return null;

  const xs = channels(
    boxes.map((b) => b.x),
    boxes.map((b) => b.x + b.w),
    [start.x, end.x],
    options.grid,
  );
  const ys = channels(
    boxes.map((b) => b.y),
    boxes.map((b) => b.y + b.h),
    [start.y, end.y],
    options.grid,
  );
  const nx = xs.length;
  const ny = ys.length;
  const at = (i: number, j: number) => ({ x: xs[i], y: ys[j] });
  const find = (values: number[], v: number) => values.indexOf(Math.round(v * 100) / 100);
  const si = find(xs, start.x);
  const sj = find(ys, start.y);
  const ei = find(xs, end.x);
  const ej = find(ys, end.y);

  const open = new Map<number, boolean>();
  const isOpen = (i: number, j: number) => {
    const key = j * nx + i;
    let ok = open.get(key);
    if (ok === undefined) {
      const p = at(i, j);
      ok = !blocks.some((b) => inside(p, b));
      open.set(key, ok);
    }
    return ok;
  };
  const passable = (a: Point, b: Point) => !blocks.some((box) => crosses(a, b, box));

  // Search state: a channel crossing plus whether we arrived running
  // horizontally (0) or vertically (1), so bends can be charged for.
  const horizontal = (side: Side) => (side === "left" || side === "right" ? 0 : 1);
  const startDir = horizontal(from.side);
  const endDir = horizontal(to.side);
  const stateKey = (i: number, j: number, d: number) => (j * nx + i) * 2 + d;
  const best = new Map<number, number>();
  const came = new Map<number, number>();
  const heap = new Heap();
  const guess = (i: number, j: number) => Math.abs(xs[i] - end.x) + Math.abs(ys[j] - end.y);
  const first = stateKey(si, sj, startDir);
  best.set(first, 0);
  heap.push(first, guess(si, sj));
  let goal = -1;
  let goalCost = Infinity;

  while (heap.size > 0) {
    const key = heap.pop();
    const cost = best.get(key)!;
    const d = key % 2;
    const cell = (key - d) / 2;
    const i = cell % nx;
    const j = (cell - i) / nx;
    if (cost + guess(i, j) >= goalCost) break;
    if (i === ei && j === ej) {
      const total = cost + (d === endDir ? 0 : BEND);
      if (total < goalCost) {
        goalCost = total;
        goal = key;
      }
      continue;
    }
    const here = at(i, j);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny || !isOpen(ni, nj)) continue;
      const there = at(ni, nj);
      if (!passable(here, there)) continue;
      // Never double back towards the port the cable just left, or come
      // into the last stretch from the port's own side.
      if (i === si && j === sj && cost === 0 && di === -STEP[from.side].x && dj === -STEP[from.side].y) continue;
      if (ni === ei && nj === ej && di === STEP[to.side].x && dj === STEP[to.side].y) continue;
      const nd = dj === 0 ? 0 : 1;
      const next = cost + Math.abs(there.x - here.x) + Math.abs(there.y - here.y) + (nd === d ? 0 : BEND);
      const nkey = stateKey(ni, nj, nd);
      if (next < (best.get(nkey) ?? Infinity)) {
        best.set(nkey, next);
        came.set(nkey, key);
        heap.push(nkey, next + guess(ni, nj));
      }
    }
  }
  if (goal < 0) return null;

  const path: Point[] = [];
  for (let key: number | undefined = goal; key !== undefined; key = came.get(key)) {
    const cell = (key - (key % 2)) / 2;
    const i = cell % nx;
    path.push(at(i, (cell - i) / nx));
  }
  path.reverse();
  return simplify(alignEnds([{ x: from.x, y: from.y }, ...path, { x: to.x, y: to.y }]));
}

interface Run {
  id: string;
  index: number; // the run goes from points[index] to points[index + 1]
  vertical: boolean;
  at: number;
  lo: number;
  hi: number;
  order: number;
}

// Cables that share a stretch of the same channel are moved apart sideways,
// keeping the runs that leave or reach a port where they are.
function spread(routes: Record<string, Point[] | null>) {
  const runs: Run[] = [];
  for (const [id, points] of Object.entries(routes)) {
    if (!points) continue;
    for (let k = 1; k + 2 < points.length; k++) {
      const a = points[k];
      const b = points[k + 1];
      const vertical = a.x === b.x;
      const prev = points[k - 1];
      runs.push({
        id,
        index: k,
        vertical,
        at: vertical ? a.x : a.y,
        lo: vertical ? Math.min(a.y, b.y) : Math.min(a.x, b.x),
        hi: vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x),
        // Cables arriving from further along sit further along, so they don't cross.
        order: vertical ? prev.x : prev.y,
      });
    }
  }
  const groups = new Map<string, Run[]>();
  for (const run of runs) {
    const key = `${run.vertical}:${Math.round(run.at)}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.lo - b.lo);
    let cluster: Run[] = [];
    let reach = -Infinity;
    const flush = () => {
      const ids = new Set(cluster.map((r) => r.id));
      if (ids.size > 1) {
        cluster.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
        const offsets = cluster.map((_, n) => (n - (cluster.length - 1) / 2) * SPREAD);
        // Slide the whole group sideways if that's what it takes to keep a
        // straight run out of every port, so no cable bends right at its socket.
        let low = -Infinity;
        let high = Infinity;
        cluster.forEach((run, n) => {
          const points = routes[run.id]!;
          const axis = run.vertical ? "x" : "y";
          const limit = (port: Point, bend: Point) => {
            const dir = Math.sign(bend[axis] - port[axis]) || 1;
            // A cable squeezed between close devices keeps the run it has.
            const keep = Math.min(MIN_STUB, Math.abs(bend[axis] - port[axis]));
            // dir * (bend + offsets[n] + shift - port) >= keep
            const bound = (keep - dir * (bend[axis] - port[axis])) / dir - offsets[n];
            if (dir > 0) low = Math.max(low, bound);
            else high = Math.min(high, bound);
          };
          if (run.index === 1) limit(points[0], points[1]);
          if (run.index + 2 === points.length - 1) limit(points[points.length - 1], points[run.index + 1]);
        });
        const shift = low > high ? low : Math.min(Math.max(0, low), high);
        cluster.forEach((run, n) => {
          const offset = offsets[n] + shift;
          const points = routes[run.id]!;
          const axis = run.vertical ? "x" : "y";
          points[run.index] = { ...points[run.index], [axis]: points[run.index][axis] + offset };
          points[run.index + 1] = { ...points[run.index + 1], [axis]: points[run.index + 1][axis] + offset };
        });
      }
      cluster = [];
    };
    for (const run of group) {
      if (run.lo >= reach - 1) flush();
      cluster.push(run);
      reach = Math.max(reach, run.hi);
    }
    flush();
  }
}

// Routes every cable. A cable that can't find a way round (say, its port is
// hidden under another device) gets null and is drawn the simple way.
export function routeCables(boxes: Box[], requests: RouteRequest[], options: RouteOptions = {}): Record<string, Point[] | null> {
  const routes: Record<string, Point[] | null> = {};
  for (const request of requests) routes[request.id] = routeOne(boxes, request, options);
  spread(routes);
  return routes;
}

// An SVG path through the points, with the corners rounded off.
export function routePath(points: Point[], radius: number): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let k = 1; k < points.length; k++) {
    const p = points[k];
    const next = points[k + 1];
    if (!next || radius <= 0) {
      d += ` L ${p.x} ${p.y}`;
      continue;
    }
    const prev = points[k - 1];
    const r = Math.min(radius, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2);
    // Ignore sub-pixel wobble, which would otherwise bend the corner the wrong way.
    const sign = (v: number) => (Math.abs(v) < 0.5 ? 0 : Math.sign(v));
    const inX = p.x - sign(p.x - prev.x) * r;
    const inY = p.y - sign(p.y - prev.y) * r;
    const outX = p.x + sign(next.x - p.x) * r;
    const outY = p.y + sign(next.y - p.y) * r;
    d += ` L ${inX} ${inY} Q ${p.x} ${p.y} ${outX} ${outY}`;
  }
  return d;
}

// The point halfway along the route.
export function routeMiddle(points: Point[]): Point {
  const lengths = points.slice(1).map((p, k) => Math.abs(p.x - points[k].x) + Math.abs(p.y - points[k].y));
  let remaining = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let k = 0; k < lengths.length; k++) {
    if (remaining <= lengths[k]) {
      const t = lengths[k] === 0 ? 0 : remaining / lengths[k];
      return { x: points[k].x + (points[k + 1].x - points[k].x) * t, y: points[k].y + (points[k + 1].y - points[k].y) * t };
    }
    remaining -= lengths[k];
  }
  return points[points.length - 1];
}
