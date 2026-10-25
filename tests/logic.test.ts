import { describe, expect, it } from "vitest";
import type { Extraction } from "../lib/contracts";
import { groundExtraction, missingFields, routeFor } from "../lib/logic";
import { presets } from "../lib/presets";

const taylor: Extraction = {
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
};

describe("groundExtraction", () => {
  it("keeps a fact when the phrase is in the message", () => {
    expect(groundExtraction(taylor, presets.agency.sample)).toEqual(taylor);
  });

  it("drops an email and a city the customer never wrote", () => {
    const lead = groundExtraction(
      { ...taylor, email: "invented@example.com", location: "Boston" },
      presets.agency.sample,
    );

    expect(lead.email).toBeNull();
    expect(lead.location).toBeNull();
    expect(missingFields("agency", lead)).toContain("email");
    expect(missingFields("agency", lead)).not.toContain("budget");
  });

  it("drops a paraphrase of the budget", () => {
    const lead = groundExtraction({ ...taylor, budget: "$8000" }, presets.agency.sample);
    expect(lead.budget).toBeNull();
  });

  it("keeps the original phrase when only case and spacing differ", () => {
    const lead = groundExtraction(
      { ...taylor, service: "Website   Redesign" },
      presets.agency.sample,
    );
    expect(lead.service).toBe("Website   Redesign");
  });

  it("drops an empty value and a value longer than 300 characters", () => {
    const lead = groundExtraction(
      { ...taylor, name: "   ", service: "x".repeat(301) },
      presets.agency.sample,
    );
    expect(lead.name).toBeNull();
    expect(lead.service).toBeNull();
  });

  it("drops email text that is not an email address", () => {
    const lead = groundExtraction({ ...taylor, email: "Fieldwork" }, presets.agency.sample);
    expect(lead.email).toBeNull();
  });

  it("can keep a phrase that was placed on the wrong field", () => {
    const lead = groundExtraction({ ...taylor, location: "Fieldwork" }, presets.agency.sample);
    expect(lead.location).toBe("Fieldwork");
  });

  it("caps the summary and does not require it to be a quote", () => {
    const lead = groundExtraction(
      { ...taylor, summary: "Generated. ".repeat(80) },
      presets.agency.sample,
    );
    expect(lead.summary).toHaveLength(700);
    expect(lead.summary.startsWith("Generated.")).toBe(true);
  });
});

describe("missing fields and destination", () => {
  it("lists the agency email and nothing else for Taylor", () => {
    expect(missingFields("agency", taylor)).toEqual(["email"]);
  });

  it("names a queue for each intent", () => {
    expect(routeFor("new_inquiry")).toBe("New inquiries");
    expect(routeFor("existing_customer")).toBe("Client services");
    expect(routeFor("other")).toBe("Manual review");
  });
});
