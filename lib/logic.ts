import type { Extraction, PresetId } from "./contracts";
import { presets } from "./presets";

const quotedFields = ["name", "email", "phone", "service", "location", "timing", "budget"] as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

// A quoted field survives only when that phrase appears in the message.
// Summary and intent are judgments, so this function does not look for them in the text.
export function groundExtraction(extraction: Extraction, message: string): Extraction {
  const grounded = { ...extraction };
  const source = normalize(message);

  for (const key of quotedFields) {
    const value = grounded[key];
    if (value === null) continue;

    const missingFromMessage = !source.includes(normalize(value));
    if (!value.trim() || value.length > 300 || missingFromMessage) {
      grounded[key] = null;
    }
  }

  if (grounded.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(grounded.email)) {
    grounded.email = null;
  }

  grounded.summary = grounded.summary.slice(0, 700);
  return grounded;
}

export function missingFields(preset: PresetId, lead: Extraction) {
  return presets[preset].required.filter((key) => !lead[key as keyof Extraction]);
}

export function routeFor(intent: Extraction["intent"]) {
  return {
    new_inquiry: "New inquiries",
    existing_customer: "Client services",
    other: "Manual review",
  }[intent];
}
