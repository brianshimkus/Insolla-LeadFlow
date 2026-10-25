import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/server")>();
  return { ...actual, extract: vi.fn(), draftReply: vi.fn(), supabaseClient: vi.fn(), verifyHuman: vi.fn() };
});

import { POST } from "../app/api/leadflow/route";
import { fixtures } from "../lib/fixtures";
import { presets } from "../lib/presets";
import { DemoError, draftReply, extract, supabaseClient, verifyHuman } from "@/lib/server";

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/leadflow", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const input = { preset: "agency", message: presets.agency.sample, consent: true };

function mockDatabase({
  allowed = true,
  reserveError = null as unknown,
  insertError = null as unknown,
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const rpc = vi.fn().mockResolvedValue({ data: allowed, error: reserveError });
  vi.mocked(supabaseClient).mockReturnValue({
    rpc,
    from: () => ({ insert }),
  } as unknown as ReturnType<typeof supabaseClient>);
  return { insert, rpc };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("LEADFLOW_MODE", "fixture");
  vi.mocked(verifyHuman).mockResolvedValue(undefined);
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
  expect(supabaseClient).not.toHaveBeenCalled();
  expect(verifyHuman).not.toHaveBeenCalled();
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
  expect(supabaseClient).not.toHaveBeenCalled();
  expect(verifyHuman).not.toHaveBeenCalled();
});

it("does not call the model when the database is not configured", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.mocked(supabaseClient).mockImplementation(() => {
    throw new DemoError(503, "CONFIGURATION", "The live demo is not configured yet.");
  });

  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "CONFIGURATION" });
  expect(extract).not.toHaveBeenCalled();
  expect(verifyHuman).not.toHaveBeenCalled();
});

it("does not count the hour when verification fails", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const { rpc } = mockDatabase();
  vi.mocked(verifyHuman).mockRejectedValue(
    new DemoError(400, "VERIFICATION", "Please complete the verification and try again."),
  );

  const response = await POST(request(input));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "VERIFICATION" });
  expect(rpc).not.toHaveBeenCalled();
  expect(extract).not.toHaveBeenCalled();
});

it("saves a live result only after the row is written", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const order: string[] = [];
  const { insert, rpc } = mockDatabase();
  vi.mocked(verifyHuman).mockImplementation(async () => {
    order.push("verify");
  });
  rpc.mockImplementation(async () => {
    order.push("reserve");
    return { data: true, error: null };
  });
  vi.mocked(extract).mockImplementation(async () => {
    order.push("extract");
    return fixtures.agency.extraction;
  });
  vi.mocked(draftReply).mockResolvedValue("Please send the best email address for follow-up.");

  const message = "A different inquiry about a website redesign before a January launch.";
  const response = await POST(request({ ...input, message }));

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    mode: "live",
    saved: true,
    missing: ["email"],
    route: "New inquiries",
    draft: "Please send the best email address for follow-up.",
  });
  expect(order).toEqual(["verify", "reserve", "extract"]);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      preset: "agency",
      original_message: message,
      route: "New inquiries",
      missing_fields: ["email"],
    }),
  );
});

it("does not call the model when the shared hour is full", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mockDatabase({ allowed: false });

  const response = await POST(request(input));
  expect(response.status).toBe(429);
  expect(await response.json()).toMatchObject({ code: "DEMO_LIMIT" });
  expect(extract).not.toHaveBeenCalled();
});

it("does not call the model when the counter is unavailable", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mockDatabase({ reserveError: { message: "unavailable" } });

  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "USAGE_STORE" });
  expect(extract).not.toHaveBeenCalled();
});

it("does not claim a row was saved when the insert fails", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mockDatabase({ insertError: { message: "unavailable" } });
  vi.mocked(extract).mockResolvedValue(fixtures.agency.extraction);
  vi.mocked(draftReply).mockResolvedValue("Please send an email.");

  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "SAVE_FAILED" });
});

it("skips the draft when the inquiry needs manual review", async () => {
  vi.stubEnv("LEADFLOW_MODE", "live");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mockDatabase();
  vi.mocked(extract).mockResolvedValue({ ...fixtures.agency.extraction, intent: "other" });

  const response = await POST(request(input));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    mode: "live",
    saved: true,
    route: "Manual review",
    draft: "Manual review needed before drafting a customer reply.",
  });
  expect(draftReply).not.toHaveBeenCalled();
});
