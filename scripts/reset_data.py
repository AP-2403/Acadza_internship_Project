#!/usr/bin/env python3
"""
Data Reset Script for Acadza.
Restores pristine baseline question bank data, re-initializes SQLite database,
and resets triage reports to their clean unapproved baseline.
"""
import os
import sys
import json
import shutil
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
BACKEND_DIR = BASE_DIR / "backend"
CONSOLE_DATA_DIR = BASE_DIR / "console" / "src" / "data"

def reset():
    print("=" * 60)
    print("ACADZA DATA RESET UTILITY")
    print("=" * 60)

    # 1. Reset SQLite databases
    db_paths = [BACKEND_DIR / "acadza.db", Path("/tmp/acadza.db")]
    for db_path in db_paths:
        if db_path.exists():
            try:
                os.remove(db_path)
                print(f"[✓] Removed stale database: {db_path}")
            except Exception as e:
                print(f"[!] Warning removing {db_path}: {e}")

    # 2. Re-initialize database via backend.database
    sys.path.insert(0, str(BASE_DIR))
    from backend.database import init_db
    init_db()
    print("[✓] Initialized fresh SQLite database with seeded reports and users.")

    # 3. Synchronize questions.json between data/ and console/src/data/
    src_questions = DATA_DIR / "questions.json"
    dst_questions = CONSOLE_DATA_DIR / "questions.json"
    if src_questions.exists() and CONSOLE_DATA_DIR.exists():
        shutil.copy2(src_questions, dst_questions)
        print("[✓] Synchronized questions.json to console/src/data/questions.json")

    print("=" * 60)
    print("Reset complete: System is in pristine baseline state.")
    print("=" * 60)

if __name__ == "__main__":
    reset()

