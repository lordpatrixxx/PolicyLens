# Source and model provenance

## Policy wording

- Publisher: HDFC ERGO General Insurance Company Limited.
- Document: Arogya Sanjeevani Policy, HDFC ERGO; 29 pages.
- Printed UIN: `HDFHLIP20175V011920`.
- [Official wording library](https://www.hdfcergo.com/download/policy-wordings/health).
- [Exact downloaded PDF](https://customer-portal-assets.hdfcergo.com/documents/arogya-sanjeevani-policy-retail-pw-570443039657.pdf).
- Retrieved for this prototype: 2026-09-28.
- SHA-256: `317a5d6e8ce1e72117132779462ec6276b7fd06758767b92a56d5da74b8b0d25`.

The source PDF is downloaded on setup and excluded from Git. Short reviewed excerpts appear in the adapter. Full page text is exposed only from the locally loaded document. Insurer copyright remains with its owner; the project has no affiliation with the insurer.

## Reviewed adapter locations

| Field | PDF page | Section / review note |
|---|---:|---|
| Cataract cap | 8 | B.1.3, per-eye annual sub-limit |
| Co-payment | 20 | Clause 5, 5% of admissible and payable amount |
| Specific waiting period | 10 | C.1.3, 24-month list includes cataract |
| PED waiting period | 9 | C.1.1, 36 months and declaration/acceptance conditions |
| Room rent | 7 | B.1.1 and note on associated expenses; continuation on page 8 |
| Day-care duration | 7 | B.1.1, exception to 24-hour hospitalization duration |

Page numbers mean one-based PDF page positions, which match the printed pages in this version. The smoke script checks literal excerpt presence after whitespace normalization. This validates the excerpt location, not every possible interpretation of a clause.

The engine applies the cataract cap, then remaining available cover, then the co-payment. The wording states co-payment applies to admissible/payable amounts but this prototype has not obtained insurer confirmation of all interactions. That ordering is explicitly labeled **illustrative** in the product. Future versions need a reviewed rule matrix and example adjudications before broader use.

## Embedding model

- Model: `BAAI/bge-small-en-v1.5`, through FastEmbed's ONNX implementation.
- [Upstream model card](https://huggingface.co/BAAI/bge-small-en-v1.5).
- [FastEmbed quickstart](https://qdrant.tech/documentation/fastembed/fastembed-quickstart/).
- Pretrained model, not trained on our fictional costs or insurance records.
- Used to route a question among six reviewed clause descriptions; lexical overlap is an additional gate.
- Other PDF passage candidates currently use lexical retrieval and are labeled unverified.
- The downloadable model cache is excluded from Git. No paid inference service or external patient-data transmission is used.

## Synthetic cost data

Created by `scripts/generate_costs.py`, seed 36, version `synthetic-v1-seed-36`. No hospital source, medical record or statistical accuracy claim. See `data/README.md`.
