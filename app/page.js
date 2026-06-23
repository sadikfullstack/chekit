"use client";

import { useEffect, useMemo, useState } from "react";

const verdicts = {
  RELIABLE: { label: "Looks solid", tone: "good", glyph: "✓" },
  MIXED: { label: "Mixed signals", tone: "warn", glyph: "~" },
  UNRELIABLE: { label: "Handle with care", tone: "bad", glyph: "!" },
  UNVERIFIABLE: { label: "Still unclear", tone: "neutral", glyph: "?" },
};

const loadingSteps = [
  ["Listening closely", "Pulling out what was actually said"],
  ["Finding the claims", "Separating facts from opinions"],
  ["Checking the timeline", "Matching evidence to the right dates"],
  ["Searching live sources", "Cross-checking current reporting"],
  ["Reading between the lines", "Spotting persuasive tricks"],
];

function normalizeTikTokUrl(value) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const cleaned = value.replace(/[\u200B-\u200D\uFEFF]/g, " ").trim();
    const match = cleaned.match(/(?:https?:\/\/)?(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\/[^\s<>"']+/i);
    if (!match) return null;
    let candidate = match[0].replace(/[\])},.!;:'"]+$/g, "");
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const hosts = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
    if (parsed.protocol !== "https:" || !hosts.has(host) || parsed.username || parsed.password || parsed.port) return null;
    const path = parsed.pathname.replace(/\/+$/, "");
    const supported = ((host === "vm.tiktok.com" || host === "vt.tiktok.com") && path.length > 1)
      || /^\/@[^/]+\/video\/\d+$/i.test(path)
      || /^\/t\/[a-z0-9_-]+$/i.test(path)
      || /^\/v\/\d+\.html$/i.test(path)
      || /^\/(?:embed(?:\/v2)?|player\/v1)\/\d+$/i.test(path);
    if (!supported) return null;
    parsed.hostname = host;
    parsed.hash = "";
    return parsed.toString();
  } catch { return null; }
}

function Icon({ name, size = 20 }) {
  const paths = {
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/>,
    source: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function LoadingScreen({ onCancel }) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const ticker = setInterval(() => setSeconds((value) => value + 1), 1000);
    const stages = setInterval(() => setStep((value) => Math.min(value + 1, loadingSteps.length - 1)), 2100);
    return () => { clearInterval(ticker); clearInterval(stages); };
  }, []);
  // Front-load visible progress, then ease near completion while the live checks finish.
  const progress = Math.min(96, seconds < 7 ? 18 + seconds * 9 : 81 + (seconds - 7) * 0.75);
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <button className="loading-close" onClick={onCancel} aria-label="Cancel scan"><Icon name="close"/></button>
      <div className="loading-brand">chekit</div>
      <div className="scan-orb" aria-hidden="true"><i/><i/><i/><span><Icon name="spark" size={28}/></span></div>
      <div className="loading-copy" key={step}>
        <span>STEP {step + 1} OF {loadingSteps.length}</span>
        <h2>{loadingSteps[step][0]}</h2>
        <p>{loadingSteps[step][1]}</p>
      </div>
      <div className="progress-wrap"><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><small>{seconds < 3 ? "Video opened" : seconds < 7 ? "Claims found" : seconds < 12 ? "Sources coming in" : "Finishing the cross-check"}</small></div>
      <div className="loading-wins"><span className={step > 0 ? "done" : "active"}>Transcript</span><span className={step > 2 ? "done" : step > 0 ? "active" : ""}>Timeline</span><span className={step > 3 ? "done" : step > 2 ? "active" : ""}>Sources</span></div>
      <p className="loading-tip">Good checks take a beat. We’re matching claims to the moment they were made.</p>
    </div>
  );
}

