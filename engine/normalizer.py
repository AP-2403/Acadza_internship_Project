"""Text, HTML, and MathML normalization utilities."""

import re
from typing import Dict, Any, List, Optional


def strip_html_and_mathml(raw_html: str) -> str:
    """Strips HTML and converts basic MathML to human-readable text."""
    if not raw_html:
        return ""
    
    # Replace common MathML patterns with clean text equivalents
    text = raw_html
    text = re.sub(r'<mfrac>\s*<mi>([^<]+)</mi>\s*<mi>([^<]+)</mi>\s*</mfrac>', r'\1/\2', text)
    text = re.sub(r'<mfrac>\s*<mn>([^<]+)</mn>\s*<mn>([^<]+)</mn>\s*</mfrac>', r'\1/\2', text)
    text = re.sub(r'<msup>\s*<mi>([^<]+)</mi>\s*<mn>([^<]+)</mn>\s*</msup>', r'\1^\2', text)
    text = re.sub(r'<msub>\s*<mi>([^<]+)</mi>\s*<mi>([^<]+)</mi>\s*</msub>', r'\1_\2', text)
    text = re.sub(r'<msub>\s*<mi>([^<]+)</mi>\s*<mn>([^<]+)</mn>\s*</msub>', r'\1_\2', text)
    
    # Remove all remaining HTML/MathML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Decode common HTML entities
    text = text.replace('&nbsp;', ' ').replace('&times;', '×').replace('&minus;', '−')
    text = text.replace('&alpha;', 'α').replace('&beta;', 'β').replace('&pi;', 'π')
    text = text.replace('&mu;', 'μ').replace('&phi;', 'ϕ').replace('&tau;', 'τ')
    text = text.replace('&epsilon;', 'ε').replace('&omega;', 'ω').replace('&rho;', 'ρ')
    text = text.replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&')
    
    # Collapse extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_question_content(question_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts the active payload dictionary according to questionType."""
    qtype = question_obj.get("questionType", "scq")
    content = question_obj.get(qtype, {})
    return {
        "questionType": qtype,
        "subject": question_obj.get("subject"),
        "chapter": question_obj.get("chapter"),
        "question_html": content.get("question", ""),
        "solution_html": content.get("solution", ""),
        "answer": content.get("answer"),
        "images": content.get("quesImages", []),
        "solution_images": content.get("solutionImages", [])
    }

