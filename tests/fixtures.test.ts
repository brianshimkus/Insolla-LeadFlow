import { describe, expect, it } from "vitest";
import { extractionSchema, presetIds } from "../lib/contracts";
import { fixtures } from "../lib/fixtures";
import { groundExtraction, missingFields, routeFor } from "../lib/logic";
import { presets } from "../lib/presets";

describe("fixtures", () => {
  it("stays grounded and valid for every preset", () => {
    for (const preset of presetIds) {
      const extraction = extractionSchema.parse(fixtures[preset].extraction);
      expect(groundExtraction(extraction, presets[preset].sample)).toEqual(extraction);
      expect(routeFor(extraction.intent)).toBe("New inquiries");
    }
  });

  it("flags only the agency email", () => {
    expect(missingFields("agency", fixtures.agency.extraction)).toEqual(["email"]);
    expect(missingFields("home-services", fixtures["home-services"].extraction)).toEqual([]);
    expect(missingFields("real-estate", fixtures["real-estate"].extraction)).toEqual([]);
  });

  it("asks Taylor for an email and leaves pricing unconfirmed", () => {
    expect(fixtures.agency.draft).toMatch(/email/i);
    expect(fixtures.agency.draft).toMatch(/before confirming pricing or availability/);
  });
});
