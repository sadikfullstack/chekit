"use client";

import { useState } from "react";

const verdictCopy = {
  RELIABLE: "Mostly reliable",
  MIXED: "Mixed accuracy",
  UNRELIABLE: "Low reliability",
  UNVERIFIABLE: "Not verifiable",
};

function Icon({ name, size = 20 }) {
  const paths = {
    shield: <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4" />,
    alert: <><path d="m12 3-9 17h18L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ClaimCard({ item, index }) {
  return (
    <article className={`result-card claim ${item.verdict.toLowerCase()}`}>
      <div className="card-top">
        <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="verdict-badge">{item.verdict}</span>
      </div>
      <h3>{item.claim}</h3>
      <p>{item.explanation}</p>
      {item.sources?.length > 0 && (
        <div className="sources">
          <span>Sources</span>
          {item.sources.map((source, sourceIndex) => (
            <a href={source.url} target="_blank" rel="noopener noreferrer" key={`${source.url}-${sourceIndex}`}>
              {source.label}<Icon name="arrow" size={14} />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function FallacyCard({ item }) {
  return (
    <article className={`result-card fallacy severity-${item.severity.toLowerCase()}`}>
      <div className="card-top">
        <span className="fallacy-icon"><Icon name="alert" size={17} /></span>
        <span className="severity">{item.severity} RISK</span>
      </div>
      <h3>{item.name}</h3>
      {item.quote && <blockquote>“{item.quote}”</blockquote>}
      <p>{item.explanation}</p>
    </article>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function pasteLink() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError("");
    } catch {
      setError("Clipboard access was blocked. Press and hold the field to paste.");
    }
  }

  async function verify(event) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Analysis failed. Please try again.");
      setResult(data);
      setStatus("success");
      requestAnimationFrame(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth" }));
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const loading = status === "loading";

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="chekit home"><span>c</span>chekit</a>
        <span className="privacy"><span className="status-dot" /> Private analysis</span>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span>AI-POWERED</span> MEDIA LITERACY</div>
        <h1>Don’t just watch.<br /><em>Chek it.</em></h1>
        <p className="hero-copy">See what’s true, what’s twisted, and what’s trying to play you—in under a minute.</p>

        <form className="scanner" onSubmit={verify}>
          <label htmlFor="tiktok-url">TikTok video link</label>
          <div className="input-wrap">
            <Icon name="link" />
            <input
              id="tiktok-url"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://www.tiktok.com/@..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              disabled={loading}
            />
            <button className="paste" type="button" onClick={pasteLink} disabled={loading}>Paste</button>
          </div>
          <button className="scan-button" type="submit" disabled={loading || !url.trim()}>
            {loading ? <><span className="spinner" />Analyzing video…</> : <>Scan video <Icon name="arrow" /></>}
          </button>
          <div className="scan-meta"><span><Icon name="check" size={14} /> No sign-up</span><span>•</span><span>Usually 20–40 sec</span></div>
        </form>

        {error && <div className="error" role="alert"><Icon name="alert" /><span>{error}</span></div>}
        {loading && (
          <div className="loading-panel" aria-live="polite">
            <div className="loading-line"><span className="pulse-dot" /> Extracting transcript</div>
            <div className="loading-line delay"><span className="pulse-dot" /> Checking claims and rhetoric</div>
          </div>
        )}
      </section>

      {result && (
        <section className="results shell" id="results">
          <div className={`score-card overall-${result.overallVerdict.toLowerCase()}`}>
            <div>
              <span className="score-label">OVERALL READ</span>
              <h2>{verdictCopy[result.overallVerdict] || result.overallVerdict}</h2>
              <p>{result.summary}</p>
            </div>
            <div className="confidence"><strong>{result.confidence}</strong><span>% confidence</span></div>
          </div>

          <div className="section-heading shield-heading">
            <span className="heading-icon"><Icon name="shield" /></span>
            <div><span>FACTUAL VERACITY</span><h2>Veracity Shield</h2></div>
            <span className="count">{result.claims.length}</span>
          </div>
          <div className="card-grid">
            {result.claims.length ? result.claims.map((item, index) => <ClaimCard item={item} index={index} key={index} />) : <div className="empty">No concrete fact-checkable claims were found.</div>}
          </div>

          <div className="section-heading rhetoric-heading">
            <span className="heading-icon"><Icon name="alert" /></span>
            <div><span>RHETORICAL LOGIC</span><h2>Rhetoric Alert</h2></div>
            <span className="count">{result.fallacies.length}</span>
          </div>
          <div className="card-grid">
            {result.fallacies.length ? result.fallacies.map((item, index) => <FallacyCard item={item} key={index} />) : <div className="empty">No clear manipulative fallacies were detected.</div>}
          </div>

          <p className="disclaimer">AI can make mistakes. Open the sources and verify important decisions yourself.</p>
          <button className="new-scan" onClick={() => { setResult(null); setStatus("idle"); setUrl(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Scan another video</button>
        </section>
      )}

      <footer className="shell">chekit <span>•</span> Clarity over virality</footer>
    </main>
  );
}
