"""Data models and type definitions for the Acadza Report-Fix Triage Engine."""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List


@dataclass
class EditProposal:
    field: str
    find: str
    replace: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "find": self.find,
            "replace": self.replace
        }


@dataclass
class ReportResult:
    reportId: str
    questionId: str
    verdict: str
    repair: Optional[str]
    edit: Optional[Dict[str, Any]]
    route: str
    confidence: float
    evidence: str
    student_reply: str

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "reportId": self.reportId,
            "questionId": self.questionId,
            "verdict": self.verdict,
            "repair": self.repair,
            "edit": self.edit,
            "route": self.route,
            "confidence": round(self.confidence, 2),
            "evidence": self.evidence,
            "student_reply": self.student_reply
        }
        return d

