import { z } from "zod";

export const presetIds = ["home-services", "agency", "real-estate"] as const;

// The browser may send only these fields. consent has to be true.
// turnstileToken is optional because fixture mode has no verification widget.
export const inputSchema = z
  .object({
    preset: z.enum(presetIds),
    message: z.string().trim().min(20).max(4000),
    consent: z.literal(true),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();

// A missing fact is null. The model has to return every key.
export const extractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  service: z.string().nullable(),
  location: z.string().nullable(),
  timing: z.string().nullable(),
  budget: z.string().nullable(),
  intent: z.enum(["new_inquiry", "existing_customer", "other"]),
  summary: z.string(),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type PresetId = (typeof presetIds)[number];
export type LeadInput = z.infer<typeof inputSchema>;

export type LeadResult = {
  id: string;
  mode: "fixture" | "live";
  saved: boolean;
  elapsedMs: number;
  extraction: Extraction;
  missing: string[];
  route: string;
  draft: string;
};
