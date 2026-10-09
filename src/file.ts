import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
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
