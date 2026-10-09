import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { addPreset, PRESETS } from "./presets";
import { emptyShow } from "./show";
import { deviceSystem, isNetworkPort } from "./systems";

const add = (kind: string) => {
  const preset = [...PRESETS, ...CATALOG].find((p) => (p.model ?? p.kind) === kind)!;
  const show = addPreset(emptyShow("t"), preset, { x: 0, y: 0 });
  return { device: show.devices[0], ports: show.ports };
};

describe("device systems", () => {
  it("tags devices by what they carry", () => {
    expect(add("Mic").device.system).toBe("Audio");
    expect(add("Camera").device.system).toBe("Video");
    expect(add("Projector").device.system).toBe("Video");
    expect(add("Dante switch").device.system).toBe("Network");
  });

  it("guesses a system for devices saved without one", () => {
    const { device, ports } = add("Video switcher");
    expect(deviceSystem({ ...device, system: undefined }, ports)).toBe("Video");
  });
});

describe("network ports", () => {
  it("gives every console a network port for an IP address", () => {
    for (const name of ["VENUE Profile", "SQ-6", "CL5"]) {
      expect(add(name).ports.some(isNetworkPort), name).toBe(true);
    }
  });

  it("does not treat a mic as networked", () => {
    expect(add("Mic").ports.some(isNetworkPort)).toBe(false);
  });
});
