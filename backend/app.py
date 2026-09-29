from contextlib import asynccontextmanager
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pypdf import PdfReader
from .policy import POLICY_HASH, POLICY_NAME, SOURCE_URL, UIN, facts_for
from .retrieval import answer, engine_status, load_model
from .costs import Scenario, cohort, estimate

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.getenv("POLICYLENS_DATA", str(ROOT / "runtime"))).resolve()
MAX_BYTES = 10 * 1024 * 1024
DATA.mkdir(parents=True, exist_ok=True)

def connection():
    db = sqlite3.connect(DATA / "policylens.db")
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with connection() as db:
        db.execute("CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL)")
        db.execute("CREATE INDEX IF NOT EXISTS documents_owner ON documents(owner)")

@asynccontextmanager
async def lifespan(app):
    init_db()
    load_model()
    yield

app = FastAPI(title="PolicyLens", version="0.1.0", lifespan=lifespan)

@app.middleware("http")
async def session_and_origin(request: Request, call_next):
    if request.method in {"POST", "DELETE", "PUT", "PATCH"}:
        allowed = {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"}
        origin = request.headers.get("origin")
        if request.headers.get("x-policylens") != "1" or (origin and origin not in allowed):
            return Response("Cross-origin mutation rejected", status_code=403)
    token = request.cookies.get("policylens_session")
    is_new = not token or len(token) != 64 or not all(c in "0123456789abcdef" for c in token)
    if is_new:
        token = secrets.token_hex(32)
    request.state.owner = sha256(token.encode()).hexdigest()
    response = await call_next(request)
    if is_new:
        response.set_cookie("policylens_session", token, httponly=True, samesite="strict", max_age=86400 * 7, secure=False)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response

def read_document(document_id: str, request: Request):
    with connection() as db:
        row = db.execute("SELECT payload FROM documents WHERE id=? AND owner=?", (document_id, request.state.owner)).fetchone()
    if not row:
        raise HTTPException(404, "Document not found in this browser session.")
    return json.loads(row["payload"])

def public_document(doc):
    return {k: v for k, v in doc.items() if k != "pages"}

def ingest(raw: bytes, filename: str, owner: str):
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "PDF exceeds the 10 MB prototype limit.")
    if not raw.startswith(b"%PDF-"):
        raise HTTPException(422, "This file is not a valid PDF.")
    try:
        reader = PdfReader(BytesIO(raw))
        if reader.is_encrypted:
            raise HTTPException(422, "Encrypted PDFs are not supported. Upload an unlocked copy.")
        if not 1 <= len(reader.pages) <= 100:
            raise HTTPException(422, "Upload a PDF with 1–100 pages.")
        pages = [{"number": i+1, "text": p.extract_text() or ""} for i, p in enumerate(reader.pages)]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "The PDF could not be read. Try another text PDF.") from None
    if sum(len(p["text"].strip()) for p in pages) < 100:
        raise HTTPException(422, "No usable text was found. Scanned PDFs need OCR, which is outside this prototype.")
    if sum(len(p["text"]) for p in pages) > 2_000_000:
        raise HTTPException(422, "Extracted text exceeds the prototype processing limit.")
    digest = sha256(raw).hexdigest()
    reviewed = digest == POLICY_HASH
    doc_id = uuid.uuid4().hex
    doc = {"id": doc_id, "filename": filename.replace("\\", "/").split("/")[-1][:150], "sha256": digest,
           "page_count": len(pages), "pages": pages, "reviewed": reviewed,
           "name": POLICY_NAME if reviewed else "Uploaded policy · unverified version",
           "uin": UIN if reviewed else None, "source_url": SOURCE_URL if reviewed else None,
           "created_at": datetime.now(timezone.utc).isoformat(), "facts": facts_for(digest),
           "notice": "Reviewed fields are matched to this exact PDF fingerprint. Schedule, eligibility and all exclusions are not automatically extracted."}
    (DATA / f"{doc_id}.pdf").write_bytes(raw)
    with connection() as db:
        db.execute("INSERT INTO documents VALUES (?, ?, ?)", (doc_id, owner, json.dumps(doc)))
    return public_document(doc)

@app.get("/api/health")
def health():
    return {"status": "ok", "engine": engine_status(), "demo_ready": (DATA / "demo-policy.pdf").exists(), "version": "0.1.0"}

@app.get("/api/documents")
def documents(request: Request):
    with connection() as db:
        rows = db.execute("SELECT payload FROM documents WHERE owner=? ORDER BY rowid DESC", (request.state.owner,)).fetchall()
    return [public_document(json.loads(row["payload"])) for row in rows]

@app.post("/api/documents")
async def upload(request: Request, file: UploadFile = File(...)):
    raw = await file.read(MAX_BYTES + 1)
    await file.close()
    return ingest(raw, file.filename or "policy.pdf", request.state.owner)

@app.post("/api/demo")
def demo(request: Request):
    path = DATA / "demo-policy.pdf"
    if not path.exists():
        raise HTTPException(503, "Demo document missing. Run python scripts/prepare_demo.py first.")
    raw = path.read_bytes()
    if sha256(raw).hexdigest() != POLICY_HASH:
        raise HTTPException(409, "Source PDF changed. Re-review the policy before enabling this adapter.")
    return ingest(raw, "HDFC-ERGO-Arogya-Sanjeevani.pdf", request.state.owner)

@app.get("/api/documents/{document_id}/pages/{page}")
def page(document_id: str, page: int, request: Request):
    doc = read_document(document_id, request)
    if page < 1 or page > doc["page_count"]:
        raise HTTPException(404, "Page not found.")
    return doc["pages"][page-1]

@app.get("/api/documents/{document_id}/pdf")
def pdf(document_id: str, request: Request):
    read_document(document_id, request)
    return FileResponse(DATA / f"{document_id}.pdf", media_type="application/pdf", filename="policy.pdf", content_disposition_type="inline")

@app.delete("/api/documents/{document_id}")
def delete(document_id: str, request: Request):
    read_document(document_id, request)
    with connection() as db:
        db.execute("DELETE FROM documents WHERE id=? AND owner=?", (document_id, request.state.owner))
    (DATA / f"{document_id}.pdf").unlink(missing_ok=True)
    return {"deleted": True}

class Question(BaseModel):
    question: str = Field(min_length=3, max_length=1000)

@app.post("/api/documents/{document_id}/questions")
def ask(document_id: str, body: Question, request: Request):
    return answer(body.question, read_document(document_id, request))

@app.post("/api/documents/{document_id}/estimates")
def calculate(document_id: str, body: Scenario, request: Request):
    doc = read_document(document_id, request)
    return estimate(body, doc["sha256"])

@app.get("/api/costs")
def costs():
    return cohort()
