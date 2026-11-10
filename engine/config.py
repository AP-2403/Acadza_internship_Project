"""Configuration settings and paths for Acadza Report-Fix Triage Engine."""

from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

QUESTIONS_FILE = DATA_DIR / "questions.json"
REPORTS_FILE = DATA_DIR / "reports.json"
TAXONOMY_FILE = DATA_DIR / "taxonomy.json"
RESULTS_FILE = BASE_DIR / "results.json"

with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
    TAXONOMY = json.load(f)

VERDICTS = TAXONOMY["verdicts"]
REPAIRS = TAXONOMY["repairs"]

