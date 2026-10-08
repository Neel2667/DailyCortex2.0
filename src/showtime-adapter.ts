export { ShowtimeRunner } from "./showtime/runner.js";
export { ShowtimeProjectBuilder } from "./showtime/project-builder.js";
export { ShowtimeHtmlBuilder } from "./showtime/html-builder.js";

import type { ContentSpec } from "./types.js";

/**
 * Legacy brief generator maintained for backward compatibility.
 */
export function toShowtimeBrief(s: ContentSpec): string {
  return [
    `Title: ${s.title}`,
    `Format: ${s.format}; duration: ${s.durationSec}s`,
    `Hook: ${s.hook}`,
    `Narration: ${s.script}`,
    "Scenes:",
    ...s.scenes.map((x, i) => `${i + 1}. [${x.durationSec}s] ${x.type}: ${x.visualPrompt ?? x.caption ?? ""}`),
    "Production rules: strong first two seconds; visual change every few seconds; captions synchronized; use meaningful real footage; avoid generic AI filler."
  ].join("\n");
}
