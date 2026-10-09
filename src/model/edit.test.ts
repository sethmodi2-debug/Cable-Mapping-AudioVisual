import { describe, expect, it } from "vitest";
import { addCable, addConnection, addDevice, connectPorts, disconnect, removeCable, removeDevice, removePort } from "./edit";
import { PRESETS, addPreset } from "./presets";
import { emptyShow, validate } from "./show";
import { sampleShow } from "./sample";

describe("addDevice", () => {
  it("creates numbered input and output ports", () => {
    const show = addDevice(emptyShow("t"), { name: "Box", kind: "Stage box", inputs: 2, outputs: 1, connector: "XLR3" });
    expect(show.devices).toHaveLength(1);
    expect(show.ports.map((p) => `${p.name}/${p.direction}`)).toEqual(["Input 1/in", "Input 2/in", "Output 1/out"]);
    expect(show.ports.every((p) => p.deviceId === show.devices[0].id)).toBe(true);
  });
});

describe("building a show", () => {
  it("produces a valid show from the edit helpers", () => {
    let show = emptyShow("t");
    show = addDevice(show, { name: "Mic", kind: "Mic", inputs: 0, outputs: 1, connector: "XLR3" });
    show = addDevice(show, { name: "Box", kind: "Stage box", inputs: 1, outputs: 0, connector: "XLR3" });
    show = addCable(show, { label: "SL-01", connector: "XLR3", protocol: "Analog", lengthM: 10, channels: 1 });
    const [out, inp] = show.ports;
    show = addConnection(show, { fromPortId: out.id, toPortId: inp.id, cableId: show.cables[0].id });
    expect(validate(show)).toEqual([]);
  });
});

describe("removeDevice", () => {
  it("removes the device's ports and connections", () => {
    const show = removeDevice(sampleShow, "d-box");
    expect(show.ports.some((p) => p.deviceId === "d-box")).toBe(false);
    expect(show.connections.map((c) => c.id)).toEqual(["x-5"]);
    expect(validate(show)).toEqual([]);
    expect(sampleShow.devices).toHaveLength(6);
  });
});

describe("removeCable", () => {
  it("unpatches connections and drops links riding on the cable", () => {
    const show = removeCable(sampleShow, "c-cat");
    expect(show.cables.map((c) => c.id)).not.toContain("c-slink");
    const slinkConn = show.connections.find((c) => c.id === "x-4");
    expect(slinkConn).toMatchObject({ cableId: undefined, channel: undefined });
    expect(validate(show)).toEqual([]);
  });
});

describe("connectPorts", () => {
  it("creates a labeled cable and orders source before destination", () => {
    let show = emptyShow("t");
    show = addDevice(show, { name: "Mic", kind: "Mic", inputs: 0, outputs: 1, connector: "XLR3" });
    show = addDevice(show, { name: "Box", kind: "Stage box", inputs: 2, outputs: 0, connector: "XLR3" });
    const [out, in1, in2] = show.ports;
    show = connectPorts(show, in1.id, out.id); // drawn backwards
    show = connectPorts(show, out.id, in2.id);
    expect(show.connections[0]).toMatchObject({ fromPortId: out.id, toPortId: in1.id });
    expect(show.cables.map((c) => c.label)).toEqual(["XLR-01", "XLR-02"]);
    expect(validate(show)).toEqual([]);
  });

  it("makes a multichannel link for network ports", () => {
    let show = emptyShow("t");
    show = addPreset(show, PRESETS.find((p) => p.kind === "Stage box")!, { x: 0, y: 0 });
    show = addPreset(show, PRESETS.find((p) => p.kind === "Console")!, { x: 300, y: 0 });
    const slinks = show.ports.filter((p) => p.protocol === "SLink");
    show = connectPorts(show, slinks[0].id, slinks[1].id);
    expect(show.cables[0]).toMatchObject({ label: "SLINK-01", protocol: "SLink", channels: 128 });
    expect(show.connections[0].channel).toBe(1);
    expect(validate(show)).toEqual([]);
  });
});

describe("addPreset", () => {
  it("names devices by kind and expands counted ports", () => {
    const box = PRESETS.find((p) => p.kind === "Stage box")!;
    let show = addPreset(emptyShow("t"), box, { x: 10, y: 20 });
    show = addPreset(show, box, { x: 10, y: 20 });
    expect(show.devices.map((d) => d.name)).toEqual(["Stage box 1", "Stage box 2"]);
    expect(show.devices[0].position).toEqual({ x: 10, y: 20 });
    expect(show.ports.filter((p) => p.deviceId === show.devices[0].id)).toHaveLength(25);
  });
});

describe("removePort", () => {
  it("removes connections on the port", () => {
    const show = removePort(sampleShow, "p-box-1");
    expect(show.connections.map((c) => c.id)).not.toContain("x-1");
    expect(validate(show)).toEqual([]);
  });
});

describe("disconnect", () => {
  it("drops the cable when nothing else uses it", () => {
    const show = disconnect(sampleShow, "x-1");
    expect(show.cables.map((c) => c.id)).not.toContain("c-1");
  });

  it("keeps a cable that other links ride on", () => {
    const show = disconnect(sampleShow, "x-4");
    expect(show.cables.map((c) => c.id)).not.toContain("c-slink");
    expect(show.cables.map((c) => c.id)).toContain("c-cat");
  });
});
