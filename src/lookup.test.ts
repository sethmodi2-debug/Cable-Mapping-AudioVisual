import { describe, expect, it } from "vitest";
import { toPreset } from "./lookup";

describe("online lookup", () => {
  it("turns found specs into a device for the list", () => {
    const preset = toPreset({
      manufacturer: "Yamaha",
      model: "Rio1608-D2",
      kind: "Stage box",
      category: "Stage boxes & I/O",
      system: "Audio",
      ports: [
        { name: "Input", direction: "in", connector: "XLR3", protocol: null, count: 16 },
        { name: "Dante Primary", direction: "io", connector: "etherCON", protocol: "Dante", count: 1 },
        { name: "Mystery", direction: "sideways", connector: "XLR3", protocol: null, count: 1 },
        { name: "Thing", direction: "out", connector: "Banana", protocol: "Carrier pigeon", count: 2 },
      ],
      source: "https://example.com",
    });
    expect(preset.category).toBe("Stage boxes & I/O");
    expect(preset.ports).toEqual([
      { name: "Input", direction: "in", connector: "XLR3", protocol: undefined, count: 16 },
      { name: "Dante Primary", direction: "io", connector: "etherCON", protocol: "Dante", count: undefined },
      { name: "Thing", direction: "out", connector: "Other", protocol: undefined, count: 2 },
    ]);
  });

  it("files unknown categories under Generic", () => {
    expect(toPreset({ manufacturer: "", model: "X", kind: "", category: "Lasers", system: "Smell", ports: [], source: "" })).toMatchObject({
      category: "Generic",
      kind: "Device",
      manufacturer: undefined,
      system: undefined,
    });
  });
});
