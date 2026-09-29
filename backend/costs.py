"""Reconciled Decimal ledger for one explicitly bounded illustrative scenario."""
from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import csv
from pathlib import Path
from statistics import median
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from .policy import POLICY_HASH, FACTS

Money = Decimal
def money(value):
    return Decimal(str(value)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)

class Scenario(BaseModel):
    procedure: Literal["cataract_one_eye"] = "cataract_one_eye"
    city: str = Field(default="Pune", max_length=60)
    sum_insured: Decimal = Field(default=Decimal(500000), gt=0, le=1000000, decimal_places=2)
    remaining_cover: Decimal | None = Field(default=None, ge=0, le=1000000, decimal_places=2)
    bill: Decimal | None = Field(default=None, gt=0, le=10000000, decimal_places=2)
    first_cover_date: date | None = None
    treatment_date: date = date(2026, 10, 10)
    pre_existing: bool | None = None
    standard_case_confirmed: bool = False

    @model_validator(mode="after")
    def check_dates_and_cover(self):
        if self.first_cover_date and self.first_cover_date > self.treatment_date:
            raise ValueError("First cover date must not be after treatment date.")
        if self.remaining_cover is not None and self.remaining_cover > self.sum_insured:
            raise ValueError("This no-bonus demo requires remaining cover to be at most the base sum insured.")
        return self

def anniversary(start: date, months: int):
    year = start.year + (start.month - 1 + months) // 12
    month = (start.month - 1 + months) % 12 + 1
    return date(year, month, min(start.day, monthrange(year, month)[1]))

def cohort(city="Pune"):
    with (Path(__file__).resolve().parents[1] / "data" / "synthetic_costs.csv").open() as f:
        rows = [r for r in csv.DictReader(f) if r["city"] == city and r["procedure"] == "cataract_one_eye"]
    if len(rows) < 10:
        return None
    values = sorted(int(r["total_inr"]) for r in rows)
    return {"n": len(rows), "median": median(values), "p10": values[int((len(values)-1)*.1)], "p90": values[int((len(values)-1)*.9)], "source": "Synthetic demo data · not hospital prices", "version": "synthetic-v1-seed-36", "city": city}

def estimate(scenario: Scenario, sha: str):
    group = cohort(scenario.city)
    base = {"cohort": group, "currency": "INR", "assumptions": [
        "One eye, medically necessary day-care cataract procedure; no room rent, add-ons or non-admissible bill items.",
        "Active adult member; continuous unchanged cover; no portability, bonus, enhancement, endorsements or prior claim for this eye this year.",
        "Any pre-existing condition was declared and accepted; no other exclusion applies. These are scenario assumptions, not verified patient facts.",
        "Illustrative order: admissible bill → per-eye sub-limit → remaining cover → 5% co-payment. Insurer confirmation is required for actual settlement.",
    ], "citations": [{"page": f["page"], "quote": f["quote"], "label": f["label"]} for f in FACTS if f["id"] in {"cataract", "copay", "waiting", "ped"}]}
    if sha != POLICY_HASH:
        return {**base, "citations": [], "status": "unsupported", "message": "Estimates are enabled only for the exact reviewed policy PDF. This document has a different SHA-256 fingerprint.", "missing": []}
    if group is None:
        return {**base, "status": "unsupported", "message": "The demo dataset covers Pune only. No estimate is available for this cohort.", "missing": []}
    missing = [name for name in ["remaining_cover", "first_cover_date", "pre_existing"] if getattr(scenario, name) is None]
    if not scenario.standard_case_confirmed:
        missing.append("standard_case_confirmed")
    if missing:
        return {**base, "status": "needs_information", "message": "Add the missing facts before calculating a coverage amount.", "missing": missing}
    bill = money(scenario.bill if scenario.bill is not None else group["median"])
    months = 36 if scenario.pre_existing else 24
    eligible_on = anniversary(scenario.first_cover_date, months)
    if scenario.treatment_date < eligible_on:
        return {**base, "status": "waiting_period", "message": f"Under these assumptions, the {months}-month wait ends on {eligible_on.isoformat()}.", "eligible_on": eligible_on.isoformat(), "bill": str(bill), "covered": "0.00", "out_of_pocket": str(bill), "ledger": [{"label": "Waiting-period exclusion", "amount": str(bill), "page": 9 if scenario.pre_existing else 10}], "missing": []}
    sublimit = min(money(scenario.sum_insured * Decimal(".25")), Decimal(40000))
    after_limit = min(bill, sublimit)
    after_cover = min(after_limit, money(scenario.remaining_cover))
    copay = money(after_cover * Decimal(".05"))
    covered = money(after_cover - copay)
    oop = money(bill - covered)
    ledger = [
        {"label": "Above cataract per-eye limit", "amount": str(bill - after_limit), "page": 8},
        {"label": "Above remaining available cover", "amount": str(after_limit - after_cover), "page": None},
        {"label": "5% co-payment on capped amount", "amount": str(copay), "page": 20},
    ]
    assert sum(Decimal(r["amount"]) for r in ledger) == oop
    return {**base, "status": "estimated", "message": "Illustrative estimate under the confirmed scenario assumptions.", "bill": str(bill), "covered": str(covered), "out_of_pocket": str(oop), "sublimit": str(sublimit), "eligible_on": eligible_on.isoformat(), "ledger": ledger, "missing": [], "bill_source": "User-entered admissible bill assumption" if scenario.bill is not None else "Synthetic cohort median"}
