"""Local CPU neural retrieval; extractive answers, never free-form claim generation."""
import os
import re
from pathlib import Path
import numpy as np
from .policy import FACTS, POLICY_HASH

MODEL_NAME = "BAAI/bge-small-en-v1.5"
MODEL = None
MODEL_ERROR = None
FACT_VECTORS = None

def tokens(value):
    return set(re.findall(r"[a-z0-9]+", value.lower())) - {"the", "a", "is", "what", "of", "my", "for", "in", "to", "does", "it", "and", "can", "i"}

def load_model():
    global MODEL, MODEL_ERROR, FACT_VECTORS
    if MODEL is not None or MODEL_ERROR is not None:
        return
    try:
        if os.getenv("POLICYLENS_DISABLE_ML") == "1":
            raise RuntimeError("Disabled by configuration")
        from fastembed import TextEmbedding
        MODEL = TextEmbedding(model_name=MODEL_NAME, cache_dir=str(Path(os.getenv("POLICYLENS_DATA", "runtime")) / "models"), threads=2)
        FACT_VECTORS = np.array(list(MODEL.embed([f["queries"] + ". " + f["answer"] for f in FACTS])))
    except Exception as exc:
        MODEL_ERROR = type(exc).__name__ + ": model unavailable; using lexical retrieval"
        MODEL = None

def engine_status():
    return {"mode": "hybrid" if MODEL is not None else "lexical", "model": MODEL_NAME if MODEL is not None else None, "note": MODEL_ERROR, "generation": "Reviewed extractive answers; no generative LLM"}

def answer(question: str, document: dict):
    q = tokens(question)
    # Personalized decisions and multi-topic questions must not be answered by a generic clause.
    personal = bool(q & {"balance", "remaining", "approve", "approval", "guarantee", "premium", "diagnose", "diagnosis", "deductible", "maternity", "cancer", "bypass"})
    lexical = np.array([len(q & tokens(f["queries"])) / max(1, len(q)) for f in FACTS])
    scores = lexical.copy()
    if MODEL is not None:
        vector = np.array(list(MODEL.query_embed([question])))[0]
        dense = FACT_VECTORS @ vector / (np.linalg.norm(FACT_VECTORS, axis=1) * np.linalg.norm(vector) + 1e-9)
        scores = .55 * dense + .45 * lexical
    idx = int(np.argmax(scores))
    # Similarity is a routing signal, not a factual-confidence probability.
    supported = document["sha256"] == POLICY_HASH and not personal and lexical[idx] >= .16 and scores[idx] >= .24
    if supported:
        fact = FACTS[idx]
        return {"status": "supported", "answer": fact["answer"], "citations": [{"page": fact["page"], "quote": fact["quote"], "label": fact["label"]}], "engine": engine_status(), "confidence": "Reviewed clause; applicability to your claim is not verified."}
    chunks = []
    for page in document["pages"]:
        for start in range(0, len(page["text"]), 700):
            chunk = page["text"][start:start + 900]
            score = len(q & tokens(chunk)) / max(1, len(q))
            if score > .2:
                chunks.append((score, page["number"], chunk))
    chunks.sort(reverse=True)
    citations = [{"page": p, "quote": chunk, "label": "Candidate passage · not an answer"} for _, p, chunk in chunks[:2]]
    return {"status": "needs_review", "answer": "I cannot give a supported answer to that question in this prototype. The reviewed topics are cataract limits, co-payment, waiting periods, pre-existing diseases, room rent and day-care admission. Candidate passages below need human review; they do not establish coverage.", "citations": citations, "engine": engine_status(), "confidence": "Insufficient reviewed evidence for an answer."}
