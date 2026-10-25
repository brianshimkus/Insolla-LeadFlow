import type { PresetId } from "./contracts";

export const presets = {
  "home-services": {
    label: "Home services",
    business: "Northside Home Services (fictional demo business)",
    context:
      "Handles repair and installation inquiries. Staff must confirm pricing, service area and availability.",
    required: ["name", "email", "service", "location", "timing"],
    sample:
      "Hi, I'm Jordan Lee. We need someone to replace our water heater this week. We're in Lincoln Park. Can you give us an estimate? Email me at jordan@example.com.",
  },
  agency: {
    label: "Agencies",
    business: "Studio North (fictional demo business)",
    context:
      "Receives website and marketing project inquiries. Staff must confirm scope, budget, availability and pricing.",
    required: ["name", "email", "service", "timing", "budget"],
    sample:
      "Hi, I'm Taylor from Fieldwork. We need a website redesign before our January launch. Our budget is around $8,000. Can we discuss the project?",
  },
  "real-estate": {
    label: "Real estate",
    business: "Northside Property Team (fictional demo business)",
    context:
      "Routes property inquiries and showing requests. Staff must confirm listing availability and appointment times.",
    required: ["name", "email", "service", "location", "timing"],
    sample:
      "I'm Sam Rivera. I'd like to view the two-bedroom on Oak Street this Saturday. Is the unit still available? You can reach me at sam@example.com.",
  },
} satisfies Record<
  PresetId,
  {
    label: string;
    business: string;
    context: string;
    required: string[];
    sample: string;
  }
>;
