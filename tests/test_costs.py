from datetime import date
from decimal import Decimal
import pytest
from pydantic import ValidationError
from backend.costs import Scenario, anniversary, cohort, estimate
from backend.policy import POLICY_HASH

def scenario(**updates):
    return Scenario(**{ "sum_insured": 500000, "remaining_cover": 500000, "bill": 60000,
        "first_cover_date": "2023-10-01", "treatment_date": "2026-10-10", "pre_existing": False,
        "standard_case_confirmed": True, **updates })

@pytest.mark.parametrize("changes,covered,oop", [
    ({}, "38000.00", "22000.00"),
    ({"remaining_cover": 20000}, "19000.00", "41000.00"),
    ({"remaining_cover": 0}, "0.00", "60000.00"),
    ({"sum_insured": 100000, "remaining_cover": 100000}, "23750.00", "36250.00"),
    ({"bill": 20000}, "19000.00", "1000.00"),
    ({"bill": "20000.10"}, "19000.09", "1000.01"),
    ({"first_cover_date": "2024-10-10"}, "38000.00", "22000.00"),
    ({"first_cover_date": "2024-10-11"}, "0.00", "60000.00"),
    ({"first_cover_date": "2024-10-10", "pre_existing": True}, "0.00", "60000.00"),
    ({"first_cover_date": "2023-10-10", "pre_existing": True}, "38000.00", "22000.00"),
])
def test_scenario_arithmetic_and_waiting_boundaries(changes, covered, oop):
    result = estimate(scenario(**changes), POLICY_HASH)
    assert result["covered"] == covered
    assert result["out_of_pocket"] == oop
    assert Decimal(result["bill"]) == Decimal(covered) + Decimal(oop)
    assert sum(Decimal(r["amount"]) for r in result["ledger"]) == Decimal(oop)

@pytest.mark.parametrize("field", ["remaining_cover", "first_cover_date", "pre_existing"])
def test_missing_facts_withhold_totals(field):
    result = estimate(scenario(**{field: None}), POLICY_HASH)
    assert result["status"] == "needs_information"
    assert field in result["missing"]
    assert "covered" not in result

def test_unknown_assumptions_and_unknown_pdf():
    assert estimate(scenario(standard_case_confirmed=False), POLICY_HASH)["status"] == "needs_information"
    result = estimate(scenario(), "different-version")
    assert result["status"] == "unsupported" and result["citations"] == []
    assert "covered" not in result

@pytest.mark.parametrize("updates", [{"bill": -1}, {"remaining_cover": -1}, {"remaining_cover": 600000}, {"sum_insured": 0}, {"first_cover_date": "2027-01-01"}, {"bill": "NaN"}, {"bill": "0.001"}, {"remaining_cover": "100.001"}, {"sum_insured": "500000.123"}])
def test_invalid_financial_inputs(updates):
    with pytest.raises(ValidationError):
        scenario(**updates)

def test_no_fallback_to_wrong_city():
    result = estimate(scenario(city="Mumbai"), POLICY_HASH)
    assert result["status"] == "unsupported" and "covered" not in result

def test_calendar_and_synthetic_cohort():
    assert anniversary(date(2024, 2, 29), 24) == date(2026, 2, 28)
    data = cohort()
    assert data["n"] == 40 and data["p10"] <= data["median"] <= data["p90"]
    assert "Synthetic" in data["source"]
    result = estimate(scenario(bill=None), POLICY_HASH)
    assert Decimal(result["bill"]) == Decimal(str(data["median"]))
