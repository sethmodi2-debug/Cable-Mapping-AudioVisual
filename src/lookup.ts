import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CATEGORIES, type Category, type PortSpec, type Preset } from "./model/presets";
import { SYSTEMS } from "./model/systems";
import type { Connector, Direction, Protocol, SystemType } from "./model/types";

// Looks a product up on the web and turns its spec sheet into a device that
// can go in the Add device list. Claude does the searching and reading; the
// user brings their own Anthropic API key, which stays on this computer.

const CONNECTORS: Connector[] = ["XLR3", "XLR5", "TRS", "TS", "speakON", "etherCON", "RJ45", "BNC", "HDMI", "DisplayPort", "Fiber", "Other"];
const PROTOCOLS: Protocol[] = ["Analog", "AES3", "Dante", "AES50", "SLink", "gigaACE", "dSNAKE", "MADI", "AVB", "Optocore", "TWINLANe", "SDI", "HDMI", "NDI"];
const DIRECTIONS: Direction[] = ["in", "out", "io"];

const ADD_DEVICE = {
  name: "add_device",
  description:
    "Add the product to the user's device list. Call this exactly once, after you have found the product's spec sheet, with its physical inputs, outputs and network ports.",
  strict: true,
  input_schema: {
    type: "object" as const,
    properties: {
      manufacturer: { type: "string", description: "Brand, e.g. Allen & Heath" },
      model: { type: "string", description: "Model name as the maker writes it, e.g. DX168" },
      kind: { type: "string", description: "What sort of device it is, in a few words: Console, Stage box, Mic, Video switcher, Amp…" },
      category: { type: "string", enum: [...CATEGORIES] },
      system: { type: "string", enum: SYSTEMS.map((s) => s.name) },
      ports: {
        type: "array",
        description: "One entry per group of identical sockets, e.g. 16 XLR mic inputs is one entry with count 16.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short socket name without a number, e.g. Input, Output, AES Out, Dante Primary" },
            direction: { type: "string", enum: DIRECTIONS, description: "in, out, or io for network ports that work both ways" },
            connector: { type: "string", enum: CONNECTORS },
            protocol: { type: ["string", "null"], enum: [...PROTOCOLS, null], description: "What it carries, when it's digital or networked" },
            count: { type: "integer", description: "How many of these sockets the product has" },
          },
          required: ["name", "direction", "connector", "protocol", "count"],
          additionalProperties: false,
        },
      },
      source: { type: "string", description: "URL of the page the specs came from" },
    },
    required: ["manufacturer", "model", "kind", "category", "system", "ports", "source"],
    additionalProperties: false,
  },
};

export interface FoundDevice {
  manufacturer: string;
  model: string;
  kind: string;
  category: string;
  system: string;
  ports: { name: string; direction: string; connector: string; protocol: string | null; count: number }[];
  source: string;
}

export interface FoundPreset extends Preset {
  source?: string;
}

const SYSTEM_PROMPT = `You help live sound and video engineers map their cabling. When given a product name, search the web for that exact product's official specifications and report its rear-panel connections with the add_device tool.

List physical sockets only: analog and digital audio, video, speaker outputs, and network or digital-snake ports (Dante, AES50, SLink, gigaACE, MADI and so on). Leave out power, USB for firmware, headphone sockets, footswitches and talkback unless they're the device's main I/O. Prefer the manufacturer's own page. If the name matches several products, pick the most common current one. If you can't find the product at all, say so in one sentence instead of calling the tool.`;

export function toPreset(found: FoundDevice): FoundPreset {
  const ports: PortSpec[] = found.ports
    .filter((p) => DIRECTIONS.includes(p.direction as Direction) && p.count > 0)
    .map((p) => ({
      name: p.name,
      direction: p.direction as Direction,
      connector: CONNECTORS.includes(p.connector as Connector) ? (p.connector as Connector) : "Other",
      protocol: p.protocol && PROTOCOLS.includes(p.protocol as Protocol) ? (p.protocol as Protocol) : undefined,
      count: p.count > 1 ? Math.min(p.count, 256) : undefined,
    }));
  return {
    kind: found.kind || "Device",
    manufacturer: found.manufacturer || undefined,
    model: found.model,
    category: (CATEGORIES as readonly string[]).includes(found.category) ? (found.category as Category) : "Generic",
    system: SYSTEMS.some((s) => s.name === found.system) ? (found.system as SystemType) : undefined,
    ports,
    source: found.source || undefined,
  };
}

function isFoundDevice(input: unknown): input is FoundDevice {
  const d = input as FoundDevice;
  return !!d && typeof d.model === "string" && Array.isArray(d.ports);
}

function lastText(content: BetaContentBlock[]): string {
  const texts = content.filter((b) => b.type === "text").map((b) => b.text.trim());
  return texts.filter(Boolean).pop() ?? "";
}

export async function lookUpDevice(query: string, apiKey: string): Promise<FoundPreset> {
  // The app runs on the user's own machine with their own key, so calling
  // the API straight from the app is what's wanted here.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages: BetaMessageParam[] = [{ role: "user", content: `Look up this product and add it: ${query}` }];

  // Web search runs on Anthropic's side and can pause a long turn; carry on
  // from where it stopped a few times before giving up.
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }, ADD_DEVICE],
      messages,
    });
    if (response.stop_reason === "refusal") throw new Error("The lookup was declined. Try a more specific product name.");
    const call = response.content.find((b) => b.type === "tool_use" && b.name === "add_device");
    if (call && call.type === "tool_use") {
      if (!isFoundDevice(call.input)) throw new Error("The specs came back incomplete. Try again.");
      return toPreset(call.input);
    }
    if (response.stop_reason !== "pause_turn") {
      throw new Error(lastText(response.content) || `Couldn't find specs for “${query}”.`);
    }
    messages.push({ role: "assistant", content: response.content });
  }
  throw new Error("The lookup took too long. Try a more specific product name.");
}

export function lookupErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "That API key wasn't accepted. Check it and try again.";
  if (e instanceof Anthropic.RateLimitError) return "Too many lookups at once. Wait a moment and try again.";
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach the lookup service. Check the internet connection.";
  if (e instanceof Anthropic.APIError) return `Lookup failed (${e.status ?? "error"}): ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
