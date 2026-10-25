import type { Extraction, PresetId } from "./contracts";

export const fixtures: Record<PresetId, { extraction: Extraction; draft: string }> = {
  "home-services": {
    extraction: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: null,
      service: "replace our water heater",
      location: "Lincoln Park",
      timing: "this week",
      budget: null,
      intent: "new_inquiry",
      summary:
        "Jordan requests an estimate for water heater replacement in Lincoln Park this week.",
    },
    draft:
      "Hi Jordan, thanks for reaching out about replacing your water heater in Lincoln Park. Could you share a photo and the current unit's model, if available? Our team can then review the details and follow up about an estimate and scheduling. Your requested timing is noted, but availability still needs to be confirmed.",
  },
  agency: {
    extraction: {
      name: "Taylor",
      email: null,
      phone: null,
      service: "website redesign",
      location: null,
      timing: "before our January launch",
      budget: "around $8,000",
      intent: "new_inquiry",
      summary:
        "Taylor from Fieldwork asks about a website redesign for a January launch, with a budget around $8,000.",
    },
    draft:
      "Hi Taylor, thanks for sharing the website redesign plans and your approximate $8,000 budget. Could you send your current site and the best email address for follow-up? Our team can review the scope and discuss your January launch target before confirming pricing or availability.",
  },
  "real-estate": {
    extraction: {
      name: "Sam Rivera",
      email: "sam@example.com",
      phone: null,
      service: "view the two-bedroom",
      location: "Oak Street",
      timing: "this Saturday",
      budget: null,
      intent: "new_inquiry",
      summary:
        "Sam requests a showing of the two-bedroom on Oak Street this Saturday and asks whether it is available.",
    },
    draft:
      "Hi Sam, thanks for your interest in the two-bedroom on Oak Street. What time on Saturday would work best for you? Our team will need to confirm the listing's availability and showing schedule before arranging an appointment.",
  },
};
