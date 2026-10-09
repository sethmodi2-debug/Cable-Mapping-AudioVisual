import { useSyncExternalStore } from "react";

// The theme comes from a data-theme attribute on <html> when the page sets one
// (some hosts do, and it can differ from the system setting), otherwise from
// the system's light or dark preference. The CSS uses the same rule.
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;

function current(): "light" | "dark" {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return media?.matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  media?.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media?.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

export function useColorMode(): "light" | "dark" {
  return useSyncExternalStore(subscribe, current, () => "light");
}
