import { describe, expect, it } from "vitest";
import { routeCables, routeMiddle, type Box, type Point } from "./routing";

function crossesBox(points: Point[], box: Box): boolean {
  return points.slice(1).some((b, k) => {
    const a = points[k];
    if (a.y === b.y) return a.y > box.y && a.y < box.y + box.h && Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.w;
    return a.x > box.x && a.x < box.x + box.w && Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.h;
  });
}

function orthogonal(points: Point[]): boolean {
  return points.slice(1).every((b, k) => b.x === points[k].x || b.y === points[k].y);
}

describe("cable routing", () => {
  const left: Box = { x: 0, y: 0, w: 100, h: 100 };
  const middle: Box = { x: 200, y: 0, w: 100, h: 100 };
  const right: Box = { x: 400, y: 0, w: 100, h: 100 };

  it("goes around a device in the way", () => {
    const routes = routeCables([left, middle, right], [{ id: "a", from: { x: 100, y: 50, side: "right" }, to: { x: 400, y: 50, side: "left" } }]);
    const route = routes.a!;
    expect(route).not.toBeNull();
    expect(orthogonal(route)).toBe(true);
    expect(crossesBox(route, middle)).toBe(false);
    expect(route[0]).toEqual({ x: 100, y: 50 });
    expect(route[route.length - 1]).toEqual({ x: 400, y: 50 });
  });

  it("runs straight when nothing is in the way", () => {
    const routes = routeCables([left, right], [{ id: "a", from: { x: 100, y: 50, side: "right" }, to: { x: 400, y: 50, side: "left" } }]);
    expect(routes.a).toEqual([
      { x: 100, y: 50 },
      { x: 400, y: 50 },
    ]);
  });

  it("spreads cables that share a channel", () => {
    const routes = routeCables(
      [left, middle, right],
      [
        { id: "a", from: { x: 100, y: 40, side: "right" }, to: { x: 400, y: 40, side: "left" } },
        { id: "b", from: { x: 100, y: 60, side: "right" }, to: { x: 400, y: 60, side: "left" } },
      ],
    );
    const a = routes.a!;
    const b = routes.b!;
    for (const route of [a, b]) {
      expect(orthogonal(route)).toBe(true);
      expect(crossesBox(route, middle)).toBe(false);
    }
    // No stretch of one cable lies on top of the other.
    const runs = (r: Point[]) => r.slice(1).map((p, k) => [r[k], p]);
    const shared = runs(a).some(([p, q]) =>
      runs(b).some(([s, t]) => {
        if (p.x === q.x && s.x === t.x && p.x === s.x) return Math.min(Math.max(p.y, q.y), Math.max(s.y, t.y)) - Math.max(Math.min(p.y, q.y), Math.min(s.y, t.y)) > 0;
        if (p.y === q.y && s.y === t.y && p.y === s.y) return Math.min(Math.max(p.x, q.x), Math.max(s.x, t.x)) - Math.max(Math.min(p.x, q.x), Math.min(s.x, t.x)) > 0;
        return false;
      }),
    );
    expect(shared).toBe(false);
  });

  it("gives up on a port hidden under another device", () => {
    const routes = routeCables([left, { x: 90, y: 0, w: 100, h: 100 }], [{ id: "a", from: { x: 100, y: 50, side: "right" }, to: { x: 400, y: 50, side: "left" } }]);
    expect(routes.a).toBeNull();
  });

  it("finds the middle of a route", () => {
    expect(routeMiddle([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])).toEqual({ x: 100, y: 0 });
  });
});

describe("cable ends", () => {
  it("leave every port with a straight run, even when spread apart", () => {
    // Two cables from neighbouring ports heading the same way share a lane.
    const box: Box = { x: 0, y: 0, w: 100, h: 100 };
    const far: Box = { x: 400, y: 300, w: 100, h: 100 };
    const routes = routeCables(
      [box, far],
      [
        { id: "a", from: { x: 100, y: 40, side: "right" }, to: { x: 400, y: 340, side: "left" } },
        { id: "b", from: { x: 100, y: 60, side: "right" }, to: { x: 400, y: 360, side: "left" } },
        { id: "c", from: { x: 100, y: 80, side: "right" }, to: { x: 400, y: 380, side: "left" } },
      ],
    );
    for (const route of Object.values(routes)) {
      const first = Math.abs(route![1].x - route![0].x) + Math.abs(route![1].y - route![0].y);
      const n = route!.length;
      const last = Math.abs(route![n - 1].x - route![n - 2].x) + Math.abs(route![n - 1].y - route![n - 2].y);
      expect(first).toBeGreaterThanOrEqual(20);
      expect(last).toBeGreaterThanOrEqual(20);
    }
  });
});
