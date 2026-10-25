# Notes

A running log of decisions and surprises while building LeadFlow. Newest entry at the top.

## 2026-10-25

The README is a product page. It states the promise, the demo beat, the failure it exists to prevent, the pipeline, the boundary, and the stack. Setup steps stay in the tutorial. Demo links stay empty until a live walkthrough exists.

The opening beat is the agency sample on purpose. Taylor at Fieldwork asks for a website redesign before a January launch, gives a budget around $8,000, and never gives an email. Email is required for that preset, so the gap is visible. The home-services and real-estate samples already include an email, so they do not show the same beat.

LeadFlow uses two model calls on purpose. The first extracts typed facts. Code then drops any contact or detail that is not in the message, lists what is missing, and picks a destination. The second call writes the draft from those results. The rules sit in code so a person can inspect them.

`store: false` on the OpenAI calls is not a promise that the provider keeps nothing. The app itself saves each live submission in Supabase.

The shared cap is 30 attempts per database hour. It is not a rolling window. A failed model call still uses the attempt it reserved.

Fixture mode is a setup aid. It only accepts the three built-in messages and returns prewritten results. It does not call the model or write to the database. The public demo should be recorded in live mode.
