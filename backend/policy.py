"""Reviewed, bounded adapter. Values are never inferred for an unknown document."""
SOURCE_URL = "https://customer-portal-assets.hdfcergo.com/documents/arogya-sanjeevani-policy-retail-pw-570443039657.pdf"
POLICY_HASH = "317a5d6e8ce1e72117132779462ec6276b7fd06758767b92a56d5da74b8b0d25"
POLICY_NAME = "Arogya Sanjeevani · HDFC ERGO"
UIN = "HDFHLIP20175V011920"
FACTS = [
    {"id": "cataract", "label": "Cataract sub-limit", "value": "25% of base cover, up to ₹40,000", "page": 8,
     "quote": "25% of Sum Insured or Rs.40,000/-, whichever is lower, per each eye in one policy year.",
     "answer": "Cataract treatment is limited to the lower of 25% of the sum insured and ₹40,000, for each eye in one policy year. Waiting periods, co-payment and other policy conditions still apply.",
     "queries": "cataract surgery eye limit coverage lens operation cap how much cataract covered"},
    {"id": "copay", "label": "Co-payment", "value": "5% of the admissible, payable claim", "page": 20,
     "quote": "Co-payment of 5% applicable to claim amount admissible and payable",
     "answer": "Every claim has a 5% co-payment on the amount admissible and payable under the policy. This is not 5% of every hospital bill regardless of exclusions or limits.",
     "queries": "copay co-pay co payment coinsurance percentage my share percentage contribution"},
    {"id": "waiting", "label": "Cataract waiting period", "value": "24 months of continuous cover", "page": 10,
     "quote": "24 Months waiting period",
     "answer": "Cataract appears in the 24-month specific waiting-period list. A longer pre-existing-disease waiting period can apply. The clause also discusses accidents, portability and increases in cover; those exceptions need separate review.",
     "queries": "waiting wait cataract eligible eligible after how long two years continuous coverage"},
    {"id": "ped", "label": "Pre-existing disease wait", "value": "36 months, with conditions", "page": 9,
     "quote": "excluded until the expiry of 36months of continuous coverage",
     "answer": "The wording specifies 36 months of continuous coverage for pre-existing diseases and their direct complications. The condition must have been declared and accepted. Portability and cover increases require separate review.",
     "queries": "pre-existing preexisting PED existing disease declared disease 36 months"},
    {"id": "room", "label": "Room rent limit", "value": "2% of cover, up to ₹5,000/day", "page": 7,
     "quote": "2% of the sum insured subject to maximum of Rs.5000/-, per day.",
     "answer": "Room rent, boarding and nursing have a daily limit of 2% of the sum insured, capped at ₹5,000. Choosing a room above the limit may also proportionately reduce associated medical expenses, subject to the hospital billing exception in the clause.",
     "queries": "room rent boarding nursing accommodation bed private room daily limit"},
    {"id": "daycare", "label": "Day-care treatment", "value": "24-hour admission not required", "page": 7,
     "quote": "the time limit shall not apply in respect of Day Care Treatment",
     "answer": "The usual 24-hour hospitalization requirement does not apply to day-care treatment. Other admissibility conditions, limits and exclusions still apply.",
     "queries": "daycare day care 24 hours admission overnight hospitalization hospitalisation outpatient"},
]

def facts_for(sha: str):
    if sha != POLICY_HASH:
        return [{"id": "unverified", "label": "Policy adapter", "value": "Not verified for this document", "status": "unknown"}]
    return [{**fact, "status": "source_verified", "method": "Reviewed adapter matched by SHA-256"} for fact in FACTS]