function ClaimCard({ item, index, open, onToggle }) {
  return (
    <article className={`swipe-card claim-card ${item.verdict.toLowerCase()} ${open ? "is-open" : ""}`}>
      <button className="card-hit" onClick={onToggle} aria-expanded={open}>
        <div className="card-status"><span>{item.verdict === "TRUE" ? "✓" : item.verdict === "FALSE" ? "×" : item.verdict === "MISLEADING" ? "~" : "?"}</span>{item.verdict}</div>
        <small>CLAIM {index + 1}</small>
        <h3>{item.claim}</h3>
        <div className="peek"><span>{open ? "Hide detail" : "Why this verdict"}</span><b>{open ? "−" : "+"}</b></div>
      </button>
      {open && <div className="card-detail">
        <p>{item.explanation}</p>
        {item.sources?.length > 0 && <div className="source-list"><small>Supports verdict</small>{item.sources.map((source, i) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noopener noreferrer"><Icon name="source" size={14}/><span>{source.label}</span><Icon name="arrow" size={13}/></a>)}</div>}
        {item.counterEvidence?.length > 0 && <div className="source-list counter-list"><small>Pushes back</small>{item.counterEvidence.map((source, i) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noopener noreferrer"><Icon name="source" size={14}/><span>{source.label}</span><Icon name="arrow" size={13}/></a>)}</div>}
      </div>}
    </article>
  );
}

function SignalCard({ item, open, onToggle }) {
  return (
    <article className={`swipe-card signal-card ${open ? "is-open" : ""}`}>
      <button className="card-hit" onClick={onToggle} aria-expanded={open}>
        <div className="signal-top"><span className="signal-mark">!</span><span>{item.severity} INFLUENCE</span></div>
        <h3>{item.name}</h3>
        {item.quote && <blockquote>“{item.quote}”</blockquote>}
        <div className="peek"><span>{open ? "Hide detail" : "How it works"}</span><b>{open ? "−" : "+"}</b></div>
      </button>
      {open && <div className="card-detail"><p>{item.explanation}</p></div>}
    </article>
  );
}

function Results({ result, onReset }) {
  const [tab, setTab] = useState("facts");
  const [openCard, setOpenCard] = useState(null);
  const verdict = verdicts[result.overallVerdict] || verdicts.UNVERIFIABLE;
  const counts = useMemo(() => result.claims.reduce((all, claim) => ({ ...all, [claim.verdict]: (all[claim.verdict] || 0) + 1 }), {}), [result.claims]);
  const toggle = (key) => setOpenCard((current) => current === key ? null : key);
  return (
    <section className="result-view" id="results">
      <header className="result-nav"><button onClick={onReset}><Icon name="close" size={18}/></button><span>Scan result</span><i>LIVE</i></header>
      <div className={`verdict-hero tone-${verdict.tone}`}>
        <div className="verdict-glow"/><div className="verdict-glyph">{verdict.glyph}</div>
        <span>THE QUICK READ</span><h1>{verdict.label}</h1><p>{result.summary}</p>
        <div className="confidence-pill"><b>{result.confidence}%</b> evidence strength <span>·</span> {result.meta?.grounded === false ? "quick mode" : "checked live"}</div>
      </div>
      <div className="snapshot">
        <div><strong>{counts.TRUE || 0}</strong><span>Checks out</span></div>
        <div><strong>{(counts.FALSE || 0) + (counts.MISLEADING || 0)}</strong><span>Needs context</span></div>
        <div><strong>{result.fallacies.length}</strong><span>Persuasion flags</span></div>
      </div>
      <div className="segment" role="tablist">
        <button className={tab === "facts" ? "active" : ""} onClick={() => { setTab("facts"); setOpenCard(null); }}>Quick facts <span>{result.claims.length}</span></button>
        <button className={tab === "signals" ? "active" : ""} onClick={() => { setTab("signals"); setOpenCard(null); }}>Rhetoric <span>{result.fallacies.length}</span></button>
      </div>
      <div className="deck-intro"><div><h2>{tab === "facts" ? "What holds up" : "How it persuades"}</h2><p>{tab === "facts" ? (result.meta?.grounded === false ? "Fast scan. Live sources were busy, so treat this as a first pass." : "Swipe through. Tap only when you want the receipts.") : "Patterns worth noticing—not a judgment of intent."}</p></div><span>SWIPE →</span></div>
      <div className="card-deck">
        {tab === "facts" && (result.claims.length ? result.claims.map((item, i) => <ClaimCard key={i} item={item} index={i} open={openCard === `f${i}`} onToggle={() => toggle(`f${i}`)}/>) : <div className="empty-card">No concrete claims to check.</div>)}
        {tab === "signals" && (result.fallacies.length ? result.fallacies.map((item, i) => <SignalCard key={i} item={item} open={openCard === `r${i}`} onToggle={() => toggle(`r${i}`)}/>) : <div className="empty-card">No clear persuasion tricks detected.</div>)}
        <div className="deck-spacer"/>
      </div>
      <div className="result-footer"><p>AI can miss things. For important decisions, open the sources.</p><button onClick={onReset}>Check another video <Icon name="arrow" size={17}/></button></div>
    </section>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  async function pasteLink() {
    try {
      const clipboard = await navigator.clipboard.readText();
      const normalized = normalizeTikTokUrl(clipboard);
      setUrl(normalized || clipboard.trim());
      setError(normalized ? "" : "That clipboard text does not contain a supported TikTok video link.");
    }
    catch { setError("Press and hold the field to paste your link."); }
  }
  async function verify(event) {
    event.preventDefault();
    const normalizedUrl = normalizeTikTokUrl(url);
    if (!normalizedUrl) {
      setError("Paste a TikTok video link—not a profile, photo, or another website.");
      return;
    }
    setUrl(normalizedUrl); setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: normalizedUrl }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fallback = response.status === 504
          ? "That video took too long to check. Try again, or use a shorter clip."
          : response.status >= 500
            ? "The check hit a temporary server issue. Try once more."
            : "That scan didn't finish. Try once more.";
        throw new Error(data.error || fallback);
      }
      setResult(data); setStatus("success"); window.scrollTo({ top: 0 });
    } catch (err) { setError(err.message); setStatus("error"); }
  }
  function reset() { setResult(null); setStatus("idle"); setUrl(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (status === "loading") return <LoadingScreen onCancel={() => setStatus("idle")}/>;
  if (result) return <Results result={result} onReset={reset}/>;
  return (
    <main className="home-view">
      <nav className="home-nav"><a href="#top"><span>c</span>chekit</a><div><i/> Live sources</div></nav>
      <section className="home-content" id="top">
        <div className="hero-orb"><i/><span>?</span></div>
        <div className="hero-text"><span>A CLEARER SECOND LOOK</span><h1>Before you believe it,<br/><em>chek it.</em></h1><p>Paste a TikTok. Get the facts, missing context, and persuasion cues—in a glance.</p></div>
        <form className="scan-panel" onSubmit={verify}>
          <div className="url-field"><Icon name="link" size={19}/><input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" aria-label="TikTok video link" placeholder="Paste a TikTok link" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} required/><button type="button" onClick={pasteLink}>Paste</button></div>
          <button className="primary-action" disabled={!url.trim()}>Chek this video <Icon name="arrow"/></button>
          <div className="microcopy"><span>No login</span><i/><span>Private</span><i/><span>Live web check</span></div>
        </form>
        {error && <div className="home-error">! <span>{error}</span></div>}
      </section>
      <div className="home-bottom"><span>Facts</span><i/>Context<span>Rhetoric</span></div>
    </main>
  );
}
