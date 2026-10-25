# Notes

A running log of decisions and surprises while building LeadFlow. Newest entry at the top. This build is October 25, 2026.

## The Insolla visual system

Colors, type, and the contact button come from insolla.ai. Dark background is `#0d0f14`. Light background is `#f6f7fb`. Headlines use Rajdhani. Body text uses Inter. The button ring is a blue-to-purple gradient, the same treatment as the Contact button on the marketing site.

The wordmark is white in one logo file and dark in the other, so each theme has its own SVG. The choice is stored in `localStorage` under `insolla-theme`.

## Where we are

1. The contract and the three presets.
2. The rules that drop invented facts, list missing fields, and pick a destination.
3. Prewritten results for the three samples.
4. The page and the fixture endpoint. Done through here.
5. Live mode, one service at a time: OpenAI, Supabase, then Turnstile.

## The page and the fixture endpoint

`app/page.tsx` runs on the server. It reads `LEADFLOW_MODE` and passes `live` into the form as a prop, along with the Turnstile site key. The browser bundle does not receive the server secrets. `force-dynamic` keeps that read on each request, so a mode change is not frozen into a static page.

`app/leadflow.tsx` is the form. Choosing a business loads that sample. `/?preset=agency` does the same on first load. The checkbox has to be checked before the button will submit. The form POSTs `/api/leadflow`.

In fixture mode the route returns the prewritten extraction and draft only when the message is exactly the sample. The result says `fixture` and `saved: false`. Edited text gets `FIXTURE_ONLY`. A request whose `Origin` is not `APP_ORIGIN` gets `403` before that comparison. During `next dev`, a missing `APP_ORIGIN` falls back to `http://localhost:3000`.

The schema trims the message, so a space at either end still matches the sample.

Live mode does not run yet. If `LEADFLOW_MODE=live`, the route returns `CONFIGURATION` instead of pretending the sample is a live answer. The live badge and the verification widget are already in the form, and they stay inactive while the mode is fixture. The test that expects `503` changes when the live path is real.

The Next.js TypeScript plugin is now in `tsconfig.json`.

## Prewritten results

`lib/fixtures.ts` holds the extraction and the draft for each sample. Fixture mode will return one of these only when the submitted message is exactly that preset's sample. Edited text is rejected. The result is labeled `fixture`, and nothing is saved.

Every quoted fact in these extractions appears in its sample. The test runs `groundExtraction` and expects the object back unchanged. The summaries are allowed to paraphrase. Jordan's stored service is `replace our water heater`, while the summary says "water heater replacement."

The agency result is the one with a gap. Email is null, and the draft asks for an address before anyone confirms pricing or availability. Jordan and Sam already included an email, and budget is not required for their presets, so their missing lists are empty.

## The rules between the two model calls

`lib/logic.ts` runs after extraction and before the draft. Three functions, in that order:

1. `groundExtraction` keeps a fact only when its phrase appears in the message. Case and extra spaces do not matter. The stored phrase stays as the model wrote it.
2. `missingFields` walks that preset's required list and keeps the keys that are still empty.
3. `routeFor` maps intent to a queue name. The map is fixed: new inquiries, client services, or manual review.

`$8000` is dropped from Taylor's message because the customer wrote `$8,000`. The check is a string search, so a fair paraphrase still loses.

`Fieldwork` stored as the location is kept. The word is in the message, and the check does not know what a location is. A phrase can be real and still be on the wrong field.

Summary and intent skip that search. The summary is generated text, cut at 700 characters. Intent is a classification, then a queue label.

Call `groundExtraction` before `missingFields`. A blank made of spaces is still truthy, so it would not count as missing until grounding turns it into `null`.

## The contract

`lib/contracts.ts` has two schemas. `inputSchema` is what the browser may send. `extractionSchema` is what the first model call must return. A fact the model does not know is `null`. The key still has to be present. `summary` and `intent` are always filled in, because those are judgments, not quotes from the message.

`.strict()` rejects a request that adds its own field. A caller cannot send `saved: true` and have us trust it.

The agency preset requires an email, and Taylor's sample has none. That is the opening beat in the README. The test locks it in.

Dependency versions are pinned to the tutorial's `package.json` and lockfile. The Next.js TypeScript plugin is not in `tsconfig.json` yet. It gets added when the app exists, because it expects Next's generated type files.

## The product page

The README is a product page. It states the promise, the demo beat, the failure it exists to prevent, the pipeline, the boundary, and the stack. Setup steps stay in the tutorial. Demo links stay empty until a live walkthrough exists.

The opening beat is the agency sample on purpose. Taylor at Fieldwork asks for a website redesign before a January launch, gives a budget around $8,000, and never gives an email. Email is required for that preset, so the gap is visible. The home-services and real-estate samples already include an email, so they do not show the same beat.

LeadFlow uses two model calls on purpose. The first extracts typed facts. Code then drops any contact or detail that is not in the message, lists what is missing, and picks a destination. The second call writes the draft from those results. The rules sit in code so a person can inspect them.

`store: false` on the OpenAI calls is not a promise that the provider keeps nothing. The app itself saves each live submission in Supabase.

The shared cap is 30 attempts per database hour. It is not a rolling window. A failed model call still uses the attempt it reserved.

Fixture mode is a setup aid. It only accepts the three built-in messages and returns prewritten results. It does not call the model or write to the database. The public demo should be recorded in live mode.
