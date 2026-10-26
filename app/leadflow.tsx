"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { presetIds, type Extraction, type LeadResult, type PresetId } from "@/lib/contracts";
import { presets } from "@/lib/presets";

const facts = ["name", "email", "phone", "service", "location", "timing", "budget"] as const;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

export default function LeadFlow({ live, siteKey }: { live: boolean; siteKey: string }) {
  const [preset, setPreset] = useState<PresetId>("agency");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const challenge = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("insolla-theme", next);
    setTheme(next);
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("preset");
    if (id && presetIds.includes(id as PresetId)) setPreset(id as PresetId);
  }, []);

  useEffect(() => {
    if (!live || !siteKey || !scriptReady || !challenge.current || !window.turnstile) return;
    widget.current = window.turnstile.render(challenge.current, {
      sitekey: siteKey,
      action: "leadflow",
      callback: (value: string) => setToken(value),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    return () => {
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
    };
  }, [live, siteKey, scriptReady]);

  function choose(id: PresetId) {
    setPreset(id);
    setResult(null);
    setError("");
    setCopied(false);
  }

  function loadSample() {
    setMessage(presets[preset].sample);
    setResult(null);
    setError("");
    setCopied(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/leadflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, message, consent, turnstileToken: token }),
        signal: AbortSignal.timeout(65_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The demo could not finish.");
    } finally {
      setBusy(false);
      if (live) {
        setToken("");
        if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
      }
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Select the draft text and copy it manually.");
    }
  }

  return (
    <main>
      {live && siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
      )}
      <nav>
        <a className="brand" href="https://www.insolla.ai/" aria-label="Insolla">
          <img className="logo-on-dark" src="/brand/insolla-logo.svg" alt="Insolla" />
          <img className="logo-on-light" src="/brand/insolla-logo-light.svg" alt="Insolla" />
        </a>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <a className="contact-link" href="https://www.insolla.ai/contact">
            Contact
          </a>
        </div>
      </nav>
      <header>
        <p className="eyebrow">Less sorting. Clearer next steps.</p>
        <h1>
          <span className="accent-blue">Every</span> inquiry.
          <br />
          <span className="accent-purple">A clear next step.</span>
        </h1>
        <p className="intro">
          Turn a customer message into an organized lead, missing details, and a reply ready for
          your review.
        </p>
        <div className="badge">
          {live
            ? "Live demo. Saved for review. No email is sent."
            : "Sample simulation · No AI calls or data storage"}
        </div>
      </header>
      <div className="workspace">
        <section className="panel">
          <div className="section-top">
            <span className="step">01</span>
            <h2>The inquiry</h2>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="preset">Choose a sample business</label>
            <select
              id="preset"
              value={preset}
              disabled={busy}
              onChange={(event) => choose(event.target.value as PresetId)}
            >
              {presetIds.map((id) => (
                <option key={id} value={id}>
                  {presets[id].label}
                </option>
              ))}
            </select>
            <div className="label-row">
              <label htmlFor="message">Customer message</label>
              <button type="button" className="text-button" disabled={busy} onClick={loadSample}>
                Load sample
              </button>
            </div>
            <textarea
              id="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setResult(null);
              }}
              minLength={20}
              maxLength={4000}
              rows={9}
              disabled={busy}
              required
              placeholder="Paste a customer inquiry, or load a sample."
            />
            <p className="hint">{message.length}/4,000 characters · Fictional businesses and sample inquiries</p>
            <label className="check">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>I’m using fictional or anonymized demo information.</span>
            </label>
            <p className="privacy">
              {live
                ? "Use sample data only. Your message is sent to OpenAI, then the input and result are saved in Insolla’s private demo tracker for review. No email is sent."
                : "This mode returns a prewritten result for each built-in sample. Configure live mode to process other messages and save lead records."}
            </p>
            {live && <div ref={challenge} />}
            <button className="primary" disabled={busy || !consent || (live && Boolean(siteKey) && !token)}>
              {busy ? "Organizing and drafting…" : live ? "Organize this inquiry →" : "Preview sample result →"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        </section>
        <section className="panel result-panel" aria-live="polite" aria-busy={busy}>
          <div className="section-top">
            <span className="step">02</span>
            <h2>The next step</h2>
          </div>
          {result ? (
            <OrganizedInquiry
              status={
                result.mode === "fixture"
                  ? "Sample preview · Not saved"
                  : result.saved
                    ? "Saved to private demo tracker"
                    : "Live result · Not saved"
              }
              time={`${(result.elapsedMs / 1000).toFixed(1)}s`}
              extraction={result.extraction}
              missing={result.missing}
              route={result.route}
              draft={result.draft}
              copied={copied}
              onCopy={() => copy(result.draft)}
            />
          ) : (
            <div className="empty">
              <h3>{busy ? "Finding the details…" : "A message becomes a workflow."}</h3>
              <p>
                {busy
                  ? "Organizing the facts, then drafting a reply for review."
                  : "The lead details, missing information, and reply draft show here after you organize the inquiry."}
              </p>
            </div>
          )}
        </section>
      </div>
      <footer>
        <p>Built by Insolla. Adapt this workflow to your inbox, CRM, and team’s rules.</p>
        <a href="https://www.insolla.ai/contact">Tell us how inquiries reach your team.</a>
      </footer>
    </main>
  );
}

function OrganizedInquiry({
  status,
  time,
  extraction,
  missing,
  route,
  draft,
  copied,
  onCopy,
}: {
  status: string;
  time?: string;
  extraction: Extraction;
  missing: string[];
  route: string;
  draft: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      <div className="result-status">
        {status}
        {time ? <span>{time}</span> : null}
      </div>
      <p className="summary">{extraction.summary}</p>
      <dl>
        {facts.map((key) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{extraction[key] || "Not provided"}</dd>
          </div>
        ))}
      </dl>
      <div className="next">
        <strong>Suggested destination</strong>
        <p>{route} · Human review required</p>
        <strong>Missing intake details</strong>
        <p>{missing.length ? missing.join(", ") : "Required demo intake fields are present."}</p>
      </div>
      <div className="draft">
        <div className="label-row">
          <h3>Reply draft</h3>
          <button type="button" className="text-button" onClick={onCopy}>
            {copied ? "Copied" : "Copy draft"}
          </button>
        </div>
        <p>{draft}</p>
        <small>Review facts and commitments before using this draft.</small>
      </div>
    </>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" />
    </svg>
  );
}
