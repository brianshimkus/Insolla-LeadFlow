import { randomUUID } from "node:crypto";
import { inputSchema, type LeadResult } from "@/lib/contracts";
import { fixtures } from "@/lib/fixtures";
import { missingFields, routeFor } from "@/lib/logic";
import { presets } from "@/lib/presets";

export const runtime = "nodejs";
export const maxDuration = 60;

class DemoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DemoError";
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const origin =
      process.env.APP_ORIGIN ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
    if (!origin) {
      throw new DemoError(503, "CONFIGURATION", "The demo origin is not configured.");
    }
    if (request.headers.get("origin") !== new URL(origin).origin) {
      throw new DemoError(403, "ORIGIN", "Please open the demo page and submit the form there.");
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new DemoError(415, "CONTENT_TYPE", "Expected a JSON submission.");
    }

    const body = await request.text();
    if (new TextEncoder().encode(body).length > 20_000) {
      throw new DemoError(413, "BODY_TOO_LARGE", "That submission is too long.");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new DemoError(400, "INVALID_JSON", "That submission could not be read.");
    }

    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DemoError(
        400,
        "INVALID_INPUT",
        "Use 20-4,000 characters and confirm the demo-data checkbox.",
      );
    }

    const { preset, message } = parsed.data;
    const mode = process.env.LEADFLOW_MODE || "fixture";

    if (mode === "live") {
      throw new DemoError(503, "CONFIGURATION", "Live mode is not connected yet.");
    }
    if (mode !== "fixture") {
      throw new DemoError(503, "CONFIGURATION", "Invalid demo mode.");
    }
    if (message !== presets[preset].sample) {
      throw new DemoError(
        400,
        "FIXTURE_ONLY",
        "Sample simulation only. Load a built-in example, or configure live mode to process your own text.",
      );
    }

    const { extraction, draft } = fixtures[preset];
    const result: LeadResult = {
      id: randomUUID(),
      mode: "fixture",
      saved: false,
      elapsedMs: Date.now() - started,
      extraction,
      missing: missingFields(preset, extraction),
      route: routeFor(extraction.intent),
      draft,
    };
    return json(result);
  } catch (error) {
    if (error instanceof DemoError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error("LeadFlow request failed", error instanceof Error ? error.name : "UnknownError");
    return json(
      { error: "The demo could not finish. Please try again; no reply was sent.", code: "UPSTREAM_FAILURE" },
      502,
    );
  }
}
