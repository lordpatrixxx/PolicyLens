# PolicyLens

**Understand the clause. Follow the calculation. Know what is missing.**

HackMatrix 5.0 · FIN01 · Team Master’s · HM50036

A locally runnable Round 1 prototype for policy-to-patient insurance coverage and treatment-cost intelligence. The working slice connects a real policy PDF, page-linked answers, a synthetic cost cohort and an auditable estimate. It does not approve claims.

## What works

- Text-PDF upload with size, page-count, encryption and text validation.
- Page extraction, SHA-256 document identity and a source-text drawer with original-PDF links.
- Six reviewed policy facts, enabled only for one exact HDFC ERGO Arogya Sanjeevani wording PDF. Other uploads stay explicitly unverified.
- Local BGE-small neural embeddings plus lexical routing for bounded questions; reviewed answers with citations, and abstention on unsupported topics. No paid API key or generative LLM is required.
- One-eye day-care cataract scenario in Pune: waiting-period checks, per-eye sub-limit, remaining cover, 5% co-pay, and a reconciled Decimal ledger.
- Missing facts block the total. Add a balance and recalculate; the previous result remains available for comparison in the current view.
- Forty reproducible **fictional** cost records, browser-session document isolation, document deletion, regression tests and a real-source API demonstration trace.

This is approximately **35% of the planned functional breadth**, using seven Round 1 milestones from a twenty-milestone plan. That is a scope-planning proxy, not a measured share of effort or an organizer-approved percentage. See [Round 1 status](docs/ROUND1_STATUS.md) for boundaries and evidence.

## Run on Windows

Requirements: **Python 3.12**, **Node.js 22.13+**, npm, and an internet connection for the initial dependency/model/policy downloads. Use a Python installation with pip and venv. Dependencies and model assets remain local after setup; downloaded files are excluded from Git.

```powershell
git clone https://github.com/lordpatrixxx/PolicyLens.git
cd PolicyLens
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -Python "C:\path\to\Python312\python.exe"
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Open **http://127.0.0.1:3000**. The API runs on **http://127.0.0.1:8000**. Keep the terminal running; Ctrl+C stops the frontend and the launcher stops its backend process. The repository is private, so cloning requires authorized GitHub access.

The setup command's execution-policy flag applies to that process; it does not change the machine policy. If `python` already selects 3.12, omit `-Python`.

Manual startup (also useful for debugging):

```powershell
# Terminal 1, repository root
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000

# Terminal 2
cd frontend
npm.cmd run dev
```

macOS/Linux setup: `python3.12 -m venv .venv`, `.venv/bin/python -m pip install -r requirements.lock.txt`, `.venv/bin/python scripts/prepare_demo.py`, then `npm ci` inside `frontend`. Start the API using `.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`, and the frontend using `npm run dev`. Windows is the tested platform.

## Two-minute demo

1. Click **Explore the demo**. This loads the downloaded, fingerprint-verified public policy.
2. Open **Cataract sub-limit** and inspect page 8. Open the original PDF to check formatting.
3. In **Ask your policy**, ask “What is the cataract waiting period?” The answer cites page 10. Ask “What is my remaining balance?” to see an abstention.
4. Open **Treatment estimate → Use fictional example → Calculate estimate**. The remaining-cover value is intentionally missing, so no coverage amount appears.
5. Enter **500000** as remaining cover and recalculate. For the fictional ₹60,000 bill: cataract cap ₹40,000; co-pay ₹2,000; potential coverage **₹38,000**; out of pocket **₹22,000**.
6. Change remaining cover to **20000** and recalculate. The illustrative ordering gives potential coverage **₹19,000** and out of pocket **₹41,000**. The comparison shows both results.
7. Change first continuous cover date to **2025-10-01**. The waiting-period branch withholds coverage under the stated assumptions.

This is a hypothetical scenario with synthetic costs, not patient information. The cap/remaining-cover/co-pay ordering is explicitly an illustrative interpretation pending insurer confirmation.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe scripts/smoke_demo.py
cd frontend
npm.cmd run typecheck
npm.cmd run build
```

