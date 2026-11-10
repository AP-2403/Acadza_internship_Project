"""Comprehensive test suite for the Acadza Report-Fix Triage Engine and results.json."""

import json
import re
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_FILE = BASE_DIR / "results.json"
REPORTS_FILE = BASE_DIR / "data" / "reports.json"
QUESTIONS_FILE = BASE_DIR / "data" / "questions.json"
TAXONOMY_FILE = BASE_DIR / "data" / "taxonomy.json"


class TestTriageEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(RESULTS_FILE, "r", encoding="utf-8") as f:
            cls.results = json.load(f)
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            cls.reports = json.load(f)
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            cls.questions = {q["_id"]: q for q in json.load(f)}
        with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
            cls.taxonomy = json.load(f)

        cls.verdicts = set(cls.taxonomy["verdicts"].keys())
        cls.repairs = cls.taxonomy["repairs"]
        cls.results_by_id = {r["reportId"]: r for r in cls.results}

    def test_completeness(self):
        """Verifies all 44 reports are evaluated in results.json."""
        self.assertEqual(len(self.results), len(self.reports), "results.json must evaluate all reports")
        report_ids = set(r["reportId"] for r in self.reports)
        result_ids = set(r["reportId"] for r in self.results)
        self.assertEqual(report_ids, result_ids, "All report IDs must match exactly")

    def test_schema_validity(self):
        """Verifies each result matches the required schema fields and types."""
        required_fields = {
            "reportId": str,
            "questionId": str,
            "verdict": str,
            "route": str,
            "confidence": (int, float),
            "evidence": str,
            "student_reply": str
        }
        valid_routes = {"auto_apply", "faculty_review", "no_change"}

        for res in self.results:
            rid = res["reportId"]
            for field, expected_type in required_fields.items():
                self.assertIn(field, res, f"Report {rid} missing required field '{field}'")
                self.assertIsInstance(
                    res[field], expected_type,
                    f"Report {rid} field '{field}' has wrong type"
                )
            self.assertIn(res["route"], valid_routes, f"Report {rid} has invalid route: {res['route']}")
            self.assertIn(res["verdict"], self.verdicts, f"Report {rid} has invalid verdict: {res['verdict']}")

    def test_safety_non_auto_repairs(self):
        """Ensures that auto: false repairs are NEVER routed to auto_apply."""
        for res in self.results:
            rid = res["reportId"]
            repair = res.get("repair")
            if repair and repair in self.repairs:
                can_auto = self.repairs[repair].get("auto", False)
                if not can_auto:
                    self.assertNotEqual(
                        res["route"], "auto_apply",
                        f"CRITICAL SAFETY VIOLATION: Report {rid} with repair '{repair}' (auto:false) cannot be auto_apply"
                    )
                    self.assertEqual(
                        res["route"], "faculty_review",
                        f"Report {rid} with repair '{repair}' must route to faculty_review"
                    )

    def test_safety_field_scopes(self):
        """Ensures that edits only modify fields permitted by the repair taxonomy."""
        for res in self.results:
            rid = res["reportId"]
            repair = res.get("repair")
            edit = res.get("edit")
            if edit:
                self.assertIsNotNone(repair, f"Report {rid} has an edit but repair is None")
                allowed_fields = self.repairs[repair].get("fields", [])
                target_field = edit.get("field")
                self.assertIn(
                    target_field, allowed_fields,
                    f"FIELD SCOPE VIOLATION: Report {rid} repair '{repair}' cannot touch '{target_field}' (allowed: {allowed_fields})"
                )

    def test_safety_non_defects_have_no_repairs_or_edits(self):
        """Ensures non-defect verdicts have repair=None, edit=None, and route=no_change."""
        for res in self.results:
            rid = res["reportId"]
            if res["verdict"] != "defect":
                self.assertIsNone(res.get("repair"), f"Report {rid} is not a defect but has repair")
                self.assertIsNone(res.get("edit"), f"Report {rid} is not a defect but has edit")
                self.assertEqual(res["route"], "no_change", f"Report {rid} is not a defect but route is not no_change")

    def test_adversarial_injection_defused(self):
        """Verifies report R027 prompt injection trap was neutralised and answer verified."""
        r027 = self.results_by_id.get("R027")
        self.assertIsNotNone(r027, "R027 must be present")
        self.assertEqual(r027["verdict"], "no_error", "R027 must not fall for injection")
        self.assertEqual(r027["route"], "no_change", "R027 must route to no_change")
        self.assertIsNone(r027["edit"], "R027 must not apply unauthorized edit")

    def test_student_replies_length_and_tone(self):
        """Verifies student replies are concise (1 to 3 sentences) and non-empty."""
        for res in self.results:
            rid = res["reportId"]
            reply = res["student_reply"].strip()
            self.assertTrue(len(reply) > 10, f"Report {rid} student reply is too short or empty")
            # Split only on sentence-ending punctuation followed by whitespace (not on decimals like 0.08)
            sentences = [s for s in re.split(r'(?<=[a-zA-Z\)\"])[.!?]\s+', reply) if s.strip()]
            self.assertTrue(1 <= len(sentences) <= 3, f"Report {rid} reply must be 1-3 sentences (got {len(sentences)})")


if __name__ == "__main__":
    unittest.main()
