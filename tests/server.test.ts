import { expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { fixtures } from "../lib/fixtures";
import { presets } from "../lib/presets";
import { DemoError, draftReply, extract, supabaseClient, verifyHuman } from "../lib/server";

vi.mock("server-only", () => ({}));

function client(parseResult: unknown, createResult?: unknown) {
  return {
    responses: {
      parse: vi.fn().mockResolvedValue(parseResult),
      create: vi.fn().mockResolvedValue(createResult),
    },
  } as unknown as OpenAI & {
    responses: { parse: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };
}

const parsed = {
  status: "completed",
  output_parsed: { ...fixtures.agency.extraction, email: "invented@example.com", location: "Boston" },
};

it("refuses a database client when the server credentials are missing", () => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  try {
    expect(() => supabaseClient()).toThrow(DemoError);
  } finally {
    vi.unstubAllEnvs();
  }
});

it("drops contact details the model added", async () => {
  const openai = client(parsed);
  const lead = await extract(openai, "agency", presets.agency.sample);

  expect(lead.email).toBeNull();
  expect(lead.location).toBeNull();
  expect(lead.budget).toBe("around $8,000");
  expect(openai.responses.parse).toHaveBeenCalledWith(expect.objectContaining({ store: false }));
});

it("rejects an extraction that did not finish", async () => {
  const openai = client({ status: "incomplete", output_parsed: null });
  await expect(extract(openai, "agency", presets.agency.sample)).rejects.toMatchObject({
    code: "AI_EXTRACTION",
  });
});

function verificationEnv() {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
  vi.stubEnv("TURNSTILE_HOSTNAMES", "localhost, demo.example");
}

it("rejects a visitor before asking Cloudflare when the token or the settings are missing", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_HOSTNAMES", "");
  try {
    await expect(verifyHuman(undefined)).rejects.toMatchObject({ code: "CONFIGURATION" });
    verificationEnv();
    await expect(verifyHuman("")).rejects.toMatchObject({ code: "VERIFICATION" });
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

it("accepts a token only for an allowed hostname and the leadflow action", async () => {
  verificationEnv();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, hostname: "demo.example", action: "leadflow" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  try {
    await verifyHuman("token-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      secret: "secret",
      response: "token-1",
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, hostname: "localhost", action: "leadflow" }),
    });
    await expect(verifyHuman("token-bad")).rejects.toMatchObject({ code: "VERIFICATION" });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, hostname: "elsewhere.example", action: "leadflow" }),
    });
    await expect(verifyHuman("token-2")).rejects.toMatchObject({ code: "VERIFICATION" });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, hostname: "localhost", action: "other" }),
    });
    await expect(verifyHuman("token-3")).rejects.toMatchObject({ code: "VERIFICATION" });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false }),
    });
    await expect(verifyHuman("token-4")).rejects.toMatchObject({ code: "VERIFICATION_UNAVAILABLE" });
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

it("returns a trimmed draft and refuses an empty one", async () => {
  const openai = client(null, { status: "completed", output_text: "  Please send an email.  " });
  const draft = await draftReply(openai, "agency", fixtures.agency.extraction, ["email"]);
  expect(draft).toBe("Please send an email.");
  expect(openai.responses.create).toHaveBeenCalledWith(expect.objectContaining({ store: false }));

  const empty = client(null, { status: "completed", output_text: "   " });
  await expect(draftReply(empty, "agency", fixtures.agency.extraction, ["email"])).rejects.toBeInstanceOf(
    DemoError,
  );
});
