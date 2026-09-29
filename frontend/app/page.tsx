"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileText,
  Fingerprint,
  FlaskConical,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

type Citation = { page: number; quote: string; label: string };
type Fact = {
  id: string;
  label: string;
  value: string;
  status: string;
  page?: number;
  quote?: string;
};
type Policy = {
  id: string;
  filename: string;
  sha256: string;
  page_count: number;
  reviewed: boolean;
  name: string;
  uin: string | null;
  facts: Fact[];
  notice: string;
};
type Engine = { mode: string; model: string | null; generation: string };
type Answer = {
  status: string;
  answer: string;
  confidence: string;
  citations: Citation[];
  engine: Engine;
};
type Cohort = {
  n: number;
  median: number;
  p10: number;
  p90: number;
  source: string;
  version: string;
  city: string;
};
type Estimate = {
  status: string;
  message: string;
  missing: string[];
  bill?: string;
  covered?: string;
  out_of_pocket?: string;
  sublimit?: string;
  eligible_on?: string;
  cohort: Cohort | null;
  assumptions: string[];
  citations: Citation[];
  ledger?: { label: string; amount: string; page: number | null }[];
  bill_source?: string;
};
type Form = {
  sum_insured: string;
  remaining_cover: string;
  bill: string;
  first_cover_date: string;
  treatment_date: string;
  pre_existing: string;
  standard_case_confirmed: boolean;
};
type View = "overview" | "ask" | "estimate";
const INR = (value: string | number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(Number(value));
const labels: Record<string, string> = {
  remaining_cover: "Remaining annual cover",
  first_cover_date: "First continuous cover date",
  pre_existing: "Pre-existing condition status",
  standard_case_confirmed: "Confirmation of the scenario assumptions",
};
const initialForm: Form = {
  sum_insured: "500000",
  remaining_cover: "",
  bill: "",
  first_cover_date: "",
  treatment_date: "2026-10-10",
  pre_existing: "",
  standard_case_confirmed: false,
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "X-PolicyLens": "1",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(
      Array.isArray(detail)
        ? detail.map((item: { msg: string }) => item.msg).join(" · ")
        : typeof detail === "string"
          ? detail
          : "Could not reach the API. Check that both local servers are running.",
    );
  }
  return data;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [docs, setDocs] = useState<Policy[]>([]);
  const [active, setActive] = useState<Policy | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<
    { question: string; result: Answer }[]
  >([]);
  const [form, setForm] = useState<Form>(initialForm);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [previous, setPrevious] = useState<Estimate | null>(null);
  const [dirty, setDirty] = useState(false);
  const [evidence, setEvidence] = useState<Citation | null>(null);
  const [pageText, setPageText] = useState("");
  const [deleteCheck, setDeleteCheck] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const questionInput = useRef<HTMLInputElement>(null);
  const sourceClose = useRef<HTMLButtonElement>(null);
  const sourceOpener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const health = await api<{ engine: Engine }>("/health");
        setEngine(health.engine);
        const documents = await api<Policy[]>("/documents");
        setDocs(documents);
        setActive(documents[0] ?? null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!evidence) return;
    sourceClose.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSource();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [evidence]);

  function select(doc: Policy | null) {
    setActive(doc);
    setHistory([]);
    setEstimate(null);
    setPrevious(null);
    setForm(initialForm);
    setDirty(false);
    setDeleteCheck(false);
    setView("overview");
    setError("");
  }
  async function loadDocument(file?: File) {
    setBusy("upload");
    setError("");
    try {
      if (file && file.size > 10 * 1024 * 1024)
        throw new Error("Please choose a PDF smaller than 10 MB.");
      const body = new FormData();
      if (file) body.append("file", file);
      const doc = await api<Policy>(file ? "/documents" : "/demo", {
        method: "POST",
        ...(file ? { body } : {}),
      });
      setDocs((current) => [doc, ...current]);
      select(doc);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function removeDocument() {
    if (!active) return;
    if (!deleteCheck) {
      setDeleteCheck(true);
      return;
    }
    setBusy("delete");
    setError("");
    try {
      await api(`/documents/${active.id}`, { method: "DELETE" });
      const remaining = docs.filter((d) => d.id !== active.id);
      setDocs(remaining);
      select(remaining[0] ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function showSource(citation: Citation) {
    if (!active) return;
    sourceOpener.current = document.activeElement as HTMLElement;
    setEvidence(citation);
    setPageText("Loading source page…");
    try {
      const page = await api<{ text: string }>(
        `/documents/${active.id}/pages/${citation.page}`,
      );
      setPageText(page.text);
    } catch (err) {
      setPageText((err as Error).message);
    }
  }
  function closeSource() {
    setEvidence(null);
    sourceOpener.current?.focus();
  }
  async function ask(text = question) {
    if (!active || text.trim().length < 3 || busy) return;
    setBusy("ask");
    setError("");
    setQuestion("");
    try {
      const result = await api<Answer>(`/documents/${active.id}/questions`, {
        method: "POST",
        body: JSON.stringify({ question: text.trim() }),
      });
      setHistory((current) => [...current, { question: text, result }]);
    } catch (err) {
      setQuestion(text);
      setError((err as Error).message);
    } finally {
      setBusy("");
      questionInput.current?.focus();
    }
  }
  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  async function calculate() {
    if (!active) return;
    setBusy("estimate");
    setError("");
    try {
      const body = {
        ...form,
        procedure: "cataract_one_eye",
        city: "Pune",
        sum_insured: form.sum_insured,
        remaining_cover: form.remaining_cover || null,
        bill: form.bill || null,
        first_cover_date: form.first_cover_date || null,
        pre_existing:
          form.pre_existing === "" ? null : form.pre_existing === "yes",
      };
      const result = await api<Estimate>(`/documents/${active.id}/estimates`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (
        estimate &&
        !estimate.missing.length &&
        estimate.covered !== undefined
      )
        setPrevious(estimate);
      setEstimate(result);
      setDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }
  const sourceChips = (citations: Citation[]) => (
    <div className="source-chips">
      {citations.map((c, i) => (
        <button
          key={`${c.page}-${i}`}
          className="source-chip"
          onClick={() => showSource(c)}
        >
          <BookOpen size={13} /> p. {c.page} · {c.label}
          <ArrowUpRight size={12} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PolicyLens home">
          <span className="brand-icon">
            <ShieldCheck size={25} />
          </span>
          Policy<span>Lens</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              ["overview", "Policy overview", LayoutDashboard],
              ["ask", "Ask your policy", MessageSquareText],
              ["estimate", "Treatment estimate", Wallet],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              <Icon size={19} />
              {label}
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">
          DOCUMENTS{" "}
          <button
            title="Upload policy"
            aria-label="Upload another policy"
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="doc-list">
          {docs.length ? (
            docs.map((doc) => (
              <button
                key={doc.id}
                className={`sidebar-doc ${active?.id === doc.id ? "selected" : ""}`}
                onClick={() => select(doc)}
                disabled={!!busy}
              >
                <FileText size={18} />
                <span>
                  {doc.reviewed ? "Arogya Sanjeevani" : doc.filename}
                  <small>
                    {doc.page_count} pages ·{" "}
                    {doc.reviewed ? "Reviewed version" : "Unverified version"}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">
              Your policy documents will appear here.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-note">
            <LockKeyhole size={17} />
            <span>
              Local prototype<small>Documents stay on this computer</small>
            </span>
          </div>
          <div className="team">
            <span className="avatar">M</span>
            <div>
              Team Master’s<small>HM50036 · FIN01</small>
            </div>
            <span className="round-badge">R1</span>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {view === "overview"
                ? "Policy overview"
                : view === "ask"
                  ? "Ask your policy"
                  : "Treatment estimate"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="prototype-label">
              <span /> Round 1 prototype
            </span>
            <span className="avatar small">M</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">CLARITY BEFORE CARE</div>
              <h1>
                {view === "overview"
                  ? "Understand what’s covered."
                  : view === "ask"
                    ? "Every answer, with evidence."
                    : "Know your share of the bill."}
              </h1>
              <p>
                {view === "overview"
                  ? "Your policy, translated into a clearer picture of your cover."
                  : view === "ask"
                    ? "Explore the reviewed clauses and go straight to the source."
                    : "Follow each limit and deduction in one transparent calculation."}
              </p>
            </div>
            <button
              className="button secondary compact"
              onClick={() => fileInput.current?.click()}
              disabled={!!busy}
            >
              <Upload size={16} /> Upload policy
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) loadDocument(file);
            }}
          />
          {error && (
            <div className="error-banner" role="alert">
              <CircleHelp size={19} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {!ready && (
            <div className="loading-panel">
              <LoaderCircle className="spin" /> Connecting to your local
              workspace…
            </div>
          )}
          {ready && !active && (
            <>
              <section className="welcome-hero">
                <div>
                  <span className="pill">
                    <Sparkles size={13} /> FROM POLICY TO POSSIBILITY
                  </span>
                  <h2>
                    Less fine print.
                    <br />
                    More peace of mind.
                  </h2>
                  <p>
                    Find the clause. Understand the limit.
                    <br />
                    See what a treatment could mean for your wallet.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => loadDocument()}
                    disabled={!!busy}
                  >
                    {busy === "upload" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <FlaskConical size={17} />
                    )}{" "}
                    Explore the demo <ArrowRight size={17} />
                  </button>
                  <small>
                    Real public policy wording · fictional treatment scenario
                  </small>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="hero-document">
                    <div className="mini-brand">
                      <ShieldCheck size={20} /> YOUR POLICY
                    </div>
                    <div className="mock-line long" />
                    <div className="mock-line" />
                    <div className="mock-highlight">
                      <CheckCheck size={20} /> Coverage, made clear
                    </div>
                    <div className="mock-line long" />
                    <div className="mock-line short" />
                    <div className="doc-seal">
                      <ShieldCheck size={33} />
                    </div>
                  </div>
                  <span className="floating-note">
                    <BookOpen size={16} /> Backed by the source
                  </span>
                </div>
              </section>
              <section
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0] && !busy)
                    loadDocument(e.dataTransfer.files[0]);
                }}
              >
                <span className="upload-icon">
                  <Upload size={23} />
                </span>
                <div>
                  <h3>Bring your own policy</h3>
                  <p>
                    Drop a text PDF here, or browse your files. Up to 10 MB ·
                    100 pages.
                  </p>
                  <small>
                    Other policies support text inspection; coverage estimates
                    need the exact reviewed version.
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() => fileInput.current?.click()}
                  disabled={!!busy}
                >
                  Choose PDF <Plus size={16} />
                </button>
              </section>
              <div className="feature-grid">
                {[
                  [
                    FileCheck2,
                    "01",
                    "Read with context",
                    "Page-linked clauses put the evidence within reach.",
                  ],
                  [
                    MessageSquareText,
                    "02",
                    "Ask in plain language",
                    "Supported answers, with clear limits when evidence is missing.",
                  ],
                  [
                    Wallet,
                    "03",
                    "See the calculation",
                    "A traceable estimate that changes as you add facts.",
                  ],
                ].map(([Icon, num, title, desc]) => {
                  const I = Icon as typeof Wallet;
                  return (
                    <article className="feature" key={String(num)}>
                      <div>
                        <I size={23} />
                        <span>{String(num)}</span>
                      </div>
                      <h3>{String(title)}</h3>
                      <p>{String(desc)}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {active && view === "overview" && (
            <>
              <section className="policy-banner">
                <span className="policy-icon">
                  <FileCheck2 size={30} />
                </span>
                <div>
                  <div className="inline-heading">
                    <h2>{active.name}</h2>
                    <span className={`pill ${active.reviewed ? "" : "amber"}`}>
                      {active.reviewed ? (
                        <Check size={13} />
                      ) : (
                        <CircleHelp size={13} />
                      )}
                      {active.reviewed ? "Reviewed PDF" : "Needs review"}
                    </span>
                  </div>
                  <p>
                    {active.page_count} pages{" "}
                    {active.uin && `· UIN ${active.uin}`} · English text PDF
                  </p>
                  <div className="hash">
                    <Fingerprint size={12} /> SHA-256{" "}
                    {active.sha256.slice(0, 18)}…
                  </div>
                </div>
                <button
                  className="icon-button delete"
                  aria-label={
                    deleteCheck ? "Confirm delete document" : "Delete document"
                  }
                  title={
                    deleteCheck
                      ? "Click again to delete this document"
                      : "Delete this document"
                  }
                  disabled={!!busy}
                  onClick={removeDocument}
                >
                  {deleteCheck ? <Check size={18} /> : <Trash2 size={18} />}
                </button>
              </section>
              <div className="section-heading">
                <h2>Your cover at a glance</h2>
                <span>
                  {active.reviewed
                    ? "6 reviewed clauses"
                    : "No reviewed adapter"}
                </span>
              </div>
              <div className="facts-grid">
                {active.facts.map((fact, index) => (
                  <button
                    key={fact.id}
                    className="fact-card"
                    disabled={!fact.page}
                    onClick={() =>
                      fact.page &&
                      showSource({
                        page: fact.page,
                        quote: fact.quote || "",
                        label: fact.label,
                      })
                    }
                  >
                    <div className="fact-top">
                      <span className="fact-number">0{index + 1}</span>
                      {fact.page && (
                        <span className="fact-page">
                          p. {fact.page}
                          <ArrowUpRight size={12} />
                        </span>
                      )}
                    </div>
                    <h3>{fact.label}</h3>
                    <strong>{fact.value}</strong>
                    <small>
                      {fact.status === "unknown"
                        ? "Unknown · no values assumed"
                        : "View the supporting clause"}
                    </small>
                  </button>
                ))}
              </div>
              <div className="info-strip">
                <CircleHelp size={18} />
                <p>
                  {active.notice} Your personal schedule and remaining balance
                  must be supplied separately.
                </p>
              </div>
              <div className="next-grid">
                <button className="next-card" onClick={() => setView("ask")}>
                  <span className="next-icon">
                    <MessageSquareText size={24} />
                  </span>
                  <div>
                    <h3>What would you like to know?</h3>
                    <p>Ask about co-pay, limits or waiting periods.</p>
                  </div>
                  <ArrowRight size={20} />
                </button>
                <button
                  className="next-card peach"
                  onClick={() => setView("estimate")}
                >
                  <span className="next-icon">
                    <Wallet size={24} />
                  </span>
                  <div>
                    <h3>Put a number to your scenario</h3>
                    <p>Explore the one-eye cataract demo.</p>
                  </div>
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="boundary-note">
                <LockKeyhole size={14} />
                <span>
                  Browser-session isolation · Local storage · No patient
                  identifiers needed
                </span>
                <span>
                  {engine?.mode === "hybrid"
                    ? "Local neural + lexical retrieval"
                    : "Lexical retrieval mode"}
                </span>
              </div>
            </>
          )}
          {active && view === "ask" && (
            <div className="ask-layout">
              <section className="chat-card">
                <div className="card-header">
                  <span className="next-icon">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <h2>Ask your policy</h2>
                    <p>{active.name}</p>
                  </div>
                  <span className="pill small-pill">
                    {engine?.mode === "hybrid"
                      ? "Local AI retrieval"
                      : "Lexical mode"}
                  </span>
                </div>
                <div className="chat-content" aria-live="polite">
                  {history.length === 0 ? (
                    <div className="chat-empty">
                      <span className="empty-symbol">
                        <MessageSquareText size={32} />
                      </span>
                      <h3>Start with a question.</h3>
                      <p>
                        Answers are limited to reviewed policy clauses.
                        <br />
                        No unsupported claim decisions.
                      </p>
                      <div className="suggestions">
                        {[
                          "What is the cataract limit?",
                          "How much is the co-payment?",
                          "What is the cataract waiting period?",
                          "Do I need 24-hour admission?",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => ask(q)}
                            disabled={!!busy}
                          >
                            {q}
                            <ArrowUpRight size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    history.map((turn, idx) => (
                      <div className="chat-turn" key={idx}>
                        <div className="user-question">{turn.question}</div>
                        <div className="answer-block">
                          <div
                            className={`answer-status ${turn.result.status !== "supported" ? "review" : ""}`}
                          >
                            <ShieldCheck size={16} />
                            {turn.result.status === "supported"
                              ? "Supported by a reviewed clause"
                              : "More review needed"}
                          </div>
                          <p>{turn.result.answer}</p>
                          {sourceChips(turn.result.citations)}
                          <small>{turn.result.confidence}</small>
                        </div>
                      </div>
                    ))
                  )}
                  {busy === "ask" && (
                    <div className="inline-loading">
                      <LoaderCircle size={17} className="spin" /> Finding
                      supporting evidence…
                    </div>
                  )}
                </div>
                <form
                  className="question-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask();
                  }}
                >
                  <input
                    ref={questionInput}
                    aria-label="Your policy question"
                    placeholder="Ask about your policy…"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={1000}
                  />
                  <button
                    className="send-button"
                    title="Send question"
                    aria-label="Send question"
                    disabled={!!busy || question.trim().length < 3}
                  >
                    <Send size={19} />
                  </button>
                </form>
                <div className="chat-footnote">
                  Reviewed answers + retrieved evidence. No generative LLM or
                  claim approval.
                </div>
              </section>
              <aside className="context-card">
                <BookOpen size={24} />
                <h3>The source stays close.</h3>
                <p>
                  Every supported answer links to a page in your uploaded
                  document.
                </p>
                <div className="context-step">
                  <span>1</span>
                  <div>
                    <strong>Find the clause</strong>
                    <small>
                      Local embeddings and keyword matching route your question.
                    </small>
                  </div>
                </div>
                <div className="context-step">
                  <span>2</span>
                  <div>
                    <strong>Check the evidence</strong>
                    <small>Read the source page beside the answer.</small>
                  </div>
                </div>
                <div className="context-step">
                  <span>3</span>
                  <div>
                    <strong>Know the boundary</strong>
                    <small>
                      Unreviewed topics get a clear needs-review response.
                    </small>
                  </div>
                </div>
                <div className="mini-notice">
                  <CircleHelp size={16} />
                  <p>
                    Personal eligibility needs your schedule and circumstances.
                    A clause alone cannot confirm a claim.
                  </p>
                </div>
              </aside>
            </div>
          )}
          {active && view === "estimate" && (
            <>
              <div className="scenario-label">
                <FlaskConical size={17} />
                <span>
                  <strong>Bounded demo:</strong> one-eye cataract · day-care ·
                  Pune · synthetic costs
                </span>
                <button
                  onClick={() => {
                    setForm({
                      sum_insured: "500000",
                      remaining_cover: "",
                      bill: "60000",
                      first_cover_date: "2023-10-01",
                      treatment_date: "2026-10-10",
                      pre_existing: "no",
                      standard_case_confirmed: true,
                    });
                    setDirty(true);
                  }}
                >
                  Use fictional example <ArrowRight size={14} />
                </button>
              </div>
              <div className="estimate-layout">
                <section className="form-card">
                  <div className="card-header">
                    <Wallet size={21} />
                    <div>
                      <h2>Your scenario</h2>
                      <p>Leave unknown information blank.</p>
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      calculate();
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        Base sum insured (₹)
                        <input
                          type="number"
                          min="1"
                          max="1000000"
                          step="0.01"
                          required
                          value={form.sum_insured}
                          onChange={(e) =>
                            update("sum_insured", e.target.value)
                          }
                        />
                      </label>
                      <label
                        className={
                          estimate?.missing.includes("remaining_cover")
                            ? "missing-field"
                            : ""
                        }
                      >
                        Remaining annual cover (₹)
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.01"
                          placeholder="Unknown — add to calculate"
                          value={form.remaining_cover}
                          onChange={(e) =>
                            update("remaining_cover", e.target.value)
                          }
                        />
                        <small>From your schedule / claims balance</small>
                      </label>
                      <label>
                        Admissible bill assumption (₹)
                        <input
                          type="number"
                          min="1"
                          max="10000000"
                          step="0.01"
                          placeholder="Use synthetic cohort median"
                          value={form.bill}
                          onChange={(e) => update("bill", e.target.value)}
                        />
                        <small>No room rent or excluded items</small>
                      </label>
                      <label>
                        Pre-existing cataract?
                        <select
                          value={form.pre_existing}
                          onChange={(e) =>
                            update("pre_existing", e.target.value)
                          }
                        >
                          <option value="">Unknown</option>
                          <option value="no">
                            No · 24-month specific wait
                          </option>
                          <option value="yes">
                            Yes · declared and accepted
                          </option>
                        </select>
                      </label>
                      <label>
                        First continuous cover date
                        <input
                          type="date"
                          value={form.first_cover_date}
                          onChange={(e) =>
                            update("first_cover_date", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Planned treatment date
                        <input
                          type="date"
                          required
                          value={form.treatment_date}
                          onChange={(e) =>
                            update("treatment_date", e.target.value)
                          }
                        />
                      </label>
                    </div>
                    <details className="assumptions" open>
                      <summary>Assumptions for this limited scenario</summary>
                      <p>
                        Active adult member; unchanged continuous cover; no
                        portability, bonus, endorsements, enhanced cover or
                        prior claim for this eye this year. Medically necessary
                        day-care treatment, with no room charges, non-admissible
                        items or other exclusions. Any pre-existing condition is
                        declared and accepted.
                      </p>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={form.standard_case_confirmed}
                          onChange={(e) =>
                            update("standard_case_confirmed", e.target.checked)
                          }
                        />
                        <span>
                          These assumptions apply to my illustrative scenario.
                        </span>
                      </label>
                    </details>
                    <button className="button primary full" disabled={!!busy}>
                      {busy === "estimate" ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Wallet size={17} />
                      )}{" "}
                      {estimate ? "Recalculate estimate" : "Calculate estimate"}
                      <ArrowRight size={17} />
                    </button>
                  </form>
                </section>
                <section className="result-card" aria-live="polite">
                  <div className="card-header">
                    <div>
                      <h2>Your cost picture</h2>
                      <p>
                        {dirty && estimate
                          ? "Inputs changed · recalculate to update"
                          : "A traceable estimate, not a claim decision"}
                      </p>
                    </div>
                    {estimate && (
                      <span
                        className={`pill ${estimate.status !== "estimated" ? "amber" : ""}`}
                      >
                        {dirty
                          ? "Out of date"
                          : estimate.status === "estimated"
                            ? "Illustrative"
                            : "Needs attention"}
                      </span>
                    )}
                  </div>
                  {!estimate ? (
                    <div className="result-empty">
                      <div className="cost-rings">
                        <Wallet size={30} />
                      </div>
                      <h3>A clearer estimate starts here.</h3>
                      <p>
                        Add your scenario to see the amount potentially covered
                        and your share of the cost.
                      </p>
                      <div className="empty-legend">
                        <span>
                          <i /> Potentially covered
                        </span>
                        <span>
                          <i /> Out of pocket
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={dirty ? "stale-result" : ""}>
                      {estimate.covered === undefined ? (
                        <div className="missing-result">
                          <CircleHelp size={29} />
                          <h3>
                            {estimate.status === "needs_information"
                              ? "A few facts are still missing."
                              : "This scenario needs review."}
                          </h3>
                          <p>{estimate.message}</p>
                          {estimate.missing.map((item) => (
                            <div className="missing-item" key={item}>
                              <Plus size={15} />
                              {labels[item] || item}
                            </div>
                          ))}
                          <small>
                            We withhold the coverage amount rather than assume a
                            missing value.
                          </small>
                        </div>
                      ) : (
                        <>
                          <div className="bill-total">
                            <span>Illustrative treatment bill</span>
                            <strong>{INR(estimate.bill)}</strong>
                          </div>
                          <div className="cost-split">
                            <div>
                              <span>
                                <i className="green-dot" />
                                Potentially covered
                              </span>
                              <strong>{INR(estimate.covered)}</strong>
                            </div>
                            <div>
                              <span>
                                <i className="coral-dot" />
                                Out of pocket
                              </span>
                              <strong>{INR(estimate.out_of_pocket)}</strong>
                            </div>
                          </div>
                          <div className="cost-bar">
                            <span
                              style={{
                                width: `${(100 * Number(estimate.covered)) / Number(estimate.bill)}%`,
                              }}
                            />
                          </div>
                          {estimate.status === "waiting_period" && (
                            <div className="wait-notice">
                              {estimate.message}
                            </div>
                          )}
                          <div className="ledger">
                            <h3>Where your share comes from</h3>
                            {estimate.ledger?.map((row, i) => (
                              <div className="ledger-row" key={i}>
                                <span>
                                  {row.label}
                                  {row.page && (
                                    <button
                                      onClick={() =>
                                        showSource({
                                          page: row.page!,
                                          quote: "",
                                          label: row.label,
                                        })
                                      }
                                    >
                                      p. {row.page}
                                      <ArrowUpRight size={10} />
                                    </button>
                                  )}
                                </span>
                                <strong>{INR(row.amount)}</strong>
                              </div>
                            ))}
                            <div className="ledger-row total">
                              <span>Your total share</span>
                              <strong>{INR(estimate.out_of_pocket)}</strong>
                            </div>
                          </div>
                          {previous?.covered !== undefined && (
                            <div className="comparison">
                              <ArrowDown size={17} />
                              <div>
                                <strong>
                                  Compared with the previous calculation
                                </strong>
                                <p>
                                  Potential cover: {INR(previous.covered)} →{" "}
                                  {INR(estimate.covered)}
                                  <br />
                                  Your share: {INR(
                                    previous.out_of_pocket,
                                  )} → {INR(estimate.out_of_pocket)}
                                </p>
                              </div>
                            </div>
                          )}
                          <p className="calculation-note">
                            Bill → cataract cap → remaining cover → 5% co-pay.
                            This order is an illustrative interpretation
                            requiring insurer confirmation.
                          </p>
                        </>
                      )}
                      {estimate.cohort && (
                        <div className="cohort">
                          <div>
                            <FlaskConical size={16} />
                            <strong>Synthetic cost context</strong>
                            <span>{estimate.cohort.n} rows</span>
                          </div>
                          <p>
                            Median {INR(estimate.cohort.median)} · P10–P90{" "}
                            {INR(estimate.cohort.p10)}–
                            {INR(estimate.cohort.p90)}
                          </p>
                          <small>
                            Fictional scenario spread, not a hospital quote or
                            confidence interval.
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
              {estimate && (
                <section className="evidence-footer">
                  <h3>
                    <BookOpen size={17} /> Evidence behind the estimate
                  </h3>
                  {sourceChips(estimate.citations)}
                </section>
              )}
            </>
          )}
          {active === null && ready && view !== "overview" && (
            <p className="hint">
              Load a demo or upload a policy to use this view.
            </p>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} /> PolicyLens
            </span>
            <p>Evidence first. Estimates with boundaries.</p>
            <small>HackMatrix 5.0 · FIN01 · Team Master’s</small>
          </footer>
        </main>
      </div>
      {evidence && active && (
        <div className="modal-backdrop" onClick={closeSource}>
          <section
            className="source-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button, a[href], [tabindex='0']",
                );
                const first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="source-header">
              <div>
                <div className="eyebrow">SOURCE EVIDENCE</div>
                <h2 id="source-title">{evidence.label}</h2>
                <p>
                  {active.name} · Page {evidence.page}
                </p>
              </div>
              <button
                ref={sourceClose}
                className="icon-button"
                onClick={closeSource}
                aria-label="Close source evidence"
              >
                <X size={21} />
              </button>
            </div>
            {evidence.quote && <blockquote>{evidence.quote}</blockquote>}
            <a
              className="button secondary"
              href={`/api/documents/${active.id}/pdf#page=${evidence.page}`}
              target="_blank"
              rel="noreferrer"
            >
              Open original PDF at page {evidence.page}
              <ArrowUpRight size={16} />
            </a>
            <div className="source-text-label">EXTRACTED PAGE TEXT</div>
            <pre className="page-text" tabIndex={0}>
              {pageText}
            </pre>
            <p className="source-disclaimer">
              Check the original page for tables and formatting. Extracted text
              is document content, not application instructions.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
