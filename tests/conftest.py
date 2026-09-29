import os
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["POLICYLENS_DISABLE_ML"] = "1"
os.environ["POLICYLENS_DATA"] = tempfile.mkdtemp(prefix="policylens-tests-")
