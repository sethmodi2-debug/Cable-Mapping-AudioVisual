import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { patchList, pullList } from "./model/show";
import type { Show } from "./model/types";

const IMAGE_WIDTH = 2400;
const IMAGE_HEIGHT = 1500;

// Renders the whole map (not just the visible part) to a JPEG.
async function mapImage(viewportEl: HTMLElement, nodes: Node[], background: string): Promise<string> {
  const bounds = getNodesBounds(nodes);
  const vp = getViewportForBounds(bounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.2, 2, 0.05);
  return toJpeg(viewportEl, {
    quality: 0.9,
    backgroundColor: background,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    pixelRatio: 1,
    style: {
      width: `${IMAGE_WIDTH}px`,
      height: `${IMAGE_HEIGHT}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  });
}

export async function buildShowPdf(show: Show, viewportEl: HTMLElement, nodes: Node[], background: string): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const date = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.text(show.name || "Untitled show", margin, margin + 8);
  doc.setFontSize(10);
  doc.text(`Cable map · ${date}`, margin, margin + 24);

  if (nodes.length > 0) {
    const img = await mapImage(viewportEl, nodes, background);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2 - 40;
    const scale = Math.min(maxW / IMAGE_WIDTH, maxH / IMAGE_HEIGHT);
    doc.addImage(img, "JPEG", margin, margin + 36, IMAGE_WIDTH * scale, IMAGE_HEIGHT * scale);
  }

  const ports = new Map(show.ports.map((p) => [p.id, p]));
  const devices = new Map(show.devices.map((d) => [d.id, d]));
  const end = (portId: string) => {
    const port = ports.get(portId);
    return port ? `${devices.get(port.deviceId)?.name ?? "?"} · ${port.name}` : "?";
  };

  doc.addPage();
  doc.setFontSize(14);
  doc.text("Patch list", margin, margin + 8);
  autoTable(doc, {
    startY: margin + 18,
    head: [["Cable", "From device", "Plugs out of", "To device", "Plugs into", "Signal", "Channel"]],
    body: patchList(show).map((r) => [r.cable, r.fromDevice, r.fromPort, r.toDevice, r.toPort, r.protocol ?? "", r.channel ?? ""]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text("Cable schedule", margin, margin + 8);
  autoTable(doc, {
    startY: margin + 18,
    head: [["Label", "Connector", "Signal", "Length (m)", "Channels", "Runs"]],
    body: show.cables.map((c) => [
      c.label,
      c.connector,
      c.protocol,
      c.lengthM ?? "",
      c.channels,
      show.connections
        .filter((conn) => conn.cableId === c.id)
        // jsPDF's built-in fonts have no arrow glyph, so runs use "->".
        .map((conn) => `${end(conn.fromPortId)} -> ${end(conn.toPortId)}`)
        .join("\n"),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const afterSchedule = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? margin;
  doc.setFontSize(14);
  doc.text("Pull list", margin, afterSchedule + 28);
  autoTable(doc, {
    startY: afterSchedule + 38,
    head: [["Connector", "Length (m)", "Channels", "Qty"]],
    body: pullList(show).map((r) => [r.connector, r.lengthM ?? "", r.channels, r.count]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  return doc;
}
