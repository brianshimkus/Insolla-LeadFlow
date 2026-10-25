import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "../app/api/leadflow/route";
import { presets } from "../lib/presets";

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/leadflow", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const input = { preset: "agency", message: presets.agency.sample, consent: true };

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("LEADFLOW_MODE", "fixture");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it("returns the agency sample as an unsaved preview", async () => {
  const response = await POST(request(input));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({
    mode: "fixture",
    saved: false,
    missing: ["email"],
    route: "New inquiries",
    extraction: { name: "Taylor", email: null, budget: "around $8,000" },
  });
});

it("rejects an edited message in fixture mode", async () => {
  const response = await POST(
    request({ ...input, message: "A completely different inquiry about a website." }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "FIXTURE_ONLY" });
});

it("rejects a request from another site", async () => {
  const response = await POST(request(input, "https://other.example"));
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "ORIGIN" });
});

it("rejects a submission that has not confirmed the demo data", async () => {
  const response = await POST(request({ ...input, consent: false }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_INPUT" });
});

it("does not return a sample when the mode is live", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "CONFIGURATION" });
});
