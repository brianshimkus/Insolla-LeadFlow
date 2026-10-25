import { describe, expect, it } from "vitest";
import { inputSchema, presetIds } from "../lib/contracts";
import { presets } from "../lib/presets";

describe("lead input", () => {
  it("accepts the agency sample", () => {
    const parsed = inputSchema.safeParse({
      preset: "agency",
      message: presets.agency.sample,
      consent: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing consent, an unknown preset, and a message past the limit", () => {
    expect(
      inputSchema.safeParse({
        preset: "agency",
        message: presets.agency.sample,
        consent: false,
      }).success,
    ).toBe(false);

    expect(
      inputSchema.safeParse({
        preset: "unknown",
        message: presets.agency.sample,
        consent: true,
      }).success,
    ).toBe(false);

    expect(
      inputSchema.safeParse({
        preset: "agency",
        message: "x".repeat(4001),
        consent: true,
      }).success,
    ).toBe(false);
  });

  it("rejects a short message and a request that adds its own field", () => {
    expect(
      inputSchema.safeParse({
        preset: "agency",
        message: "too short",
        consent: true,
      }).success,
    ).toBe(false);

    expect(
      inputSchema.safeParse({
        preset: "agency",
        message: presets.agency.sample,
        consent: true,
        saved: true,
      }).success,
    ).toBe(false);
  });
});

describe("presets", () => {
  it("has one entry for every preset id", () => {
    expect(Object.keys(presets).sort()).toEqual([...presetIds].sort());
  });

  it("leaves the agency email out on purpose", () => {
    expect(presets.agency.required).toContain("email");
    expect(presets.agency.sample.includes("@")).toBe(false);
  });
});