Unit/API tests disable model downloads and run in an isolated temporary database. The smoke script uses the actual source PDF and model, checks all six quote/page pairs, performs the missing-fact/recalculation flow, deletes its test document, and writes [demo-verification.json](docs/demo-verification.json). The trace contains no patient data or credentials. The initial browser walkthrough and limitations are described in [verification notes](docs/VERIFICATION.md).

A GitHub Actions configuration is included as [a CI template](docs/ci-workflow.template.yml). It is not active: the current GitHub login permits repository pushes but lacks the `workflow` scope. An authorized maintainer can later place this file at `.github/workflows/checks.yml`. All reported checks were run locally.

## Architecture

```text
Next.js + React + TypeScript
  └─ same-origin /api proxy → FastAPI
       ├─ pypdf → page text + document SHA-256
       ├─ reviewed adapter → cited facts for one exact version
       ├─ FastEmbed / BGE-small ONNX → question routing + lexical signal
       ├─ Decimal rule engine → waiting check + deduction ledger
       ├─ versioned synthetic CSV → descriptive cost cohort
       └─ SQLite metadata + local PDFs → session-owned documents
```

`backend/policy.py` is the reviewed adapter; `backend/costs.py` is the estimate engine; `backend/retrieval.py` handles retrieval and abstention. The initial backend uses Python's built-in SQLite interface rather than adding an ORM. The frontend has no API secrets. The language model here is a pretrained **embedding model**: answers are reviewed text, not generated by an LLM. Model similarity is not displayed as a factual-confidence probability.

## Scope and data boundaries

- **One exact policy version.** A familiar product name or UIN alone does not enable an estimate. A different PDF hash requires source review and a new adapter. Public wording is not a personal schedule.
- **One bounded scenario.** Adult active member, one eye, day-care, no room charges, no excluded items, no bonus, portability, enhanced cover, endorsements or prior claim for the same eye. Any PED is assumed declared and accepted. Those assumptions must be confirmed in the UI.
- **Partial extraction.** Page text is extracted automatically. The six values are human-reviewed, fingerprint-matched fields. There is no general automatic insurance-rule extractor, universal exclusion engine or schedule parser yet.
- **Synthetic costs.** The 40 rows demonstrate cohort selection and cost spread; they are not hospital quotes, real training observations or a calibrated forecast.
- **Local access.** Random HttpOnly SameSite cookies isolate browser sessions; ownership is checked on every document endpoint. This is not signed-in account authentication. Cookie security and storage are configured for loopback HTTP, not a public deployment.
- **Later scope.** Supabase Auth/Postgres/RLS, cloud deployment, OCR, more policy variants, fuller exclusions, multi-procedure estimates and a broader held-out evaluation. No Supabase project or paid resource is provisioned by this prototype.

Do not expose the development servers to the internet or upload real patient documents into a shared demonstration. Use the provided public wording and fictional scenario. See [source provenance](docs/SOURCES.md), [synthetic-data dictionary](data/README.md) and [architecture decisions](docs/ARCHITECTURE.md).

## Team workflow

Keep the repository private until the organizers instruct otherwise. Each teammate should contribute real work through their own account and commits. The initial implementation was developed with AI assistance; its commit history does not imply contributions by teammates who have not committed.

The submission PPT, explanatory video and Google Drive submission are separate deliverables. This repository does not submit the entry, invite collaborators or make the repository public.

## Troubleshooting

- **API unreachable:** start both servers and use exactly `http://127.0.0.1:3000` or `http://localhost:3000`.
- **Demo missing:** run `python scripts/prepare_demo.py` with the project venv.
- **Source hash changed:** stop and review the new wording. Do not bypass the fingerprint check.
- **Lexical mode:** the model could not load. The status badge reports this explicitly; rerun setup while online. Reviewed lexical answers and calculations still work.
- **Unsupported PDF:** use a text PDF under 10 MB and 100 pages; encrypted/scanned PDFs are rejected.
- **Unknown document after changing browser:** documents belong to the original browser cookie. This is intentional session isolation; load the demo again.
