import { describe, expect, it } from "vitest";
import { portNames } from "./portList";
import type { Port } from "./types";

const port = (name: string, direction: Port["direction"] = "in"): Port => ({ id: name, deviceId: "d", name, direction, connector: "XLR3" });

describe("port names", () => {
  it("folds numbered runs together", () => {
    const ports = ["Input 1", "Input 2", "Input 3", "Talkback", "Input 5"].map((n) => port(n));
    expect(portNames(ports, "in")).toBe("Input 1–3, Talkback, Input 5");
  });

  it("lists only the asked-for direction", () => {
    expect(portNames([port("In"), port("Out", "out"), port("Dante", "io")], "out")).toBe("Out");
  });
});
