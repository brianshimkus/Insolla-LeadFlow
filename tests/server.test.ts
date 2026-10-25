import { expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { fixtures } from "../lib/fixtures";
import { presets } from "../lib/presets";
import { DemoError, draftReply, extract } from "../lib/server";

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
