"""Taxonomy enforcement, field-scope validation, and deterministic safety guardrails."""

import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from .models import ReportResult

import re

TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "data" / "taxonomy.json"

with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
    TAXONOMY = json.load(f)

VALID_VERDICTS = set(TAXONOMY["verdicts"].keys())
VALID_REPAIRS = set(TAXONOMY["repairs"].keys())
REPAIR_SPECS = TAXONOMY["repairs"]

INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"you\s+are\s+the\s+admin\s+bot",
    r"mark\s+this\s+report\s+as\s+corrected",
    r"system\s+prompt",
    r"jailbreak",
    r"as\s+an\s+ai\s+model",
    r"forget\s+previous\s+commands",
    r"<script",
    r"\bsudo\b",
    r"\bdan\s+mode\b",
]


FERR_BASE_THRESHOLD = 0.90
FERR_RATCHET_THRESHOLD = 0.95
FERR_TRIGGER_PERCENT = 2.0  # Ratchet triggered if FERR > 2%


def calculate_ferr(db_conn=None) -> float:
    """
    Computes Faculty Edit-Reversal Rate (FERR):
    Percentage of auto-applied or approved fixes that subsequently received a secondary dispute or reversal.
    """
    try:
        from backend.database import get_conn
        conn = db_conn or get_conn()
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM audit_log WHERE action = 'approve_fix'")
        row = cur.fetchone()
        total_applied = row[0] if row else 0
        if total_applied == 0:
            return 0.0
        cur.execute("SELECT count(*) FROM audit_log WHERE action IN ('reject_report', 'reversal') AND details LIKE '%revert%'")
        row_rev = cur.fetchone()
        reversals = row_rev[0] if row_rev else 0
        if not db_conn:
            conn.close()
        return (reversals / total_applied) * 100.0
    except Exception:
        return 0.0


def get_auto_apply_confidence_threshold() -> float:
    """Ratchets confidence threshold from 0.90 to 0.95 if FERR > 2.0%."""
    ferr = calculate_ferr()
    if ferr > FERR_TRIGGER_PERCENT:
        return FERR_RATCHET_THRESHOLD
    return FERR_BASE_THRESHOLD


def detect_adversarial_injection(comment: str) -> bool:
    """Detects prompt injection attempts inside student comments using regex patterns."""
    if not comment:
        return False
    comment_lower = comment.lower()
    return any(re.search(p, comment_lower, re.I) for p in INJECTION_PATTERNS)


def validate_and_enforce_guardrails(result: ReportResult) -> Tuple[ReportResult, List[str]]:
    """
    Validates a ReportResult against the closed taxonomy and enforces safety policies.
    Returns the corrected/sanitized ReportResult and a list of audit warnings if any.
    """
    warnings = []

    # 1. Enforce closed verdict taxonomy
    if result.verdict not in VALID_VERDICTS:
        warnings.append(f"Invalid verdict '{result.verdict}' changed to 'not_actionable'")
        result.verdict = "not_actionable"

    # 2. Verdict != defect implies no repair, no edit, and no_change
    if result.verdict != "defect":
        if result.repair is not None:
            warnings.append(f"Repair '{result.repair}' cleared because verdict is '{result.verdict}'")
            result.repair = None
        if result.edit is not None:
            warnings.append(f"Edit cleared because verdict is '{result.verdict}'")
            result.edit = None
        result.route = "no_change"
        return result, warnings

    # 3. For defect, repair MUST be valid
    if result.repair not in VALID_REPAIRS:
        warnings.append(f"Invalid repair '{result.repair}' for defect; routing to faculty_review")
        result.repair = None
        result.route = "faculty_review"
        return result, warnings

    repair_spec = REPAIR_SPECS[result.repair]
    allowed_fields = repair_spec.get("fields", [])
    can_auto = repair_spec.get("auto", False)

    # 4. Strict check on auto: false
    if not can_auto:
        if result.route == "auto_apply":
            warnings.append(
                f"Repair '{result.repair}' has auto:false. Downgrading route from auto_apply to faculty_review."
            )
            result.route = "faculty_review"

    # 5. Field scope enforcement on edit
    if result.edit is not None:
        target_field = result.edit.get("field")
        if target_field not in allowed_fields:
            warnings.append(
                f"Field scope violation: repair '{result.repair}' cannot touch '{target_field}' (allowed: {allowed_fields}). "
                f"Clearing edit and escalating to faculty_review."
            )
            result.edit = None
            result.route = "faculty_review"

    # 6. Dynamic FERR Ratchet Confidence thresholding for auto_apply
    if result.route == "auto_apply":
        min_threshold = get_auto_apply_confidence_threshold()
        if result.confidence < min_threshold:
            warnings.append(
                f"Confidence {result.confidence} < {min_threshold} threshold (FERR ratchet active: {min_threshold > 0.90}). Routing to faculty_review."
            )
            result.route = "faculty_review"
        elif result.edit is None:
            warnings.append("auto_apply requires a concrete surgical edit. Routing to faculty_review.")
            result.route = "faculty_review"

    return result, warnings

