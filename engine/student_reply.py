"""Empathetic, clear, and pedagogically sound student response generator."""

from typing import Dict, Any, Optional


def generate_student_reply(
    verdict: str,
    repair: Optional[str],
    student_comment: str,
    subject: str,
    chapter: str,
    evidence: str,
    custom_explanation: Optional[str] = None
) -> str:
    """
    Generates a 1-3 sentence response for a 17-year-old JEE/NEET student.
    Maintains warmth, empathy, respect, and clear pedagogical guidance.
    """
    if custom_explanation:
        return custom_explanation

    if verdict == "defect":
        if repair == "answer_key":
            return (
                f"You're right—the answer key was incorrect. Our faculty verified the solution, "
                f"and the key has been updated. Thank you for catching this and helping your fellow students!"
            )
        elif repair in ["spelling", "noise", "markup_leak"]:
            return (
                f"Thank you for flagging this formatting error! We have cleaned up the question text "
                f"to ensure full clarity. Great attention to detail."
            )
        elif repair in ["stem_data", "option_repair", "answer_form"]:
            return (
                f"Good eye! You caught a missing detail in the question. We have updated it to prevent "
                f"any confusion. Thanks for letting us know."
            )
        elif repair in ["syllabus", "wrong_chapter", "identical_options", "diagram"]:
            return (
                f"Thank you for bringing this to our attention. Our subject faculty in {subject} is reviewing "
                f"this question to update it appropriately."
            )
        else:
            return (
                f"Thank you for your report! Our team verified the issue and corrected the question. "
                f"Keep up the great preparation!"
            )

    elif verdict == "no_error":
        return (
            f"Thank you for flagging this. We re-checked the calculation carefully: {evidence}. "
            f"The stored answer is correct. Don't worry—this is a tricky concept, keep practicing!"
        )

    elif verdict == "app_issue":
        return (
            "Thanks for reporting this technical glitch. We've logged it with our app engineering team to ensure "
            "your test interface remains smooth and responsive."
        )

    elif verdict == "display_issue":
        return (
            "Thank you for letting us know about the display lag/layout issue. We are optimizing our rendering engine "
            "so questions load cleanly on all devices."
        )

    elif verdict == "language_mode":
        return (
            "Thank you for your request. We are currently working on Hindi language translations for our question bank "
            "and will release them soon."
        )

    elif verdict == "already_fixed":
        return (
            "Thank you for checking! This issue was previously reported and has already been corrected in the latest version."
        )

    else:  # not_actionable
        return (
            "We received your report, but could not determine the specific issue from your comment. "
            "If you spot an error, feel free to report it with more details so we can investigate."
        )

