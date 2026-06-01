import type { Mode, OutputShape } from "./types.js";

export const modes = new Set<Mode>([
  "ask",
  "research",
  "review",
  "debug",
  "plan",
  "summarize"
]);

export function parseMode(value: string | undefined): Mode {
  if (!value) return "ask";
  if (modes.has(value as Mode)) return value as Mode;
  throw new Error(`Unknown mode "${value}". Use one of: ${Array.from(modes).join(", ")}`);
}

export function outputShapeFor(mode: Mode): OutputShape {
  switch (mode) {
    case "research":
      return { maxBullets: 8, requireSources: true, requireNextAction: true };
    case "review":
      return { maxBullets: 10, requireSources: false, requireNextAction: true };
    case "debug":
      return { maxBullets: 8, requireSources: false, requireNextAction: true };
    case "plan":
      return { maxBullets: 7, requireSources: false, requireNextAction: true };
    case "summarize":
      return { maxBullets: 6, requireSources: false, requireNextAction: false };
    case "ask":
      return { maxBullets: 6, requireSources: false, requireNextAction: true };
  }
}
