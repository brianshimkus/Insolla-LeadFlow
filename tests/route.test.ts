import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/server")>();
  return { ...actual, extract: vi.fn(), draftReply: vi.fn() };
});

import { POST } from "../app/api/leadflow/route";
import { fixtures } from "../lib/fixtures";
import { presets } from "../lib/presets";
import { draftReply, extract } from "@/lib/server";

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/leadflow", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const input = { preset: "agency", message: presets.agency.sample, consent: true };

beforeEach(() => {
  vi.clearAllMocks();
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
  expect(extract).not.toHaveBeenCalled();
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

it("refuses live mode when the API key is missing", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "CONFIGURATION" });
  expect(extract).not.toHaveBeenCalled();
});

it("returns a live result without claiming it was saved", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.mocked(extract).mockResolvedValue(fixtures.agency.extraction);
  vi.mocked(draftReply).mockResolvedValue("Please send the best email address for follow-up.");

  const response = await POST(
    request({
      ...input,
      message: "A different inquiry about a website redesign before a January launch.",
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    mode: "live",
    saved: false,
    missing: ["email"],
    route: "New inquiries",
    draft: "Please send the best email address for follow-up.",
  });
});

it("skips the draft when the inquiry needs manual review", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.mocked(extract).mockResolvedValue({ ...fixtures.agency.extraction, intent: "other" });

  const response = await POST(request(input));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    mode: "live",
    saved: false,
    route: "Manual review",
    draft: "Manual review needed before drafting a customer reply.",
  });
  expect(draftReply).not.toHaveBeenCalled();
});
