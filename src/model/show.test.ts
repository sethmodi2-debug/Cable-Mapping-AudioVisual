import { describe, expect, it } from "vitest";
import { parse, patchList, pullList, serialize, validate } from "./show";
import { sampleShow } from "./sample";
import type { Show } from "./types";

function clone(show: Show): Show {
  return structuredClone(show);
}

describe("validate", () => {
  it("accepts the sample show", () => {
    expect(validate(sampleShow)).toEqual([]);
  });

  it("flags a channel used twice on a link", () => {
    const show = clone(sampleShow);
    show.connections.push({ id: "x-dup", fromPortId: "p-box-slink", toPortId: "p-desk-slink", cableId: "c-slink", channel: 1 });
    expect(validate(show).map((i) => i.message)).toContain("SLINK-A channel 1 is used twice");
  });

  it("flags a channel past the end of a link", () => {
    const show = clone(sampleShow);
    show.connections[4].channel = 65;
    expect(validate(show).map((i) => i.message)).toContain("DANTE-REC has no channel 65");
  });

  it("flags a multichannel link with no channel set", () => {
    const show = clone(sampleShow);
    delete show.connections[4].channel;
    expect(validate(show)[0].message).toMatch(/no channel is set/);
  });

  it("flags an input used as a source", () => {
    const show = clone(sampleShow);
    show.connections.push({ id: "x-bad", fromPortId: "p-box-1", toPortId: "p-box-2" });
    expect(validate(show).map((i) => i.message)).toContain('"Input 1" is an input but is used as a source');
  });

  it("flags two sources plugged into one input", () => {
    const show = clone(sampleShow);
    show.connections.push({ id: "x-two", fromPortId: "p-vox", toPortId: "p-box-1" });
    expect(validate(show).map((i) => i.message)).toContain("Stage box Input 1 has 2 sources plugged in");
  });

  it("flags missing references", () => {
    const show = clone(sampleShow);
    show.connections.push({ id: "x-ghost", fromPortId: "nope", toPortId: "p-box-1" });
    show.cables.push({ id: "c-orphan", label: "ORPHAN", connector: "RJ45", protocol: "Dante", channels: 64, parentCableId: "gone" });
    const messages = validate(show).map((i) => i.message);
    expect(messages).toContain("Connection points at a missing port");
    expect(messages).toContain("ORPHAN rides on a missing cable");
  });
});

describe("patchList", () => {
  it("lists every connection sorted by destination", () => {
    const rows = patchList(sampleShow);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => `${r.toDevice} ${r.toPort}`)).toEqual([
      "FOH desk SLink",
      "Recorder Dante Primary",
      "Stage box Input 1",
      "Stage box Input 2",
      "Stage box Input 3",
    ]);
    expect(rows[0]).toMatchObject({ fromDevice: "Stage box", cable: "SLINK-A", protocol: "SLink", channel: 1 });
  });
});

describe("pullList", () => {
  it("groups physical cables and skips links riding on another cable", () => {
    expect(pullList(sampleShow)).toEqual([
      { connector: "etherCON", lengthM: 50, channels: 1, count: 1 },
      { connector: "RJ45", lengthM: 2, channels: 64, count: 1 },
      { connector: "XLR3", lengthM: 5, channels: 1, count: 1 },
      { connector: "XLR3", lengthM: 10, channels: 1, count: 2 },
    ]);
  });
});

describe("serialize and parse", () => {
  it("round-trips a show", () => {
    expect(parse(serialize(sampleShow))).toEqual(sampleShow);
  });

  it("rejects an unknown format version", () => {
    expect(() => parse('{"formatVersion": 2}')).toThrow(/version/);
  });

  it("rejects a file missing a collection", () => {
    expect(() => parse('{"formatVersion": 1, "devices": []}')).toThrow(/ports/);
  });
});
