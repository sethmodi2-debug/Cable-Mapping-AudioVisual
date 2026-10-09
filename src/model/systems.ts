import type { Device, Port, Protocol, SystemType } from "./types";

export const SYSTEMS: { name: SystemType; color: string }[] = [
  { name: "Audio", color: "#2563eb" },
  { name: "Video", color: "#db2777" },
  { name: "Lighting", color: "#d97706" },
  { name: "Network", color: "#059669" },
  { name: "Control", color: "#7c3aed" },
  { name: "Power", color: "#dc2626" },
];

export function systemColor(system: SystemType): string {
  return SYSTEMS.find((s) => s.name === system)?.color ?? "#6b7280";
}

const VIDEO_PROTOCOLS: Protocol[] = ["SDI", "HDMI", "NDI"];

// A device's system: the one set on it, or a guess from its kind and ports
// (video signals mean Video, a switch means Network, anything else Audio).
export function deviceSystem(device: Device, ports: Port[]): SystemType {
  if (device.system) return device.system;
  if (/switch|router/i.test(device.kind) && !/video/i.test(device.kind)) return "Network";
  const video = ports.some(
    (p) => (p.protocol && VIDEO_PROTOCOLS.includes(p.protocol)) || p.connector === "HDMI" || p.connector === "DisplayPort",
  );
  return video ? "Video" : "Audio";
}

// Ports that join a network and so can have an IP address.
export function isNetworkPort(port: Port): boolean {
  return port.direction === "io" || port.connector === "etherCON" || port.connector === "RJ45";
}
