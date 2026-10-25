# Notes

A running log of decisions and surprises while building LeadFlow. Newest entry at the top. This build is October 25, 2026.

## The share preview

A pasted link uses the same image as the README, `public/thumbnail.png`. The page sets `og:title`, `og:description`, and `og:image` from `APP_ORIGIN`, so the image address is absolute. LinkedIn and iMessage ignore a title that has no image. After a deploy, those apps can keep an old bare preview until their cache is refreshed.

## The first screen

The page opens on Taylor’s inquiry. Before a visitor runs anything, panel 02 shows that preset’s prewritten result and labels it as an example. It is not a saved row. For Taylor, the email is missing. Changing the sample business changes the example. Their own run replaces it.

The live badge says “Live demo. Saved for review. No email is sent.” The selector says “Choose a sample business.” The privacy line leads with “Use sample data only.” The footer says “Tell us how inquiries reach your team.” and opens the Insolla contact form. That form promises a personal reply, usually within a day. It does not book a call.

## Outreach links

The query string selects the sample. It does not grant access to a prospect’s inbox. The three links are:

- `https://leadflow.insolla.ai/?preset=home-services`
- `https://leadflow.insolla.ai/?preset=agency`
- `https://leadflow.insolla.ai/?preset=real-estate`

Use the agency link when the point is the missing email. The footer says “Tell us how inquiries reach your team.” and goes to `https://www.insolla.ai/contact`, which asks what slows the team down. The nav label stays Contact, matching the marketing site. A 30–45 second recording of the live agency run is still unmade. Email clients cannot run the app, so the message needs the link and a still or a short clip.

## The public demo

`https://leadflow.insolla.ai` is the live host. DNS is a Namecheap CNAME for `leadflow` to Vercel. `APP_ORIGIN` is that exact origin. The Turnstile widget allows `leadflow.insolla.ai`, and `TURNSTILE_HOSTNAMES` is `localhost,leadflow.insolla.ai`. The three private keys are Production secrets on Vercel. `.env.local` still points local development at `http://localhost:3000`.

Taylor’s public run saved in 3.9 seconds. Email was null and the missing list was `email`. The draft asked about scope, features, and timeline, and did not ask for the email. The missing list is the code. The draft is the model, and a person still has to read it. `Fieldwork` was stored as the location again because the word is in the message.

## Ready to deploy

`pnpm test`, `pnpm typecheck`, and `pnpm build` passed. The suite is 36 tests. The production build marks `/` and `/api/leadflow` as dynamic, so the mode and the origin are read on the server for each request. A green suite does not prove the API key, the database, or Turnstile. Taylor’s live run is that proof on localhost.

A live request runs in this order:

1. Origin and JSON checks. The origin check is not authentication.
2. Body cap, then preset, length, and the demo-data checkbox.
3. Live mode, or fixture mode when the message is an exact sample.
4. OpenAI and Supabase clients, on the server only.
5. Turnstile, before the counter.
6. Reserve the hour. A broken or full counter stops the request.
7. Extract, ground, list what is missing, and pick a destination.
8. Draft, unless the intent is `other`.
9. Insert the row. `saved: true` only after that insert succeeds.
10. Return this result with `Cache-Control: no-store`.

`supabase/schema.sql` is the table definition. It was applied in the dashboard and had not been committed. `.env.local` stays off the remote.

The first deployment should use `LEADFLOW_MODE=fixture` and an `APP_ORIGIN` that is the exact `https` origin. Add that hostname to the Turnstile widget and to `TURNSTILE_HOSTNAMES` before switching the deployment to live. Environment changes on Vercel apply on the next deployment.

## The visitor check

The widget was already on the form. It renders only in live mode, and only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. Its action is `leadflow`. After each submit the widget resets, because a token is single-use and lasts about five minutes.

`verifyHuman` runs after the OpenAI and Supabase clients are created, and before `reserve_leadflow_attempt`. A missing or rejected token does not increment the hour and does not call either model. Fixture mode never calls it.

The server posts the token to Cloudflare. It keeps the result only when `success` is true, `action` is `leadflow`, and `hostname` is listed in `TURNSTILE_HOSTNAMES`. The secret stays on the server. Showing the widget is not the check.

A missing Turnstile setting is `CONFIGURATION`. A missing or rejected token is `VERIFICATION`. An HTTP error from Cloudflare is `VERIFICATION_UNAVAILABLE`. A network failure is still `UPSTREAM_FAILURE`, and in that case the counter was not incremented.

Create a managed widget, allow `localhost`, and set the site key, the secret, and `TURNSTILE_HOSTNAMES=localhost` in `.env.local`. Restart `pnpm dev`. The next live submit has to pass the widget.

## The private tracker

`supabase/schema.sql` creates two tables. `leadflow_leads` stores one row per live submission. `status` defaults to `needs_review` because the insert does not send a status. `leadflow_usage` stores one counter per database hour.

Row level security is on, and the browser roles have no permissions. The server connects with `SUPABASE_SECRET_KEY`. That key is not a `NEXT_PUBLIC_` variable.

`reserve_leadflow_attempt` runs before either model call. It adds one to the current hour and allows the attempt when the count is 30 or less. A full hour returns 429 and the model is not called. A broken counter returns 503 and the model is not called. The attempt is counted even when the later model call or the save fails. The bucket is the database hour, not a rolling 60 minutes. The request that hits 31 still increments the counter.

The row is inserted after the draft. `saved: true` is returned only when that insert succeeds. A failed insert is `SAVE_FAILED`, and the page does not say the result was saved. `elapsedMs` stops before the insert, so the number is the time to organize and draft.

Run the SQL once in the Supabase SQL editor. Then set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` and restart the dev server. The Table Editor is the tracker for this version. There is no page that lists other people's rows.

## The two model calls

`extract` asks for facts that are short quotes from the message, or `null`. The response has to match `extractionSchema`. `groundExtraction` then runs on that object, so an invented email still becomes `null` after the model returns.

`draftReply` receives the grounded facts and the missing list. It does not see the original message. A message classified as `other` skips this call and gets a fixed manual-review line.

`store: false` asks OpenAI not to keep the response for its own later use. It is not a promise that the provider retains nothing. This app still does not save the row. `saved` stays false until Supabase is connected, and the page says "Live result · Not saved".

Both calls use a 20 second timeout and no automatic retry. A failed call is a 502. The inquiry text is not written to the log.

The preview button waits for a Turnstile token only after `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. Until then, live mode can be tried with an API key alone. Verification still has to move in front of these calls before the demo is public.

## The Insolla visual system

Colors, type, and the contact button come from insolla.ai. Dark background is `#0d0f14`. Light background is `#f6f7fb`. Headlines use Rajdhani. Body text uses Inter. The button ring is a blue-to-purple gradient, the same treatment as the Contact button on the marketing site.

The wordmark is white in one logo file and dark in the other, so each theme has its own SVG. The choice is stored in `localStorage` under `insolla-theme`.

## Where we are

1. The contract and the three presets.
2. The rules that drop invented facts, list missing fields, and pick a destination.
3. Prewritten results for the three samples.
4. The page and the fixture endpoint.
5. The two model calls.
6. Save the live result in Supabase.
7. Turnstile, in front of the counter and the model calls.
8. Tests, typecheck, and the production build.
9. Deploy to `leadflow.insolla.ai`, fixture first, then live.
10. Outreach links, one preset per message. Done through here. The recording is still unmade.

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
