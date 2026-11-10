"""Taxonomy enforcement, field-scope validation, and deterministic safety guardrails."""

import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from .models import ReportResult

TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "data" / "taxonomy.json"

with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
    TAXONOMY = json.load(f)

VALID_VERDICTS = set(TAXONOMY["verdicts"].keys())
VALID_REPAIRS = set(TAXONOMY["repairs"].keys())
REPAIR_SPECS = TAXONOMY["repairs"]

INJECTION_PATTERNS = [
    "ignore all previous instructions",
    "you are the admin bot",
    "mark this report as corrected",
    "system prompt",
    "jailbreak",
    "as an ai model",
    "forget previous commands",
]


def detect_adversarial_injection(comment: str) -> bool:
    """Detects prompt injection attempts inside student comments."""
    comment_lower = comment.lower()
    return any(p in comment_lower for p in INJECTION_PATTERNS)


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

    # 6. Confidence thresholding for auto_apply
    if result.route == "auto_apply":
        if result.confidence < 0.90:
            warnings.append(
                f"Confidence {result.confidence} < 0.90 threshold for auto_apply. Routing to faculty_review."
            )
            result.route = "faculty_review"
        elif result.edit is None:
            warnings.append("auto_apply requires a concrete surgical edit. Routing to faculty_review.")
            result.route = "faculty_review"

    return result, warnings

