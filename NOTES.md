# Notes

A running log of decisions and surprises while building LeadFlow. Newest entry at the top.

## 2026-10-25 — the rules between the two model calls

`lib/logic.ts` runs after extraction and before the draft. Three functions, in that order:

1. `groundExtraction` keeps a fact only when its phrase appears in the message. Case and extra spaces do not matter. The stored phrase stays as the model wrote it.
2. `missingFields` walks that preset's required list and keeps the keys that are still empty.
3. `routeFor` maps intent to a queue name. The map is fixed: new inquiries, client services, or manual review.

`$8000` is dropped from Taylor's message because the customer wrote `$8,000`. The check is a string search, so a fair paraphrase still loses.

`Fieldwork` stored as the location is kept. The word is in the message, and the check does not know what a location is. A phrase can be real and still be on the wrong field.

Summary and intent skip that search. The summary is generated text, cut at 700 characters. Intent is a classification, then a queue label.

Call `groundExtraction` before `missingFields`. A blank made of spaces is still truthy, so it would not count as missing until grounding turns it into `null`.

## 2026-10-25 — the contract

We are rebuilding the app in this repo, in the order the data flows.

1. The contract and the three presets. Done in this step.
2. The rules that drop invented facts, list missing fields, and pick a destination.
3. Prewritten results for the three samples, so the page can run with no accounts.
4. The page.
5. The API in fixture mode.
6. Live mode, one service at a time: OpenAI, Supabase, then Turnstile.

`lib/contracts.ts` has two schemas. `inputSchema` is what the browser may send. `extractionSchema` is what the first model call must return. A fact the model does not know is `null`. The key still has to be present. `summary` and `intent` are always filled in, because those are judgments, not quotes from the message.

`.strict()` rejects a request that adds its own field. A caller cannot send `saved: true` and have us trust it.

The agency preset requires an email, and Taylor's sample has none. That is the opening beat in the README. The test locks it in.

Dependency versions are pinned to the tutorial's `package.json` and lockfile. The Next.js TypeScript plugin is not in `tsconfig.json` yet. It gets added when the app exists, because it expects Next's generated type files.

## 2026-10-25

The README is a product page. It states the promise, the demo beat, the failure it exists to prevent, the pipeline, the boundary, and the stack. Setup steps stay in the tutorial. Demo links stay empty until a live walkthrough exists.

The opening beat is the agency sample on purpose. Taylor at Fieldwork asks for a website redesign before a January launch, gives a budget around $8,000, and never gives an email. Email is required for that preset, so the gap is visible. The home-services and real-estate samples already include an email, so they do not show the same beat.

LeadFlow uses two model calls on purpose. The first extracts typed facts. Code then drops any contact or detail that is not in the message, lists what is missing, and picks a destination. The second call writes the draft from those results. The rules sit in code so a person can inspect them.

`store: false` on the OpenAI calls is not a promise that the provider keeps nothing. The app itself saves each live submission in Supabase.

The shared cap is 30 attempts per database hour. It is not a rolling window. A failed model call still uses the attempt it reserved.

Fixture mode is a setup aid. It only accepts the three built-in messages and returns prewritten results. It does not call the model or write to the database. The public demo should be recorded in live mode.
