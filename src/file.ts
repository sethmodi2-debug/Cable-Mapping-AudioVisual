import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { parse, serialize } from "./model/show";
import type { Show } from "./model/types";

const filters = [{ name: "Cable Map show", extensions: ["cablemap.json", "json"] }];

// Returns null when the user cancels the dialog.
export async function openShowFile(): Promise<{ path: string; show: Show } | null> {
  const path = await open({ multiple: false, directory: false, filters });
  if (typeof path !== "string") return null;
  return { path, show: parse(await readTextFile(path)) };
}

export async function saveShowFile(show: Show, path?: string): Promise<string | null> {
  const target = path ?? (await save({ filters, defaultPath: `${show.name || "show"}.cablemap.json` }));
  if (!target) return null;
  await writeTextFile(target, serialize(show));
  return target;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Saves a PDF through the native save dialog in the desktop app, or as a
// browser download in the web preview. Returns null when the user cancels.
export async function savePdf(data: ArrayBuffer, suggestedName: string): Promise<string | null> {
  if (!isTauri) {
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return suggestedName;
  }
  const target = await save({ filters: [{ name: "PDF", extensions: ["pdf"] }], defaultPath: suggestedName });
  if (!target) return null;
  await writeFile(target, new Uint8Array(data));
  return target;
}

// Opens a web page in the system browser from the desktop app. Returns false
// in the web preview, where a normal link already does that.
export function openInBrowser(url: string): boolean {
  if (!isTauri) return false;
  void openUrl(url);
  return true;
}
