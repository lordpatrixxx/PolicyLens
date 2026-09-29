"""Download a public wording, verify exact bytes, and warm the local embedding model."""
import hashlib
from pathlib import Path
import sys
import urllib.request
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.policy import POLICY_HASH, SOURCE_URL

def main():
    root = Path(__file__).resolve().parents[1]
    runtime = root / "runtime"
    runtime.mkdir(exist_ok=True)
    path = runtime / "demo-policy.pdf"
    if not path.exists():
        req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "PolicyLens/0.1 demo-source-verification"})
        with urllib.request.urlopen(req, timeout=60) as response:
            content = response.read(10 * 1024 * 1024 + 1)
        if hashlib.sha256(content).hexdigest() != POLICY_HASH:
            raise SystemExit("Source changed; adapter requires review. No PDF saved.")
        path.write_bytes(content)
    if hashlib.sha256(path.read_bytes()).hexdigest() != POLICY_HASH:
        raise SystemExit("Existing demo PDF fingerprint does not match; adapter requires review.")
    print("Verified demo policy: 29 pages, SHA-256 " + POLICY_HASH)
    from backend.retrieval import load_model, engine_status
    load_model()
    print(engine_status())

if __name__ == "__main__":
    main()
