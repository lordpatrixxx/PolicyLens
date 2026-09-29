# Fictional treatment-cost cohort

`synthetic_costs.csv` contains 40 entirely fictional one-eye cataract scenarios in Pune. It was generated with Python `random.Random(36)`. Rebuild with `python scripts/generate_costs.py`; no input or patient data is required.

| Column | Meaning |
|---|---|
| id | Synthetic record identifier; never a patient ID |
| procedure | `cataract_one_eye` |
| city | `Pune`, the only supported demo cohort |
| surgeon_inr | Fictional surgeon cost component in whole rupees |
| lens_inr | Fictional lens component; assumes admissible items |
| facility_inr | Fictional day-care facility cost; excludes room rent |
| diagnostics_inr | Fictional diagnostics component |
| total_inr | Sum of the four components |
| source | Fixed synthetic generator version |

Component ranges are chosen solely to exercise the UI and policy limits. They are not estimates of market prices. The app uses the cohort median when no bill override is entered. It reports the empirical P10/P90 using sorted index `floor((n-1)*p)` and requires at least 10 rows. This is a descriptive spread of fictional values, not a prediction confidence interval. No regression model is trained on this data.
