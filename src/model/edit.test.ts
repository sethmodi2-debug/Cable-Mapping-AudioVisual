import { describe, expect, it } from "vitest";
import { addCable, addConnection, addDevice, removeCable, removeDevice } from "./edit";
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
