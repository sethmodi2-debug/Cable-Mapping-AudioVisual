import type { Node } from "@xyflow/react";
import { buildShowPdf } from "./exportPdf";
import { savePdf } from "./file";
import type { Show } from "./model/types";

// Builds the PDF (map, patch list, cable schedule, pull list) and saves it.
export async function exportShowPdf(show: Show, viewport: HTMLElement, nodes: Node[], background: string) {
  const doc = await buildShowPdf(show, viewport, nodes, background);
  const name = `${(show.name || "show").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
  await savePdf(doc.output("arraybuffer"), name);
}
