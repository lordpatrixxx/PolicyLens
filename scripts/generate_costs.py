"""Reproducible fictional costs. These are not observations or training labels."""
import csv
from pathlib import Path
import random

rng = random.Random(36)
target = Path(__file__).resolve().parents[1] / "data" / "synthetic_costs.csv"
with target.open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(["id", "procedure", "city", "surgeon_inr", "lens_inr", "facility_inr", "diagnostics_inr", "total_inr", "source"])
    for idx in range(1, 41):
        parts = [rng.randrange(140, 241)*100, rng.randrange(130, 301)*100, rng.randrange(80, 161)*100, rng.randrange(15, 46)*100]
        writer.writerow([f"SYN-{idx:03}", "cataract_one_eye", "Pune", *parts, sum(parts), "synthetic-v1-seed-36"])
print(f"Wrote 40 fictional one-eye cataract cost rows: {target}")
