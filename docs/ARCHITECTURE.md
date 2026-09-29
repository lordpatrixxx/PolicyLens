# Decisions for the Round 1 slice

## Evidence before broad answers

PDF parsing extracts page text, but parsing is not rule interpretation. Only a byte-identical reviewed PDF receives the known facts and calculator adapter. Unknown uploads can be inspected and searched; they never inherit another policy's rules. Uploaded text is treated as data, never instructions.

Question routing combines a local neural embedding with lexical overlap against six reviewed topics. The returned prose is reviewed text, not LLM-generated synthesis. Queries without sufficient reviewed support receive `needs_review` and optional candidate passages. This is a deliberately small evaluation surface, not a general insurance chatbot.

## Financial calculations

Use Pydantic validation, calendar-month anniversaries and Decimal arithmetic with explicit two-decimal half-up rounding. A bill equals potential coverage plus out-of-pocket amount. Every out-of-pocket component appears in the ledger. Unknown balance, date or PED status never becomes zero or false. The UI marks a result stale when inputs change and requires an explicit recalculation.

The chosen interpretation is `bill → per-eye cap → remaining cover → co-payment`; this is labeled illustrative and needs insurer review. Waiting-period outputs are conditional on the narrow scenario assumptions. Accident, portability, enhanced cover, room-rent adjustments, endorsements and excluded items require future adapters.

## Storage and access

SQLite stores document metadata and page text. PDFs live beside it in ignored `runtime/`, named only with server-generated UUIDs. A random 256-bit HttpOnly SameSite=Strict cookie identifies the local browser session; only its SHA-256 hash is stored as document ownership. Every document, page, question, estimate and delete endpoint verifies ownership. Mutation endpoints require a custom request header and reject unexpected origins; there is no permissive CORS middleware.

Both development servers bind to loopback. Secure cookies, signed-in user accounts, rate limiting, parser isolation, storage quotas, retention policies and production deployment controls are not finished. No service-role key belongs in frontend code. Supabase integration will use signed-in identity, private storage and owner-based RLS when a project is configured. No Supabase credentials are stored here.

## Reproducibility

Python and npm dependency lockfiles are committed. Setup downloads the public policy only if its bytes match the reviewed hash. FastEmbed's model cache is local; an unavailable model produces an explicit lexical-mode badge. Unit tests do not need internet or model downloads. The separate smoke demonstration exercises the actual model and downloaded source.

## API

| Method / path | Purpose |
|---|---|
| GET `/api/health` | Read model mode and demo readiness |
| GET `/api/documents` | List documents owned by this browser |
| POST `/api/documents` | Upload multipart `file` |
| POST `/api/demo` | Load verified local demo wording |
| GET `/api/documents/{id}/pages/{page}` | Read one extracted page |
| GET `/api/documents/{id}/pdf` | Read original PDF |
| POST `/api/documents/{id}/questions` | Submit `{question}` |
| POST `/api/documents/{id}/estimates` | Validate and calculate a scenario |
| DELETE `/api/documents/{id}` | Delete this session's document and PDF |
| GET `/api/costs` | Inspect fictional cohort summary |

Interactive schema is at `http://127.0.0.1:8000/docs`. For mutations, clients must send `X-PolicyLens: 1` and retain the session cookie. The supplied frontend handles both.
