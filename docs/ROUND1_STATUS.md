# Round 1 implementation scope

Target: seven of twenty planned milestones, approximately 35% of functional breadth. This is not an effort estimate or an official scoring formula.

| Round 1 milestone | Working implementation | Evidence |
|---|---|---|
| 1. Upload and preserve identity | PDF limits, text extraction, SHA-256, page numbers, local ownership | `tests/test_api.py` |
| 2. Bounded critical fields | Six reviewed fields with citations for an exact PDF; unknown for other versions | `backend/policy.py`; real-source quote checks |
| 3. Summary and source viewer | Policy overview, source drawer, original-PDF links | Browser walkthrough |
| 4. Cited question answering | BGE-small plus lexical routing; reviewed answers; unsupported-topic abstention | Topic regression cases and actual-model smoke trace |
| 5. One treatment estimate | Cataract, one eye, Pune; fictional cost cohort and reconciled Decimal ledger | `tests/test_costs.py` |
| 6. Missing fact and changed answer | Remaining cover prompts, calendar waiting checks, recalculation and previous-result comparison | API trace and browser walkthrough |
| 7. Initial regression / demonstration evidence | Unit/API suite and a saved end-to-end JSON trace; browser screenshots | `demo-verification.json`, `VERIFICATION.md` |

The demonstration evidence is a runnable script, screenshots and a walkthrough. A narrated submission video has **not** been recorded.

## Still to build

1. Broader extraction of exclusions, eligibility, deductibles and personal schedule fields.
2. More verified policy versions and at least three supported treatment scenarios.
3. Evaluation of retrieval on a separate held-out question set; conflict detection and claim support checks.
4. Full adjudication-rule review, especially order of limits / balance / co-payment, with appropriate domain review.
5. Real cost-data partnerships and robust provenance. Synthetic spread must not be advertised as price accuracy.
6. Supabase project configuration, Auth, Postgres migrations and RLS, then hosted deployment.
7. OCR if accuracy and time permit; currently scans receive a clear rejection.
8. Persistent scenario revisions, report export and fuller comparison.
9. Wider 30-question / 20-calculation domain evaluation and user feedback.
10. Actual teammate contributions, narrated video and final submission packaging.

## Deliberate limits

This slice produces transparent illustrative estimates. It does not verify policyholder enrollment, claim eligibility, schedule authenticity or live remaining balances. Confirmation checkboxes record assumptions, not proof. Page citations explain the underlying wording; they do not make an unsupported coverage decision valid.
