"""Real-source end-to-end API trace. Does not replace the browser walkthrough."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from backend.app import app
from backend.policy import FACTS, POLICY_HASH

HEADERS = {"X-PolicyLens": "1"}
steps = []
with TestClient(app) as client:
    health = client.get("/api/health").json()
    response = client.post("/api/demo", headers=HEADERS)
    assert response.status_code == 200, response.text
    doc = response.json(); doc_id = doc["id"]
    try:
        assert doc["sha256"] == POLICY_HASH and doc["page_count"] == 29
        steps.append("Loaded the hash-verified 29-page public policy.")
        for fact in FACTS:
            page = client.get(f"/api/documents/{doc_id}/pages/{fact['page']}").json()["text"]
            assert " ".join(fact["quote"].split()) in " ".join(page.split()), fact["id"]
        steps.append("All six reviewed excerpts occur on their cited source pages.")
        for question, page in [("What is the cataract limit?", 8), ("How much is the co-payment?", 20), ("What is the cataract waiting period?", 10), ("What is the room rent limit?", 7)]:
            result = client.post(f"/api/documents/{doc_id}/questions", json={"question": question}, headers=HEADERS).json()
            assert result["status"] == "supported" and result["citations"][0]["page"] == page, result
        steps.append("Four source-grounded questions routed to their expected pages with the actual retrieval engine.")
        scenario = {"bill": 60000, "sum_insured": 500000, "first_cover_date": "2023-10-01", "treatment_date": "2026-10-10", "pre_existing": False, "standard_case_confirmed": True}
        result = client.post(f"/api/documents/{doc_id}/estimates", json=scenario, headers=HEADERS).json()
        assert result["status"] == "needs_information" and "remaining_cover" in result["missing"] and "covered" not in result
        steps.append("Missing remaining cover withheld the estimate.")
        values = []
        for remaining, expected in [(500000, "38000.00"), (20000, "19000.00")]:
            scenario["remaining_cover"] = remaining
            result = client.post(f"/api/documents/{doc_id}/estimates", json=scenario, headers=HEADERS).json()
            assert result["covered"] == expected, result
            values.append({k: result[k] for k in ["bill", "covered", "out_of_pocket", "ledger"]})
        steps.append("Adding cover enabled INR 38,000; reducing it to INR 20,000 recomputed potential cover to INR 19,000.")
        report = {"date": datetime.now(timezone.utc).isoformat(), "status": "passed", "engine": health["engine"], "source_sha256": POLICY_HASH, "steps": steps, "scenarios": values}
        target = Path(__file__).resolve().parents[1] / "docs" / "demo-verification.json"
        target.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
    finally:
        assert client.delete(f"/api/documents/{doc_id}", headers=HEADERS).status_code == 200
